const crypto = require("crypto");
const db = require("../../../../config/db");

/*
|--------------------------------------------------------------------------
| ERROR HELPER
|--------------------------------------------------------------------------
*/

function apiError(
  statusCode,
  code,
  message,
) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;

  return error;
}

function verifyWebhookHash(data) {
  const formatAmount = (amount) => {
    const num = Number(amount);

    if (!Number.isFinite(num)) {
      return "";
    }

    if (Number.isInteger(num)) {
      return num.toFixed(1);
    }

    return num.toString();
  };

  const raw = [
    process.env.EASEBUZZ_KEY,
    data.beneficiary_account_number || "",
    data.beneficiary_account_ifsc || "",
    data.beneficiary_upi_handle || "",
    data.unique_request_number || "",
    formatAmount(data.amount),
    data.unique_transaction_reference || "",
    data.status || "",
    process.env.EASEBUZZ_SALT,
  ].join("|");

  const expectedHash = crypto
    .createHash("sha512")
    .update(raw)
    .digest("hex");

  const receivedHash = String(
    data.Authorization || "",
  ).trim();

  if (
    !receivedHash ||
    expectedHash.length !== receivedHash.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedHash, "utf8"),
    Buffer.from(receivedHash, "utf8"),
  );
}

/*
|--------------------------------------------------------------------------
| PAYOUT STATUS
|--------------------------------------------------------------------------
*/

const SUCCESS_STATUSES = [
  "success",
  "completed",
  "processed",
];

const FAILURE_STATUSES = [
  "failure",
  "failed",
  "rejected",
  "reversed",
];

/*
|--------------------------------------------------------------------------
| DATE NORMALIZER
|--------------------------------------------------------------------------
*/

function normalizeTransferDate(value) {
  if (!value) {
    return null;
  }

  const text = String(value).trim();

  /*
   * Example:
   * 2026-09-07T12:30:00
   * becomes:
   * 2026-09-07
   */
  const match =
    text.match(
      /^(\d{4}-\d{2}-\d{2})/,
    );

  if (match) {
    return match[1];
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date
    .toISOString()
    .slice(0, 10);
}

/*
|--------------------------------------------------------------------------
| PROCESS EASEBUZZ PAYOUT WEBHOOK
|--------------------------------------------------------------------------
*/

async function processPayoutWebhook(
  body = {},
) {
  const {
    event,
    data,
  } = body;

  /*
  |--------------------------------------------------------------------------
  | 1. VALIDATE BODY
  |--------------------------------------------------------------------------
  */

  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    throw apiError(
      400,
      "INVALID_WEBHOOK_DATA",
      "Webhook data is required",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | 2. UNIQUE REQUEST NUMBER
  |--------------------------------------------------------------------------
  */

  const uniqueRequestNumber =
    String(
      data.unique_request_number ||
      "",
    ).trim();

  if (!uniqueRequestNumber) {
    throw apiError(
      400,
      "UNIQUE_REQUEST_NUMBER_REQUIRED",
      "unique_request_number is required",
    );
  }

  /*
|--------------------------------------------------------------------------
| VERIFY EASEBUZZ WEBHOOK HASH
|--------------------------------------------------------------------------
*/

if (!verifyWebhookHash(data)) {
  throw apiError(
    401,
    "INVALID_WEBHOOK_HASH",
    "Invalid Easebuzz payout webhook hash",
  );
}

  /*
  |--------------------------------------------------------------------------
  | 4. NORMALIZE STATUS
  |--------------------------------------------------------------------------
  */

  const providerStatus =
    String(
      data.status || "",
    )
      .trim()
      .toLowerCase();

  if (!providerStatus) {
    throw apiError(
      400,
      "PAYOUT_STATUS_REQUIRED",
      "Payout status is required",
    );
  }

  const isSuccess =
    SUCCESS_STATUSES.includes(
      providerStatus,
    );

  const isFailure =
    FAILURE_STATUSES.includes(
      providerStatus,
    );

  /*
  |--------------------------------------------------------------------------
  | 5. START DB TRANSACTION
  |--------------------------------------------------------------------------
  */

  const connection =
    await db.getConnection();

  try {
    await connection.beginTransaction();

    /*
    |--------------------------------------------------------------------------
    | 6. FIND PAYOUT
    |--------------------------------------------------------------------------
    */

    const [rows] =
      await connection.query(
        `
          SELECT
            id,
            partner_application_id,
            lan,
            unique_request_number,
            amount,
            status,
            payout_status,
            utr,
            transfer_date
          FROM quick_transfers
          WHERE unique_request_number = ?
          LIMIT 1
          FOR UPDATE
        `,
        [uniqueRequestNumber],
      );

    const transfer =
      rows[0] || null;

    if (!transfer) {
      throw apiError(
        404,
        "PAYOUT_NOT_FOUND",
        "Payout transfer not found",
      );
    }

    /*
    |--------------------------------------------------------------------------
    | 7. EXISTING DATA
    |--------------------------------------------------------------------------
    */

    const existingProviderStatus =
      String(
        transfer.payout_status ||
        "",
      )
        .trim()
        .toLowerCase();

    const utr =
      data.unique_transaction_reference ||
      transfer.utr ||
      null;

    const transferDate =
      normalizeTransferDate(
        data.transfer_date ||
        transfer.transfer_date,
      );

      /*
|--------------------------------------------------------------------------
| NEVER DOWNGRADE A SUCCESSFUL PAYOUT
|--------------------------------------------------------------------------
*/

if (
  SUCCESS_STATUSES.includes(existingProviderStatus) &&
  !isSuccess
) {
  await connection.commit();

  return {
    received: true,
    ignored: true,
    reason: "PAYOUT_ALREADY_SUCCESSFUL",

    partnerApplicationId:
      transfer.partner_application_id,

    lan:
      transfer.lan,

    uniqueRequestNumber,

    status:
      "SUCCESS",

    providerStatus:
      existingProviderStatus,

    utr,

    transferDate,
  };
}

    /*
    |--------------------------------------------------------------------------
    | 8. DUPLICATE SUCCESS WEBHOOK
    |--------------------------------------------------------------------------
    */

    if (
      isSuccess &&
      SUCCESS_STATUSES.includes(
        existingProviderStatus,
      )
    ) {
      await connection.commit();

      return {
        received: true,

        duplicate: true,

        partnerApplicationId:
          transfer.partner_application_id,

        lan:
          transfer.lan,

        uniqueRequestNumber,

        status:
          "SUCCESS",

        providerStatus:
          existingProviderStatus,

        utr,

        transferDate,
      };
    }

    /*
    |--------------------------------------------------------------------------
    | 9. SUCCESS MUST HAVE UTR + TRANSFER DATE
    |--------------------------------------------------------------------------
    */

    if (
      isSuccess &&
      (
        !utr ||
        !transferDate
      )
    ) {
      throw apiError(
        422,
        "PAYOUT_SUCCESS_DATA_INCOMPLETE",
        "Successful payout is missing UTR or transfer_date",
      );
    }

    /*
    |--------------------------------------------------------------------------
    | 10. INTERNAL STATUS
    |--------------------------------------------------------------------------
    */

    let internalStatus =
      "INITIATED";

    if (isSuccess) {
      internalStatus =
        "SUCCESS";
    }

    if (isFailure) {
      internalStatus =
        "FAILED";
    }

    /*
    |--------------------------------------------------------------------------
    | 11. UPDATE QUICK TRANSFER
    |--------------------------------------------------------------------------
    */

    await connection.query(
      `
        UPDATE quick_transfers
        SET
          status = ?,
          payout_status = ?,
          failure_reason = ?,
          utr = ?,
          queue_on_low_balance = ?,
          transfer_date = ?,
          raw_webhook_response = ?,
          updated_at = NOW()
        WHERE unique_request_number = ?
      `,
      [
        internalStatus,

        providerStatus,

        isFailure
          ? (
              data.failure_reason ||
              data.message ||
              "PAYOUT_FAILED"
            )
          : null,

        utr,

        data.queue_on_low_balance ??
        0,

        transferDate,

        JSON.stringify(body),

        uniqueRequestNumber,
      ],
    );

    /*
|--------------------------------------------------------------------------
| 12. UPDATE APPLICATION DISBURSAL STATUS
|--------------------------------------------------------------------------
*/

if (isSuccess) {

  await connection.query(
    `
      UPDATE pl_partner_applications
      SET
        status = 'DISBURSED',
        updated_at = NOW()
      WHERE partner_application_id = ?
    `,
    [
      transfer.partner_application_id,
    ],
  );

} else if (isFailure) {

  await connection.query(
    `
      UPDATE pl_partner_applications
      SET
        status = 'DISBURSE_FAILED',
        updated_at = NOW()
      WHERE partner_application_id = ?
    `,
    [
      transfer.partner_application_id,
    ],
  );
}

    /*
    |--------------------------------------------------------------------------
    | 13. COMMIT
    |--------------------------------------------------------------------------
    */

    await connection.commit();

    /*
    |--------------------------------------------------------------------------
    | 14. RESPONSE
    |--------------------------------------------------------------------------
    */

    return {
      received: true,

      duplicate: false,

      event:
        event || null,

      partnerApplicationId:
        transfer.partner_application_id,

      lan:
        transfer.lan,

      uniqueRequestNumber,

      status:
        internalStatus,

      providerStatus,

      utr,

      transferDate,
    };

  } catch (error) {

    await connection.rollback();

    throw error;

  } finally {

    connection.release();
  }
}

module.exports = {
  processPayoutWebhook,
};