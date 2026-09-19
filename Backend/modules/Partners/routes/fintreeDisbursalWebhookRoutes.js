const crypto = require("crypto");
const express = require("express");
const router = express.Router();

const {
  recordPlPartnerDisbursement,
  sendPlPartnerDisbursalWebhook,
} = require("../services/partnerLoanService");
const { query } = require("../utils/partnerUtils");

function isAuthorized(request) {
  const expected = String(
    process.env.PLP_DISBURSAL_WEBHOOK_SECRET || "",
  ).trim();

  if (!expected) {
    return true;
  }

  const rawAuthHeader = String(request.headers["authorization"] || "").trim();
  const bearerSecret = rawAuthHeader.replace(/^Bearer\s+/i, "").trim();

  const received = String(
    request.headers["x-pl-webhook-secret"] ||
    request.headers["x-lender-webhook-secret"] ||
    request.headers["x-disbursal-webhook-secret"] ||
    request.headers["x-webhook-secret"] ||
    request.headers["x-api-key"] ||
    bearerSecret ||
    "",
  ).trim();

  return Boolean(
    expected &&
    received &&
    expected.length === received.length &&
    crypto.timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(received, "utf8")),
  );
}

function normalizeDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  const yyyymmdd = text.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (yyyymmdd) {
    const year = yyyymmdd[1];
    const month = yyyymmdd[2].padStart(2, "0");
    const day = yyyymmdd[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const ddmmyyyy = text.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, "0");
    const month = ddmmyyyy[2].padStart(2, "0");
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

/*
 * This endpoint receives the forwarded disbursal event from Fintree LMS.
 * It does not accept the raw Easebuzz callback; Fintree validates that
 * callback before forwarding this small, LMS-to-LMS payload.
 */
router.post("/lenders/FFPL2026/disbursal", async (req, res) => {
  try {
    if (!isAuthorized(req)) {
      return res.status(401).json({
        success: false,
        code: "INVALID_WEBHOOK_SECRET",
      });
    }

    const lan = String(req.body?.lan || req.body?.LAN || req.body?.loan_account_number || "").trim().toUpperCase();
    const utr = String(req.body?.utr || req.body?.DisbursalUTR || req.body?.disbursement_utr || req.body?.unique_transaction_reference || "").trim();
    const disbursementDate = normalizeDate(req.body?.disbursement_date || req.body?.DisbursalDate || req.body?.disbursementDate || req.body?.transfer_date);
    const amount = Number(req.body?.amount ?? req.body?.DisbursedAmount ?? req.body?.disbursal_amount ?? req.body?.transfer_amount);
    const status = String(req.body?.status || req.body?.Status || req.body?.payout_status || "").trim().toUpperCase();

    if (!lan.startsWith("FTPL")) {
      return res.status(422).json({
        success: false,
        code: "INVALID_LAN",
        message: "Only FTPL loan-account numbers are accepted",
      });
    }

    const isSuccessStatus = status === "SUCCESS" || status === "COMPLETED" || status === "PROCESSED";

    if (
      !isSuccessStatus ||
      !utr ||
      !disbursementDate ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return res.status(422).json({
        success: false,
        code: "INVALID_DISBURSAL_PAYLOAD",
      });
    }

    const [applications] = await query(
      `SELECT id FROM pl_partner_applications WHERE lan = ? LIMIT 1`,
      [lan],
    );

    if (!applications.length) {
      return res.status(404).json({
        success: false,
        code: "APPLICATION_NOT_FOUND",
      });
    }

    // The UTR/LAN check inside this service makes repeated forwarded events
    // idempotent and builds the LMS repayment schedule when needed.
    const rps = await recordPlPartnerDisbursement({
      lan,
      disbursementUtr: utr,
      disbursementDate,
    });

    await query(
      `UPDATE pl_partner_applications
       SET status = 'DISBURSED', updated_at = NOW()
       WHERE lan = ?`,
      [lan],
    );

    console.log("[FIN-LE] Forwarded Fintree disbursal received", {
      lan,
      utr,
      amount,
      eventId: req.body?.eventId || null,
    });

    // Forward the disbursal webhook to the PL platform.
    const firstRepaymentDate = rps?.dueDate || req.body?.firstRepaymentDate || req.body?.RepaymentDate || null;
    let plWebhookDelivered = false;
    try {
      await sendPlPartnerDisbursalWebhook({
        lan,
        utr,
        disbursementDate,
        amount: String(amount),
        firstRepaymentDate,
        eventId: req.body?.eventId || null,
      });
      plWebhookDelivered = true;
      console.log("[FIN-LE] PL platform webhook forwarded successfully", { lan, utr });
    } catch (plError) {
      console.error("[FIN-LE] PL platform webhook forwarding failed", {
        lan,
        utr,
        error: plError.message,
        responseStatus: plError.response?.status || null,
        responseData: plError.response?.data || null,
      });
    }

    // Outbox logging for delivery status tracking
    const uniqueRequestNumber = req.body?.eventId || req.body?.uniqueRequestNumber || `DISB_${lan}_${Date.now()}`;
    const payload = {
      lan,
      utr,
      status: "SUCCESS",
      disbursement_date: disbursementDate,
      amount: String(amount),
      firstRepaymentDate,
      eventId: req.body?.eventId || null,
    };

    try {
      await query(
        `INSERT INTO pl_disbursal_webhook_deliveries
           (unique_request_number, lan, payload, delivery_status, webhook_response, delivered_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE updated_at = NOW()`,
        [
          uniqueRequestNumber,
          lan,
          JSON.stringify(payload),
          plWebhookDelivered ? "DELIVERED" : "FAILED",
          plWebhookDelivered
            ? JSON.stringify({ status: 200, message: "Delivered" })
            : JSON.stringify({ message: "Initial LOS delivery failed" }),
          plWebhookDelivered ? new Date() : null,
        ],
      );
    } catch (dbOutboxErr) {
      console.error("[FIN-LE] Failed to record outbox entry", dbOutboxErr.message);
    }

    return res.status(200).json({
      success: true,
      received: true,
      lan,
      firstRepaymentDate,
      plWebhookDelivered,
    });
  } catch (error) {
    console.error("[FIN-LE] Forwarded Fintree disbursal failed", {
      code: error.code,
      message: error.message,
    });

    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "DISBURSAL_WEBHOOK_FAILED",
      message: "Unable to process disbursal webhook",
    });
  }
});

module.exports = router;
