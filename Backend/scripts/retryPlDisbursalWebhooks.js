require("dotenv").config();

const {
  retryFailedPlDisbursalWebhooks,
} = require("../modules/Partners/services/easebuzz/webhook");

retryFailedPlDisbursalWebhooks(process.env.PL_WEBHOOK_RETRY_LIMIT)
  .then((result) => {
    console.log("PL disbursal webhook retry complete", result);
    process.exit(0);
  })
  .catch((error) => {
    console.error("PL disbursal webhook retry failed", {
      message: error.message,
    });
    process.exit(1);
  });
