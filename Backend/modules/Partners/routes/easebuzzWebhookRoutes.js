const express = require("express");
const router = express.Router();
const { processPayoutWebhook } = require("../services/easebuzz/webhook");

/*
|--------------------------------------------------------------------------
| EASEBUZZ PAYOUT WEBHOOK
|--------------------------------------------------------------------------
*/

router.post("/payout", async (req, res) => {
    try {
        // Log only what's useful for tracing — the full body carries the
        // customer's bank account number and IFSC.
        const data = req.body?.data || {};

        console.log("📩 EASEBUZZ PAYOUT WEBHOOK:", {
            event: req.body?.event,
            unique_request_number: data.unique_request_number,
            status: data.status,
            unique_transaction_reference: data.unique_transaction_reference,
            amount: data.amount,
        });

        const result =
            await processPayoutWebhook(
                req.body || {},
            );

        return res
            .status(200)
            .json({
                success: true,
                ...result,
            });

    } catch (error) {

        console.error(
            "🔥 EASEBUZZ PAYOUT WEBHOOK ERROR:",
            {
                code:
                    error.code,

                message:
                    error.message,

                stack:
                    error.stack,
            },
        );

        return res
            .status(
                error.statusCode ||
                500,
            )
            .json({
                success: false,

                code:
                    error.code ||
                    "PAYOUT_WEBHOOK_FAILED",

                message:
                    error.message ||
                    "Payout webhook processing failed",
            });
    }
},
);

module.exports = router;