const crypto = require("crypto");
const db = require("../../../../config/db");
const {
  recordPlPartnerDisbursement,
  sendPlPartnerDisbursalWebhook,
} = require("../partnerLoanService");

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

function isLaterDate(candidate, reference) {
  const candidateDate = normalizeTransferDate(candidate);
  const referenceDate = normalizeTransferDate(reference);

  return Boolean(
    candidateDate &&
    referenceDate &&
    candidateDate > referenceDate,
  );
}

function calculateFirstRepaymentDate(disbursementDate, tenureDays) {
  const normalizedDate = normalizeTransferDate(disbursementDate);
  const days = Number(tenureDays);

  if (!normalizedDate || !Number.isInteger(days) || days <= 0) {
    return null;
  }

  const date = new Date(`${normalizedDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function safeLogValue(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return String(text || "").slice(0, 4000);
}

async function deliverPlDisbursalWebhook(uniqueRequestNumber) {
  const connection = await db.getConnection();
  let delivery;

  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT id, payload, delivery_status
       FROM pl_disbursal_webhook_deliveries
       WHERE unique_request_number = ?
       LIMIT 1
       FOR UPDATE`,
      [uniqueRequestNumber],
    );
    delivery = rows[0];

    if (!delivery || delivery.delivery_status === "DELIVERED") {
      await connection.commit();
      return { delivered: delivery?.delivery_status === "DELIVERED" };
    }

    if (delivery.delivery_status === "DELIVERING") {
      await connection.commit();
      return { delivered: false, inProgress: true };
    }

    await connection.query(
      `UPDATE pl_disbursal_webhook_deliveries
       SET delivery_status = 'DELIVERING', retry_count = retry_count + 1,
           last_error = NULL
       WHERE id = ?`,
      [delivery.id],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const payload = JSON.parse(delivery.payload);

  try {
    const result = await sendPlPartnerDisbursalWebhook({
      lan: payload.lan,
      utr: payload.utr,
      disbursementDate: payload.disbursement_date,
      amount: payload.amount,
      firstRepaymentDate: payload.firstRepaymentDate,
      eventId: payload.eventId,
    });

    await db.query(
      `UPDATE pl_disbursal_webhook_deliveries
       SET delivery_status = 'DELIVERED', webhook_response = ?,
           last_error = NULL, delivered_at = NOW()
       WHERE unique_request_number = ?`,
      [safeLogValue({ status: result.statusCode, body: result.response }), uniqueRequestNumber],
    );
    console.log("[PL LOS] Disbursal webhook delivered", {
      lan: payload.lan,
      uniqueRequestNumber,
      statusCode: result.statusCode,
    });
    return { delivered: true };
  } catch (error) {
    const response = error.response
      ? { status: error.response.status, body: error.response.data }
      : { message: error.message };
    await db.query(
      `UPDATE pl_disbursal_webhook_deliveries
       SET delivery_status = 'FAILED', last_error = ?, webhook_response = ?
       WHERE unique_request_number = ?`,
      [safeLogValue(response), safeLogValue(response), uniqueRequestNumber],
    );
    console.error("[PL LOS] Disbursal webhook delivery failed", {
      lan: payload.lan,
      uniqueRequestNumber,
      error: safeLogValue(response),
    });
    return { delivered: false };
  }
}

async function queuePlDisbursalWebhook({ transfer, uniqueRequestNumber, utr, transferDate }) {
  try {
    await recordPlPartnerDisbursement({
      lan: transfer.lan,
      disbursementUtr: utr,
      disbursementDate: transferDate,
    });
  } catch (error) {
    console.error("[PL LOS] Could not prepare disbursal webhook", {
      lan: transfer.lan,
      uniqueRequestNumber,
      error: error.message,
    });
    return { delivered: false, queued: false };
  }

  const firstRepaymentDate = calculateFirstRepaymentDate(
    transferDate,
    transfer.selected_offer_tenure,
  );
  if (!isLaterDate(firstRepaymentDate, transferDate)) {
    console.error("[PL LOS] Invalid first repayment date; webhook was not sent", {
      lan: transfer.lan,
      uniqueRequestNumber,
      transferDate,
      firstRepaymentDate,
    });
    return { delivered: false, queued: false };
  }

  const payload = {
    lan: transfer.lan,
    utr,
    status: "SUCCESS",
    disbursement_date: transferDate,
    amount: String(transfer.amount),
    firstRepaymentDate,
    eventId: `evt-${uniqueRequestNumber}`,
  };

  await db.query(
    `INSERT INTO pl_disbursal_webhook_deliveries
       (unique_request_number, lan, payload, delivery_status)
     VALUES (?, ?, ?, 'PENDING')
     ON DUPLICATE KEY UPDATE updated_at = updated_at`,
    [uniqueRequestNumber, transfer.lan, JSON.stringify(payload)],
  );

  return deliverPlDisbursalWebhook(uniqueRequestNumber);
}

async function forwardConfirmedDisbursal(args) {
  try {
    return await queuePlDisbursalWebhook(args);
  } catch (error) {
    // The LMS payout transaction has already committed.  A delivery-storage
    // outage must never turn that confirmed payout into a failed callback.
    console.error("[PL LOS] Could not queue disbursal webhook", {
      lan: args.transfer.lan,
      uniqueRequestNumber: args.uniqueRequestNumber,
      error: error.message,
    });
    return { delivered: false, queued: false };
  }
}

/**
 * Cron entry point.  The database row is the idempotency boundary, so this
 * can be safely invoked by one or more schedulers.
 */
async function retryFailedPlDisbursalWebhooks(limit = 100) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);

  // Recover a worker that stopped between claiming and delivering a row.
  await db.query(
    `UPDATE pl_disbursal_webhook_deliveries
     SET delivery_status = 'FAILED', last_error = 'Delivery claim timed out'
     WHERE delivery_status = 'DELIVERING'
       AND updated_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
  );

  const [rows] = await db.query(
    `SELECT unique_request_number
     FROM pl_disbursal_webhook_deliveries
     WHERE delivery_status IN ('PENDING', 'FAILED')
     ORDER BY updated_at ASC
     LIMIT ?`,
    [safeLimit],
  );

  const results = await Promise.all(
    rows.map(({ unique_request_number: uniqueRequestNumber }) =>
      deliverPlDisbursalWebhook(uniqueRequestNumber),
    ),
  );

  return {
    attempted: rows.length,
    delivered: results.filter((result) => result.delivered).length,
  };
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
            transfer_date,
            (
              SELECT selected_offer_tenure
              FROM pl_partner_applications
              WHERE partner_application_id = quick_transfers.partner_application_id
              LIMIT 1
            ) AS selected_offer_tenure
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

    // The PL event is constructed only from these confirmed callback fields;
    // persisted values are retained solely for LMS bookkeeping/response data.
    const webhookUtr =
      String(data.unique_transaction_reference || "").trim() || null;
    const webhookTransferDate =
      normalizeTransferDate(data.transfer_date);

    const utr = webhookUtr || transfer.utr || null;
    const transferDate =
      webhookTransferDate || normalizeTransferDate(transfer.transfer_date);

    if (isSuccess && (!webhookUtr || !webhookTransferDate)) {
      throw apiError(
        422,
        "PAYOUT_SUCCESS_DATA_INCOMPLETE",
        "Successful payout is missing UTR or transfer_date",
      );
    }

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

      // A duplicate provider callback must reuse the same outbox row.  This
      // lets it safely retry a previously failed PL delivery without creating
      // a second LOS disbursal.
      const plWebhook = await forwardConfirmedDisbursal({
        transfer,
        uniqueRequestNumber,
        utr: webhookUtr,
        transferDate: webhookTransferDate,
      });

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

        losWebhookDelivered: plWebhook.delivered,
      };
    }

    /*
    |--------------------------------------------------------------------------
    | 9. SUCCESS MUST HAVE UTR + TRANSFER DATE
    |--------------------------------------------------------------------------
    */

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
    | 14. NOTIFY PERSONAL-LOAN LOS
    |--------------------------------------------------------------------------
    |
    | Easebuzz calls this LMS endpoint after the bank transfer.  A successful
    | callback is the source of truth for a disbursal, so only after its LMS
    | transaction has committed do we create the UTR/RPS records and forward
    | the event to the Personal Loan LOS.  The LOS handoff is deliberately
    | non-blocking: returning an error here would make Easebuzz retry a payout
    | callback that has already been safely processed in the LMS.
    |
    */
    const plWebhook = isSuccess
      ? await forwardConfirmedDisbursal({
          transfer,
          uniqueRequestNumber,
          utr: webhookUtr,
          transferDate: webhookTransferDate,
        })
      : { delivered: false, queued: false };

    /*
    |--------------------------------------------------------------------------
    | 15. RESPONSE
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

      losWebhookDelivered: plWebhook.delivered,
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
  retryFailedPlDisbursalWebhooks,
};
