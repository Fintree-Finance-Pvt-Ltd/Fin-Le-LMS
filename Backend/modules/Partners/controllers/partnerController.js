const partnerService = require("../services/partnerService");

const {
  executeIdempotent,
} = require("../services/partnerIdempotencyService");

const {
  validatePartnerApplicationId,
  validateCreateApplication,
  validateConsent,
  validateProfileUpdate,
  validateRequestDecision,
  getRequestDecisionVersion,
  validateTriggerDisbursal,
  validateIdempotencyKey,
} = require("../validation/partnerValidation");

async function createApplication(req, res) {
  validateCreateApplication(req.body);

  const expectedIdempotencyKey =
    `${req.body.externalApplicationReference}:LENDER_CREATE_APPLICATION:V1`;

  validateIdempotencyKey(
    req,
    expectedIdempotencyKey,
  );

  const result =
    await executeIdempotent({
      req,

      endpoint:
        "POST /api/partner/v1/application",

      handler: () =>
        partnerService.createApplication({
          payload: req.body,
        }),
    });

  return res
    .status(result.statusCode)
    .json(result.body);
}

async function submitConsent(req, res) {
  validatePartnerApplicationId(
    req.params.partnerApplicationId,
  );

  validateConsent(req.body);

  const expectedIdempotencyKey =
    `${req.body.externalApplicationReference}:LENDER_SUBMIT_CONSENT:V1`;

  validateIdempotencyKey(
    req,
    expectedIdempotencyKey,
  );

  const result =
    await executeIdempotent({
      req,

      endpoint:
        "POST /api/partner/v1/applications/:partnerApplicationId/consent",

      handler: () =>
        partnerService.recordConsent({
          partnerApplicationId:
            req.params
              .partnerApplicationId,

          payload: req.body,
        }),
    });

  return res
    .status(result.statusCode)
    .json(result.body);
}

async function updateApplicationProfile(
  req,
  res,
) {
  validatePartnerApplicationId(
    req.params.partnerApplicationId,
  );

  validateProfileUpdate(req.body);

  const expectedIdempotencyKey =
    `${req.body.externalApplicationReference}:LENDER_UPDATE_APPLICATION:V${req.body.detailsVersion}`;

  validateIdempotencyKey(
    req,
    expectedIdempotencyKey,
  );

  const result =
    await executeIdempotent({
      req,

      endpoint:
        "PUT /api/partner/v1/applications/:partnerApplicationId/profile",

      handler: () =>
        partnerService.updateDetails({
          partnerApplicationId:
            req.params
              .partnerApplicationId,

          payload: req.body,
        }),
    });

  return res
    .status(result.statusCode)
    .json(result.body);
}

async function requestDecision(
  req,
  res,
) {
  validatePartnerApplicationId(
    req.params.partnerApplicationId,
  );

  validateRequestDecision(
    req.body,
  );

  /*
   * Same endpoint is called twice.
   *
   * V1 = pre-approval
   * V2 = final approval
   */
  const decisionVersion =
    getRequestDecisionVersion(
      req,
      req.body
        .externalApplicationReference,
    );

  const result =
    await executeIdempotent({
      req,

      endpoint:
        "POST /api/partner/v1/applications/:partnerApplicationId/approve",

      handler: () =>
        partnerService.requestDecision({
          partnerApplicationId:
            req.params
              .partnerApplicationId,

          payload: req.body,

          decisionVersion,
        }),
    });

  return res
    .status(result.statusCode)
    .json(result.body);
}

async function triggerDisbursal(
  req,
  res,
) {
  validatePartnerApplicationId(
    req.params.partnerApplicationId,
  );

  validateTriggerDisbursal(
    req.body,
  );

  const expectedIdempotencyKey =
    `${req.body.externalApplicationReference}:LENDER_REQUEST_DISBURSAL:V1`;

  validateIdempotencyKey(
    req,
    expectedIdempotencyKey,
  );

  const result =
    await executeIdempotent({
      req,

      endpoint:
        "POST /api/partner/v1/applications/:partnerApplicationId/disburse",

      handler: () =>
        partnerService.triggerDisbursal({
          partnerApplicationId:
            req.params
              .partnerApplicationId,

          payload: req.body,
        }),
    });

  return res
    .status(result.statusCode)
    .json(result.body);
}

module.exports = {
  createApplication,
  submitConsent,
  updateApplicationProfile,
  requestDecision,
  triggerDisbursal,
};