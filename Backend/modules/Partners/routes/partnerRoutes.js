const express = require("express");

const controller =
  require("../controllers/partnerController");

const {
  correlationIdMiddleware,
  verifyPartnerApiKey,
  asyncHandler,
  partnerErrorHandler,
} = require("../middleware/partnerMiddleware");

const router = express.Router();

/*
 * Applies to every Partner API.
 */
router.use(correlationIdMiddleware);
router.use(verifyPartnerApiKey);

/*
 * 1. CREATE APPLICATION
 */
router.post(
  "/application",
  asyncHandler(
    controller.createApplication,
  ),
);

/*
 * 2. CONSENT
 */
router.post(
  "/applications/:partnerApplicationId/consent",
  asyncHandler(
    controller.submitConsent,
  ),
);

/*
 * 3. PROFILE V1 / V2 / V3 / V4
 */
router.put(
  "/applications/:partnerApplicationId/profile",
  asyncHandler(
    controller.updateApplicationProfile,
  ),
);

/*
 * 4. REQUEST DECISION
 *
 * Called twice:
 *
 * V1 -> Pre-approval / Credit Limit
 * V2 -> Final Approval
 *
 * Distinguished using Idempotency-Key:
 *
 * {applicationNumber}:LENDER_REQUEST_DECISION:V1
 * {applicationNumber}:LENDER_REQUEST_DECISION:V2
 */
router.post(
  "/applications/:partnerApplicationId/approve",
  asyncHandler(
    controller.requestDecision,
  ),
);

/*
 * 5. TRIGGER DISBURSAL
 *
 * Called once after:
 * - Final approval
 * - Mandate complete
 * - E-sign complete
 * - Customer requests disbursal
 *
 * Idempotency-Key:
 *
 * {applicationNumber}:LENDER_REQUEST_DISBURSAL:V1
 */
router.post(
  "/applications/:partnerApplicationId/disburse",
  asyncHandler(
    controller.triggerDisbursal,
  ),
);

/*
 * Contract-specific error envelope.
 */
router.use(partnerErrorHandler);

module.exports = router;