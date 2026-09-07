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
        console.log("📩 EASEBUZZ PAYOUT WEBHOOK:", JSON.stringify(req.body));

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