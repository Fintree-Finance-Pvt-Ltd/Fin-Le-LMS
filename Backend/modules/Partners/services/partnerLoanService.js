const axios = require("axios");
const crypto = require("crypto");
const db = require("../../../config/db");
const { POLICY } = require("./PartnerPolicy");
const {
  query,
  apiError,
  getApplication,
  assertApplicationIdentity,
} = require("../utils/partnerUtils");

const FINAL_PAYOUT_STATUSES = [
  "success",
  "completed",
  "processed",
];

async function recordPlPartnerDisbursement({
  lan,
  disbursementUtr,
  disbursementDate,
}) {
  const connection =
    await db.getConnection();

  try {
    await connection.beginTransaction();

    /*
     * Lock the application row first so a concurrent call for the same LAN
     * (e.g. the partner's own POST /disbursement-utr landing at the same
     * moment as this auto-completion) serializes behind this transaction
     * instead of racing it to the UTR/RPS dedupe checks below.
     */
    await connection.query(
      `SELECT id
       FROM pl_partner_applications
       WHERE lan = ?
       FOR UPDATE`,
      [lan],
    );

    const [existing] =
      await connection.query(
        `SELECT id
         FROM ev_disbursement_utr
         WHERE lan = ?
            OR Disbursement_UTR = ?
         LIMIT 1`,
        [
          lan,
          disbursementUtr,
        ],
      );

    if (!existing.length) {
      await connection.query(
        `INSERT INTO ev_disbursement_utr
         (
           Disbursement_UTR,
           Disbursement_Date,
           lan,
           utr
         )
         VALUES (?, ?, ?, ?)`,
        [
          disbursementUtr,
          disbursementDate,
          lan,
          disbursementUtr,
        ],
      );
    }

    const rps =
      await generatePlPartnerRps(
        lan,
        connection,
      );

    /*
     * generatePlPartnerRps returns no dueDate when the schedule already
     * exists, but the webhook still has to tell the partner when repayment
     * is due, so read it back.
     */
    let dueDate = rps.dueDate || null;

    if (!dueDate) {
      const [rows] =
        await connection.query(
          `SELECT due_date
           FROM manual_rps_fintree_personal_loan
           WHERE lan = ?
           ORDER BY due_date ASC
           LIMIT 1`,
          [lan],
        );

      dueDate = rows[0]?.due_date
        ? new Date(rows[0].due_date)
            .toISOString()
            .split("T")[0]
        : null;
    }

    await connection.commit();

    return {
      ...rps,
      dueDate,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/*
|--------------------------------------------------------------------------
| DISBURSAL WEBHOOK (OUTBOUND)
|--------------------------------------------------------------------------
*/
async function sendPlPartnerDisbursalWebhook({
  lan,
  utr,
  disbursementDate,
  amount,
  firstRepaymentDate,
  eventId,
}) {
  const webhookUrl =
    String(
      process.env
        .PLP_DISBURSAL_WEBHOOK_URL || "",
    ).trim() ||
    (String(process.env.PLP_BASE_URL || "").trim().replace(/\/+$/, "")
      ? `${String(process.env.PLP_BASE_URL).trim().replace(/\/+$/, "")}/api/webhooks/lenders/FFPL2026/disbursal`
      : "");

  if (!webhookUrl) {
    throw new Error(
      "PLP_DISBURSAL_WEBHOOK_URL or PLP_BASE_URL is required to notify the Personal Loan platform",
    );
  }

  const webhookSecret = String(
      process.env
      .PLP_DISBURSAL_WEBHOOK_SECRET || "",
  ).trim();

  const response = await axios.post(
    webhookUrl,
    {
      lan,
      status: "SUCCESS",
      utr,
      DisbursalUTR: utr,
      disbursement_date: disbursementDate,
      DisbursalDate: disbursementDate,
      amount: String(amount),
      DisbursedAmount: Number(amount) || 0,
      firstRepaymentDate,
      RepaymentDate: firstRepaymentDate,
      eventId: eventId || null,
    },
    {
      headers: {
        "Content-Type": "application/json",

        ...(webhookSecret
          ? {
              "x-pl-webhook-secret":
                webhookSecret,
              "x-lender-webhook-secret":
                webhookSecret,
              "x-disbursal-webhook-secret":
                webhookSecret,
              "x-webhook-secret":
                webhookSecret,
            }
          : {}),
      },
      timeout: 15000,
    },
  );

  console.log(
    "[PL PARTNER] Disbursal webhook sent",
    {
      lan,
      webhookUrl,
      eventId,
    },
  );

  return {
    status: "DELIVERED",
    statusCode: response.status,
    response: response.data,
  };
}

async function triggerEasebuzzPayout({
  app,
  amount,
  uniqueRequestNumber,
}) {
  const beneficiaryName = String(
    app.bank_account_holder_name || "",
  )
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

  const accountNumber = String(
    app.bank_account_number || "",
  ).trim();

  const ifsc = String(
    app.bank_ifsc_code || "",
  )
    .trim()
    .toUpperCase();

  const isTestMode =
    process.env.ENABLE_REAL_PAYOUT !== "true";

  if (isTestMode) {
    const now = Date.now();

    return {
      testMode: true,
      response: {
        success: true,
        data: {
          transfer_request: {
            id: `TEST_${now}`,
            status: "initiated",
            transfer_date: new Date().toISOString(),
            unique_transaction_reference:
              `TESTUTR${now}`,
            queue_on_low_balance: 0,
            unique_request_number:
              uniqueRequestNumber,
          },
        },
      },
    };
  }

  const raw = [
    process.env.EASEBUZZ_KEY,
    accountNumber,
    ifsc,
    "",
    uniqueRequestNumber,
    amount,
    process.env.EASEBUZZ_SALT,
  ].join("|");

  const authorization = crypto
    .createHash("sha512")
    .update(raw)
    .digest("hex");

  const response = await axios.post(
    "https://wire.easebuzz.in/api/v1/quick_transfers/initiate/",
    {
      key: process.env.EASEBUZZ_KEY,
      beneficiary_type: "bank_account",
      beneficiary_name: beneficiaryName,
      account_number: accountNumber,
      ifsc,
      upi_handle: "",
      unique_request_number:
        uniqueRequestNumber,
      payment_mode: "IMPS",
      amount,
    },
    {
      headers: {
        Authorization: authorization,
        "WIRE-API-KEY":
          process.env.EASEBUZZ_WIRE_API_KEY,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    },
  );

  return {
    testMode: false,
    response: response.data,
  };
}

/*
|--------------------------------------------------------------------------
| 6. REQUEST DISBURSAL
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| Your pl_partner_applications table DOES NOT have:
|
| disbursal_status
| disbursal_amount
|
| therefore DO NOT update fake columns here.
|
| This API only triggers disbursal.
| Actual success comes from webhook.
|
*/
async function requestDisbursal(
  partnerApplicationId,
  body,
) {
  const app = await getApplication(
    partnerApplicationId,
  );

  if (!app) {
    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | FINAL APPROVAL CHECK
  |--------------------------------------------------------------------------
  */

  if (
    String(
      app.bre_final_status || "",
    ).toUpperCase() !== "APPROVED"
  ) {
    throw apiError(
      409,
      "FINAL_APPROVAL_REQUIRED",
      "Final approval is required before disbursal",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | AMOUNT
  |--------------------------------------------------------------------------
  */

  const amount = Number(body.amount);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw apiError(
      400,
      "INVALID_DISBURSAL_AMOUNT",
      "Invalid disbursal amount",
    );
  }

  /*
|--------------------------------------------------------------------------
| APPROVED AMOUNT CHECK
|--------------------------------------------------------------------------
*/

  const approvedAmount =
    Number(app.bre_approved_loan_amount);

  if (
    !Number.isFinite(approvedAmount) ||
    approvedAmount <= 0
  ) {
    throw apiError(
      409,
      "APPROVED_AMOUNT_MISSING",
      "Approved loan amount is not available",
    );
  }

  if (
    Math.round(amount * 100) !==
    Math.round(approvedAmount * 100)
  ) {
    throw apiError(
      409,
      "DISBURSAL_AMOUNT_MISMATCH",
      "Disbursal amount does not match approved loan amount",
    );
  }

/*
|--------------------------------------------------------------------------
| MAX PAYOUT CAP
|--------------------------------------------------------------------------
|
| Last line of defence if the BRE ever approves an amount above policy.
| Checked before any write or provider call, so a blocked payout leaves no
| transfer record behind.
|
*/

if (amount > POLICY.MAX_LOAN_AMOUNT) {
  throw apiError(
    409,
    "MAX_PAYOUT_LIMIT_EXCEEDED",
    `Disbursal amount exceeds the maximum permitted payout of ${POLICY.MAX_LOAN_AMOUNT}`,
  );
}

  /*
  |--------------------------------------------------------------------------
  | REQUIRED DATA
  |--------------------------------------------------------------------------
  */

  if (!app.lan) {
    throw apiError(
      400,
      "LAN_REQUIRED",
      "LAN is required before disbursal",
    );
  }

  if (
    !app.bank_account_holder_name ||
    !app.bank_account_number ||
    !app.bank_ifsc_code
  ) {
    throw apiError(
      400,
      "BANK_DETAILS_REQUIRED",
      "Complete bank details are required before disbursal",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | CHECK PREVIOUS PAYOUT + RESERVE, UNDER A ROW LOCK
  |--------------------------------------------------------------------------
  |
  | The "is there already a payout?" check and the quick_transfers insert
  | used to run as two separate, unlocked queries — two concurrent disbursal
  | requests for the same application (a partner retry, or two different
  | Idempotency-Keys sent by mistake) could both see "no existing transfer"
  | and both go on to call Easebuzz, disbursing the loan twice. Locking the
  | application row for the duration of the check+insert serializes
  | concurrent callers on the same application; the lock is released
  | (commit) before the Easebuzz call so it isn't held during the slow
  | external HTTP request.
  */

  const uniqueRequestNumber =
    `DISB_${app.id}_${Date.now()}`;

  const lockConnection =
    await db.getConnection();

  try {
    await lockConnection.beginTransaction();

    await lockConnection.query(
      `
        SELECT id
        FROM pl_partner_applications
        WHERE id = ?
        FOR UPDATE
      `,
      [app.id],
    );

    const [existingRows] =
      await lockConnection.query(
        `
          SELECT
            id,
            unique_request_number,
            status,
            payout_status
          FROM quick_transfers
          WHERE partner_application_id = ?
          ORDER BY id DESC
          LIMIT 1
        `,
        [app.partner_application_id],
      );

    const existingTransfer =
      existingRows[0] || null;

    if (existingTransfer) {
      const status = String(
        existingTransfer.status || "",
      ).toUpperCase();

      const payoutStatus = String(
        existingTransfer.payout_status || "",
      ).toLowerCase();

      if (
        ["INITIATED", "SUCCESS"].includes(
          status,
        ) ||
        [
          "requested",
          "initiated",
          "pending",
          "processing",
          "success",
          "completed",
          "processed",
        ].includes(payoutStatus)
      ) {
        throw apiError(
          409,
          "DISBURSAL_ALREADY_REQUESTED",
          "Disbursal already requested for this application",
        );
      }
    }

    await lockConnection.query(
      `
        INSERT INTO quick_transfers
        (
          partner_application_id,
          lan,
          unique_request_number,
          amount,
          status,
          payout_status
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        app.partner_application_id,
        app.lan,
        uniqueRequestNumber,
        amount,
        "INITIATED",
        "REQUESTED",
      ],
    );

    await lockConnection.commit();
  } catch (error) {
    await lockConnection.rollback().catch(() => {});

    throw error;
  } finally {
    lockConnection.release();
  }

  try {
    /*
    |--------------------------------------------------------------------------
    | CALL EASEBUZZ
    |--------------------------------------------------------------------------
    */

    const easebuzzResult =
      await triggerEasebuzzPayout({
        app,
        amount,
        uniqueRequestNumber,
      });

    const easebuzzResponse =
      easebuzzResult.response;

    /*
    |--------------------------------------------------------------------------
    | EASEBUZZ FAILURE
    |--------------------------------------------------------------------------
    */

    if (
      easebuzzResponse?.success === false
    ) {
      const failureReason =
        easebuzzResponse.message ||
        "EASEBUZZ_PAYOUT_FAILED";

      await query(
        `
          UPDATE quick_transfers
          SET
            status = 'FAILED',
            payout_status = 'failed',
            failure_reason = ?,
            raw_api_response = ?,
            updated_at = NOW()
          WHERE unique_request_number = ?
        `,
        [
          failureReason,
          JSON.stringify(
            easebuzzResponse,
          ),
          uniqueRequestNumber,
        ],
      );

      throw apiError(
        502,
        "EASEBUZZ_PAYOUT_FAILED",
        failureReason,
      );
    }

    /*
    |--------------------------------------------------------------------------
    | TRANSFER DATA
    |--------------------------------------------------------------------------
    */

    const transfer =
      easebuzzResponse?.data
        ?.transfer_request;

    if (!transfer) {
      await query(
        `
          UPDATE quick_transfers
          SET
            status = 'FAILED',
            payout_status = 'failed',
            failure_reason = ?,
            raw_api_response = ?,
            updated_at = NOW()
          WHERE unique_request_number = ?
        `,
        [
          "INVALID_EASEBUZZ_RESPONSE",
          JSON.stringify(
            easebuzzResponse,
          ),
          uniqueRequestNumber,
        ],
      );

      throw apiError(
        502,
        "INVALID_EASEBUZZ_RESPONSE",
        "Invalid response received from Easebuzz",
      );
    }

    const providerStatus = String(
      transfer.status || "initiated",
    ).toLowerCase();

    /*
    |--------------------------------------------------------------------------
    | STORE EASEBUZZ RESPONSE
    |--------------------------------------------------------------------------
    */

    await query(
      `
        UPDATE quick_transfers
        SET
          status = ?,
          payout_status = ?,
          easebuzz_transfer_id = ?,
          queue_on_low_balance = ?,
          transfer_date = ?,
          utr = ?,
          raw_api_response = ?,
          updated_at = NOW()
        WHERE unique_request_number = ?
      `,
      [
        providerStatus,
        providerStatus,
        transfer.id || null,
        transfer.queue_on_low_balance ?? 0,

        transfer.transfer_date
          ? String(
            transfer.transfer_date,
          ).split("T")[0]
          : null,

        transfer
          .unique_transaction_reference ||
        null,

        JSON.stringify(
          easebuzzResponse,
        ),

        uniqueRequestNumber,
      ],
    );

    const utr =
      transfer
        .unique_transaction_reference ||
      null;

    const transferDate =
      transfer.transfer_date
        ? String(
            transfer.transfer_date,
          ).split("T")[0]
        : null;

    const baseResponse = {
      status: "REQUESTED",

      disbursalReference:
        uniqueRequestNumber,

      provider: "EASEBUZZ",

      providerStatus,

      transferId:
        transfer.id || null,

      utr,

      testMode:
        easebuzzResult.testMode,
    };

    /*
    |--------------------------------------------------------------------------
    | NOT FINAL YET
    |--------------------------------------------------------------------------
    |
    | Non-terminal provider status, or the provider has not given us a UTR /
    | transfer date yet. The money may still land — completion is left to the
    | disbursal webhook, so do not record the UTR or build the RPS here.
    |
    */

    if (
      !FINAL_PAYOUT_STATUSES.includes(
        providerStatus,
      ) ||
      !utr ||
      !transferDate
    ) {
      await query(
        `
          UPDATE pl_partner_applications
          SET status = 'DISBURSE_INITIATED'
          WHERE partner_application_id = ?
        `,
        [app.partner_application_id],
      );

      return baseResponse;
    }

    /*
    |--------------------------------------------------------------------------
    | TERMINAL SUCCESS
    |--------------------------------------------------------------------------
    |
    | The money is already out. Nothing below may throw: a failure here must
    | not turn a completed payout into an error response that invites a retry.
    |
    */

    let rps = null;

    try {
      rps =
        await recordPlPartnerDisbursement({
          lan: app.lan,
          disbursementUtr: utr,
          disbursementDate: transferDate,
        });
    } catch (disbursementError) {
      console.error(
        "[PL PARTNER] Disbursement recording failed after a successful payout",
        {
          lan: app.lan,
          uniqueRequestNumber,
          utr,
          error: disbursementError.message,
        },
      );
    }

    await query(
      `
        UPDATE pl_partner_applications
        SET status = 'DISBURSED'
        WHERE partner_application_id = ?
      `,
      [app.partner_application_id],
    );

    return {
      ...baseResponse,

      status: "DISBURSED",

      disbursementDate: transferDate,

      rps,
    };
  } catch (error) {
    /*
     * If we already created an apiError above,
     * don't convert it again.
     */
    if (error.statusCode) {
      throw error;
    }

    const responseData =
      error.response?.data || null;

    const failureReason =
      responseData?.message ||
      error.message ||
      "EASEBUZZ_PAYOUT_FAILED";

    await query(
      `
        UPDATE quick_transfers
        SET
          status = 'FAILED',
          payout_status = 'failed',
          failure_reason = ?,
          raw_api_response = ?,
          updated_at = NOW()
        WHERE unique_request_number = ?
      `,
      [
        failureReason,

        JSON.stringify(
          responseData || {
            message: error.message,
          },
        ),

        uniqueRequestNumber,
      ],
    );

    throw apiError(
      502,
      "EASEBUZZ_PAYOUT_FAILED",
      failureReason,
    );
  }
}


/*
|--------------------------------------------------------------------------
| IDEMPOTENCY
|--------------------------------------------------------------------------
|
| Uses existing:
|
| pl_partner_idempotency_records
|
*/
async function addExtraCharge(
  partnerApplicationId,
  payload
) {
  const application =
    await getApplication(
      partnerApplicationId
    );

  assertApplicationIdentity(
    application,
    payload
  );

  const lan = application.lan;

  await query(
    `INSERT INTO loan_charges
     (
       lan,
       charge_date,
       due_date,
       amount,
       charge_type,
       remarks
     )
     VALUES (
       ?,
       CURDATE(),
       ?,
       ?,
       ?,
       ?
     )`,
    [
      lan,
      payload.dueDate,
      payload.amount,
      payload.chargeType,
      payload.remarks || null,
    ]
  );

  return {
    status: "CHARGE_ADDED",
  };
}

/*
|--------------------------------------------------------------------------
| ADD WAIVER
|--------------------------------------------------------------------------
*/

async function waiveExtraCharge(
  partnerApplicationId,
  payload
) {
  const connection =
    await db.getConnection();

  try {
    await connection.beginTransaction();

    const application =
      await getApplication(
        partnerApplicationId
      );

    assertApplicationIdentity(
      application,
      payload
    );

    const lan = application.lan;

    const [rows] =
      await connection.query(
        `SELECT
           id,
           amount,
           paid_amount,
           waived_amount
         FROM loan_charges
         WHERE lan = ?
           AND charge_type = ?
           AND (
             amount
             - paid_amount
             - waived_amount
           ) > 0
         ORDER BY due_date ASC, id ASC
         LIMIT 1
         FOR UPDATE`,
        [
          lan,
          payload.chargeType,
        ]
      );

    const charge = rows[0];

    if (!charge) {
      throw apiError(
        404,
        "CHARGE_NOT_FOUND",
        "Charge not found or already settled"
      );
    }

    const outstanding =
      Number(charge.amount || 0) -
      Number(charge.paid_amount || 0) -
      Number(charge.waived_amount || 0);

    const waiverAmount =
      Number(payload.waiverAmount);

    if (waiverAmount > outstanding) {
      throw apiError(
        400,
        "VALIDATION_ERROR",
        "waiverAmount exceeds the outstanding charge amount"
      );
    }

    const newWaivedAmount =
      Number(charge.waived_amount || 0) +
      waiverAmount;

    const remaining =
      outstanding - waiverAmount;

    const status =
      remaining <= 0
        ? "Waived"
        : "Partially Waived";

    await connection.query(
      `UPDATE loan_charges
       SET
         waived_amount = ?,
         paid_status = ?
       WHERE id = ?`,
      [
        newWaivedAmount,
        status,
        charge.id,
      ]
    );

    await connection.commit();

    return {
      status: "CHARGE_WAIVED",
    };

  } catch (error) {
    await connection.rollback();
    throw error;

  } finally {
    connection.release();
  }
}

/*
|--------------------------------------------------------------------------
| Repayment
|--------------------------------------------------------------------------
*/

async function recordDisbursementUtr(
  partnerApplicationId,
  payload
) {
  const connection =
    await db.getConnection();

  try {
    await connection.beginTransaction();

    /*
     * Lock the application row so a concurrent auto-completion from the
     * disbursal flow (recordPlPartnerDisbursement) for the same LAN
     * serializes behind this transaction instead of racing it.
     */
    await connection.query(
      `SELECT id
       FROM pl_partner_applications
       WHERE partner_application_id = ?
       FOR UPDATE`,
      [partnerApplicationId],
    );

    const application =
      await getApplication(
        partnerApplicationId
      );

    assertApplicationIdentity(
      application,
      payload
    );

    const lan = application.lan;

    const [existing] =
      await connection.query(
        `SELECT id
         FROM ev_disbursement_utr
         WHERE lan = ?
            OR Disbursement_UTR = ?
         LIMIT 1`,
        [
          lan,
          payload.disbursementUtr,
        ]
      );

    if (existing.length) {
      throw apiError(
        409,
        "DISBURSEMENT_ALREADY_RECORDED",
        "Disbursement UTR already exists"
      );
    }

    await connection.query(
      `INSERT INTO ev_disbursement_utr
       (
         Disbursement_UTR,
         Disbursement_Date,
         lan
       )
       VALUES (?, ?, ?)`,
      [
        payload.disbursementUtr,
        payload.disbursementDate,
        lan,
      ]
    );

    const rps =
      await generatePlPartnerRps(
        lan,
        connection
      );

    await connection.commit();

    return {
      status:
        "DISBURSEMENT_RECORDED",
      lan,
      disbursementUtr:
        payload.disbursementUtr,
      disbursementDate:
        payload.disbursementDate,
      rps,
    };

  } catch (error) {
    await connection.rollback();
    throw error;

  } finally {
    connection.release();
  }
}

/*
|--------------------------------------------------------------------------
| GENERATE BULLET RPS
|--------------------------------------------------------------------------
*/

async function generatePlPartnerRps(lan, connection) {

  /*
  |--------------------------------------------------------------------------
  | GET LOAN + DISBURSEMENT DETAILS
  |--------------------------------------------------------------------------
  */

  const [rows] = await connection.query(
    `SELECT
      p.lan,
      COALESCE(p.bre_gross_approved_amount, p.selected_offer_amount, p.requested_amount) AS bre_gross_approved_amount,
      COALESCE(p.selected_offer_tenure, p.requested_tenure) AS selected_offer_tenure,
      COALESCE(p.tenure_type, 'DAYS') AS tenure_type,
      COALESCE(p.interest_rate, 0) AS interest_rate,
      d.Disbursement_Date,
      DATE_FORMAT(
        DATE_ADD(
          d.Disbursement_Date,
          INTERVAL (COALESCE(p.selected_offer_tenure, p.requested_tenure) - 1) DAY
        ),
        '%Y-%m-%d'
      ) AS due_date
   FROM pl_partner_applications p
   INNER JOIN ev_disbursement_utr d
      ON d.lan = p.lan
   WHERE p.lan = ?
   LIMIT 1`,
    [lan]
  );

  const loan = rows[0];

  if (!loan) {
    throw apiError(
      404,
      "DISBURSEMENT_NOT_FOUND",
      "Loan or disbursement details not found"
    );
  }

  /*
  |--------------------------------------------------------------------------
  | REQUIRE FINAL-APPROVAL DATA
  |--------------------------------------------------------------------------
  |
  | The schedule bills the BRE-approved gross principal over the tenure the
  | customer actually selected — not what they originally requested, which
  | can differ (e.g. FTPL00000023: requested 30 days, selected 45).
  */

  if (
    loan.bre_gross_approved_amount === null ||
    loan.bre_gross_approved_amount === undefined ||
    Number(loan.bre_gross_approved_amount) <= 0
  ) {
    throw apiError(
      409,
      "APPROVED_AMOUNT_MISSING",
      "bre_gross_approved_amount is not set for this loan"
    );
  }

  if (
    loan.selected_offer_tenure === null ||
    loan.selected_offer_tenure === undefined ||
    Number(loan.selected_offer_tenure) <= 0
  ) {
    throw apiError(
      409,
      "SELECTED_TENURE_MISSING",
      "selected_offer_tenure is not set for this loan"
    );
  }


  /*
  |--------------------------------------------------------------------------
  | ONLY DAYS TENURE
  |--------------------------------------------------------------------------
  */

  if (
    String(loan.tenure_type || "")
      .toUpperCase() !== "DAYS"
  ) {
    throw apiError(
      400,
      "INVALID_TENURE_TYPE",
      "Only DAYS tenure is supported for bullet RPS"
    );
  }


  /*
  |--------------------------------------------------------------------------
  | DUPLICATE RPS CHECK
  |--------------------------------------------------------------------------
  */

  const [existing] = await connection.query(
    `SELECT id
     FROM manual_rps_fintree_personal_loan
     WHERE lan = ?
     LIMIT 1`,
    [lan]
  );

  if (existing.length) {
    return {
      status: "RPS_ALREADY_EXISTS",
    };
  }


  /*
  |--------------------------------------------------------------------------
  | VALUES
  |--------------------------------------------------------------------------
  */

  const amount =
    Number(loan.bre_gross_approved_amount);

  const tenure =
    Number(loan.selected_offer_tenure);

  const roi =
    Number(loan.interest_rate);

  if (
    amount <= 0 ||
    tenure <= 0 ||
    roi < 0
  ) {
    throw apiError(
      400,
      "INVALID_RPS_DATA",
      "Invalid amount, tenure or interest rate"
    );
  }


  /*
  |--------------------------------------------------------------------------
  | INTEREST
  |--------------------------------------------------------------------------
  |
  | Amount × ROI × Days / 365, always rounded UP to the next whole rupee.
  |
  */

  const interest =
    Math.ceil(
      amount *
      (roi / 100) *
      (tenure / 365)
    );

  const principal = amount;

  const emi =
    Number(
      (principal + interest)
        .toFixed(2)
    );


  /*
  |--------------------------------------------------------------------------
  | DUE DATE
  |--------------------------------------------------------------------------
  |
  | The disbursement day counts as day 1 of the tenure, so a N-day loan is
  | due N-1 days after disbursement (computed above via selected_offer_tenure - 1).
  */

  const dueDate = loan.due_date;
  /*
  |--------------------------------------------------------------------------
  | INSERT BULLET RPS
  |--------------------------------------------------------------------------
  */

  await connection.query(
    `INSERT INTO manual_rps_fintree_personal_loan
     (
       lan,
       due_date,
       status,
       emi,
       interest,
       principal,
       opening,
       closing,
       remaining_emi,
       remaining_interest,
       remaining_principal,
       payment_date,
       dpd,
       remaining_amount,
       extra_paid
     )
     VALUES
     (
       ?,
       ?,
       'Pending',
       ?,
       ?,
       ?,
       ?,
       0.00,
       ?,
       ?,
       ?,
       NULL,
       0,
       ?,
       0
     )`,
    [
      lan,
      dueDate,

      emi,
      interest,
      principal,

      amount,

      emi,
      interest,
      principal,

      emi,
    ]
  );

  return {
    status: "RPS_CREATED",
    lan,
    dueDate,
    principal,
    interest,
    totalPayable: emi,
  };
}

async function allocatePlPartner(
  lan,
  payment,
  connection
) {
  let remaining =
    Number(payment.transfer_amount);

  const paymentDate =
    payment.payment_date;

  const paymentId =
    payment.payment_id;

  if (!paymentId) {
    throw new Error(
      "payment_id is required"
    );
  }

  /*
  |--------------------------------------------------------------------------
  | 1. ALLOCATE RPS
  |--------------------------------------------------------------------------
  */

  while (remaining > 0) {
    const [emiRows] =
      await connection.query(
        `SELECT *
     FROM manual_rps_fintree_personal_loan
     WHERE lan = ?
       AND (
         remaining_interest > 0
         OR remaining_principal > 0
       )
     ORDER BY due_date ASC
     LIMIT 1
     FOR UPDATE`,
        [lan]
      );

    const emi = emiRows[0];

    if (!emi) {
      break;
    }

    let interestDue =
      Number(
        emi.remaining_interest || 0
      );

    let principalDue =
      Number(
        emi.remaining_principal || 0
      );

    /*
    | Interest first
    */

    if (
      remaining > 0 &&
      interestDue > 0
    ) {
      const amount =
        Math.min(
          remaining,
          interestDue
        );

      remaining -= amount;
      interestDue -= amount;

      await connection.query(
        `INSERT INTO allocation
         (
           lan,
           due_date,
           allocation_date,
           allocated_amount,
           charge_type,
           payment_id
         )
         VALUES (?, ?, ?, ?, 'Interest', ?)`,
        [
          lan,
          emi.due_date,
          paymentDate,
          amount,
          paymentId,
        ]
      );
    }

    /*
    | Principal second
    */

    if (
      remaining > 0 &&
      interestDue <= 0 &&
      principalDue > 0
    ) {
      const amount =
        Math.min(
          remaining,
          principalDue
        );

      remaining -= amount;
      principalDue -= amount;

      await connection.query(
        `INSERT INTO allocation
         (
           lan,
           due_date,
           allocation_date,
           allocated_amount,
           charge_type,
           payment_id
         )
         VALUES (?, ?, ?, ?, 'Principal', ?)`,
        [
          lan,
          emi.due_date,
          paymentDate,
          amount,
          paymentId,
        ]
      );
    }

    const remainingEmi =
      interestDue +
      principalDue;

    const status =
      remainingEmi <= 0
        ? "Paid"
        : "Partially Paid";

    await connection.query(
      `UPDATE manual_rps_fintree_personal_loan
       SET
         remaining_interest = ?,
         remaining_principal = ?,
         remaining_emi = ?,
         remaining_amount = ?,
         payment_date = ?,
         status = ?
       WHERE id = ?`,
      [
        interestDue,
        principalDue,
        remainingEmi,
        remainingEmi,
        paymentDate,
        status,
        emi.id,
      ]
    );

    if (remainingEmi > 0) {
      break;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | 2. ALLOCATE CHARGES
  |--------------------------------------------------------------------------
  */

  while (remaining > 0) {
    const [chargeRows] =
      await connection.query(
        `SELECT *
     FROM loan_charges
     WHERE lan = ?
       AND (
         amount
         - paid_amount
         - waived_amount
       ) > 0
     ORDER BY due_date ASC, id ASC
     LIMIT 1
     FOR UPDATE`,
        [lan]
      );

    const charge = chargeRows[0];

    if (!charge) {
      break;
    }

    const outstanding =
      Number(charge.amount || 0) -
      Number(charge.paid_amount || 0) -
      Number(charge.waived_amount || 0);

    const amount =
      Math.min(
        remaining,
        outstanding
      );

    remaining -= amount;

    const newPaidAmount =
      Number(
        charge.paid_amount || 0
      ) + amount;

    const newOutstanding =
      outstanding - amount;

    const status =
      newOutstanding <= 0
        ? "Paid"
        : "Partially Paid";

    await connection.query(
      `INSERT INTO allocation
       (
         lan,
         due_date,
         allocation_date,
         allocated_amount,
         charge_type,
         payment_id
       )
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        lan,
        charge.due_date,
        paymentDate,
        amount,
        charge.charge_type,
        paymentId,
      ]
    );

    await connection.query(
      `UPDATE loan_charges
       SET
         paid_amount = ?,
         paid_status = ?,
         payment_time = ?
       WHERE id = ?`,
      [
        newPaidAmount,
        status,
        paymentDate,
        charge.id,
      ]
    );
  }

  /*
  |--------------------------------------------------------------------------
  | 3. EXCESS
  |--------------------------------------------------------------------------
  */

  if (remaining > 0) {
    await connection.query(
      `INSERT INTO allocation
       (
         lan,
         due_date,
         allocation_date,
         allocated_amount,
         charge_type,
         payment_id,
         excess_amount
       )
       VALUES (?, ?, ?, ?, 'Excess Payment', ?, ?)`,
      [
        lan,
        paymentDate,
        paymentDate,
        remaining,
        paymentId,
        remaining,
      ]
    );
  }

  return {
    allocated: true,
  };
}

/*
|--------------------------------------------------------------------------
| REPAYMENT SERVICE
|--------------------------------------------------------------------------
*/

// async function recordRepayment(
//   partnerApplicationId,
//   payload
// ) {
//   const application =
//     await getApplication(
//       partnerApplicationId
//     );

//   assertApplicationIdentity(
//     application,
//     payload
//   );

//   const lan = application.lan;

//   /*
//   |--------------------------------------------------------------------------
//   | DUPLICATE UTR CHECK
//   |--------------------------------------------------------------------------
//   */

//   const [duplicateRows] =
//     await query(
//       `SELECT id
//        FROM repayments_upload
//        WHERE utr = ?
//        LIMIT 1`,
//       [payload.utr]
//     );

//   if (duplicateRows.length) {
//     throw apiError(
//       409,
//       "DUPLICATE_UTR",
//       "A repayment with this utr has already been recorded"
//     );
//   }

//   /*
//   |--------------------------------------------------------------------------
//   | STORE PAYMENT
//   |--------------------------------------------------------------------------
//   */

//   await query(
//     `INSERT INTO repayments_upload
//      (
//        lan,
//        bank_date,
//        utr,
//        payment_date,
//        payment_id,
//        payment_mode,
//        transfer_amount
//      )
//      VALUES (?, ?, ?, ?, ?, ?, ?)`,
//     [
//       lan,
//       payload.paymentDate,
//       payload.utr,
//       payload.paymentDate,
//       payload.paymentId,
//       payload.paymentMode,
//       payload.amount,
//     ]
//   );

//   /*
//   |--------------------------------------------------------------------------
//   | ALLOCATE PAYMENT
//   |--------------------------------------------------------------------------
//   */

//   await allocatePlPartner(
//     lan,
//     {
//       transfer_amount:
//         payload.amount,

//       payment_date:
//         payload.paymentDate,

//       payment_id:
//         payload.paymentId,
//     }
//   );

//   return {
//     status:
//       "REPAYMENT_RECORDED",
//   };
// }

async function recordRepayment(
  partnerApplicationId,
  payload
) {
  const connection =
    await db.getConnection();

  try {
    await connection.beginTransaction();

    const application =
      await getApplication(
        partnerApplicationId
      );

    assertApplicationIdentity(
      application,
      payload
    );

    const lan = application.lan;

    const [duplicate] =
      await connection.query(
        `SELECT id
         FROM repayments_upload
         WHERE utr = ?
         LIMIT 1`,
        [payload.utr]
      );

    if (duplicate.length) {
      throw apiError(
        409,
        "DUPLICATE_UTR",
        "Repayment UTR already exists"
      );
    }

    await connection.query(
      `INSERT INTO repayments_upload
       (
         lan,
         bank_date,
         utr,
         payment_date,
         payment_id,
         payment_mode,
         transfer_amount
       )
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        lan,
        payload.paymentDate,
        payload.utr,
        payload.paymentDate,
        payload.paymentId,
        payload.paymentMode,
        payload.amount,
      ]
    );

    await allocatePlPartner(
      lan,
      {
        transfer_amount:
          Number(payload.amount),
        payment_date:
          payload.paymentDate,
        payment_id:
          payload.paymentId,
      },
      connection
    );

    await connection.commit();

    return {
      status: "REPAYMENT_RECORDED",
    };

  } catch (error) {
    await connection.rollback();
    throw error;

  } finally {
    connection.release();
  }
}

/*
|--------------------------------------------------------------------------
| GET ALL PERSONAL LOANS
|--------------------------------------------------------------------------
*/


module.exports = {
  requestDisbursal,
  recordDisbursementUtr,
  generatePlPartnerRps,
  // Used by the provider-webhook consumer after a payout reaches SUCCESS.
  // Keep the LMS -> LOS notification contract in one place.
  recordPlPartnerDisbursement,
  sendPlPartnerDisbursalWebhook,
  recordRepayment,
  addExtraCharge,
  waiveExtraCharge,
};
