const express = require("express");
const router = express.Router();

const verifyPartnerApiKey = require("../middleware/PartnerServiceApiKey");
const service = require("../services/plPartnerService");

router.use(verifyPartnerApiKey);

function correlationId(req) {
  return req.headers["x-correlation-id"] || null;
}

function success(res, req, data, status = 200) {
  return res.status(status).json({
    success: true,
    data,
    correlationId: correlationId(req),
  });
}

function fail(res, req, status, code, message) {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
    },
    correlationId: correlationId(req),
  });
}

function handleError(res, req, error) {
  console.error(error);

  return fail(
    res,
    req,
    error.statusCode || 500,
    error.code || "SERVER_ERROR",
    error.message || "Internal server error",
  );
}


/*
|--------------------------------------------------------------------------
| COMMON IDEMPOTENCY
|--------------------------------------------------------------------------
*/
async function runIdempotent(req, res, operation, successStatus = 200) {
  try {
    const result = await service.executeIdempotent({
      idempotencyKey: req.headers["idempotency-key"],
      method: req.method,
      endpoint: `${req.baseUrl}${req.route.path}`,
      payload: req.body,
      successStatus,
      operation,
    });

    return success(
      res,
      req,
      result.data,
      result.statusCode,
    );
  } catch (error) {
    return handleError(res, req, error);
  }
}


/*
|--------------------------------------------------------------------------
| 1. CREATE APPLICATION
|--------------------------------------------------------------------------
*/
router.post("/application", async (req, res) => {
  const {
    externalApplicationReference,
    lan,
    sourceSystem,
    productCode,
    customer,
  } = req.body;

  if (
    !externalApplicationReference ||
    !lan ||
    !sourceSystem ||
    !productCode ||
    !customer?.fullName ||
    !customer?.firstName ||
    !customer?.lastName ||
    !customer?.fatherName ||
    !customer?.panNumber ||
    !customer?.dateOfBirth
  ) {
    return fail(
      res,
      req,
      400,
      "INVALID_REQUEST",
      "Required application fields are missing",
    );
  }

  const idempotencyKey =
    req.headers["idempotency-key"] || "";

  if (
    !idempotencyKey.endsWith(
      ":LENDER_CREATE_APPLICATION:V1",
    )
  ) {
    return fail(
      res,
      req,
      400,
      "INVALID_IDEMPOTENCY_KEY",
      "Invalid create application Idempotency-Key",
    );
  }

  return runIdempotent(
    req,
    res,
    () => service.createApplication(req.body),
    201,
  );
});


/*
|--------------------------------------------------------------------------
| 2. SUBMIT CONSENT
|--------------------------------------------------------------------------
*/
router.post(
  "/applications/:partnerApplicationId/consent",
  async (req, res) => {
    const idempotencyKey =
      req.headers["idempotency-key"] || "";

    if (
      !idempotencyKey.endsWith(
        ":LENDER_SUBMIT_CONSENT:V1",
      )
    ) {
      return fail(
        res,
        req,
        400,
        "INVALID_IDEMPOTENCY_KEY",
        "Invalid consent Idempotency-Key",
      );
    }

    return runIdempotent(
      req,
      res,
      async () => {
        const data = await service.saveConsent(
          req.params.partnerApplicationId,
          req.body,
        );

        if (!data) {
          const error = new Error(
            "Application not found",
          );

          error.statusCode = 404;
          error.code = "APPLICATION_NOT_FOUND";

          throw error;
        }

        return data;
      },
    );
  },
);


/*
|--------------------------------------------------------------------------
| 3. UPDATE PROFILE
|--------------------------------------------------------------------------
*/
router.put(
  "/applications/:partnerApplicationId/profile",
  async (req, res) => {
    const detailsVersion =
      Number(req.body.detailsVersion);

    if (!detailsVersion) {
      return fail(
        res,
        req,
        400,
        "INVALID_REQUEST",
        "detailsVersion is required",
      );
    }

    const idempotencyKey =
      req.headers["idempotency-key"] || "";

    if (
      !idempotencyKey.endsWith(
        `:LENDER_UPDATE_APPLICATION:V${detailsVersion}`,
      )
    ) {
      return fail(
        res,
        req,
        400,
        "INVALID_IDEMPOTENCY_KEY",
        "Idempotency-Key version does not match detailsVersion",
      );
    }

    return runIdempotent(
      req,
      res,
      async () => {
        const data = await service.updateProfile(
          req.params.partnerApplicationId,
          req.body,
        );

        if (!data) {
          const error = new Error(
            "Application not found",
          );

          error.statusCode = 404;
          error.code = "APPLICATION_NOT_FOUND";

          throw error;
        }

        return data;
      },
    );
  },
);


/*
|--------------------------------------------------------------------------
| 4. UPLOAD DOCUMENT
|--------------------------------------------------------------------------
*/
router.post(
  "/applications/:partnerApplicationId/docs",
  async (req, res) => {
    const {
      documentType,
      fileName,
      fileSha256,
      contentBase64,
    } = req.body;

    if (
      !documentType ||
      !fileName ||
      !fileSha256 ||
      !contentBase64
    ) {
      return fail(
        res,
        req,
        400,
        "INVALID_REQUEST",
        "documentType, fileName, fileSha256 and contentBase64 are required",
      );
    }

    return runIdempotent(
      req,
      res,
      async () => {
        const data = await service.saveDocument(
          req.params.partnerApplicationId,
          req.body,
        );

        if (!data) {
          const error = new Error(
            "Application not found",
          );

          error.statusCode = 404;
          error.code = "APPLICATION_NOT_FOUND";

          throw error;
        }

        return data;
      },
    );
  },
);


/*
|--------------------------------------------------------------------------
| 5. REQUEST DECISION
|--------------------------------------------------------------------------
|
| V1 = PRE APPROVAL
| V2 = FINAL APPROVAL
|--------------------------------------------------------------------------
*/
router.post(
  "/applications/:partnerApplicationId/approve",
  async (req, res) => {
    const idempotencyKey =
      req.headers["idempotency-key"] || "";

    let version;

    if (
      idempotencyKey.endsWith(
        ":LENDER_REQUEST_DECISION:V1",
      )
    ) {
      version = 1;
    } else if (
      idempotencyKey.endsWith(
        ":LENDER_REQUEST_DECISION:V2",
      )
    ) {
      version = 2;
    } else {
      return fail(
        res,
        req,
        400,
        "INVALID_IDEMPOTENCY_KEY",
        "Decision Idempotency-Key must be V1 or V2",
      );
    }

    return runIdempotent(
      req,
      res,
      async () => {
        const data = await service.requestDecision(
          req.params.partnerApplicationId,
          req.body,
          version,
        );

        if (!data) {
          const error = new Error(
            "Application not found",
          );

          error.statusCode = 404;
          error.code = "APPLICATION_NOT_FOUND";

          throw error;
        }

        return data;
      },
    );
  },
);


/*
|--------------------------------------------------------------------------
| 6. TRIGGER DISBURSAL
|--------------------------------------------------------------------------
*/
router.post(
  "/applications/:partnerApplicationId/disburse",
  async (req, res) => {
    if (!req.body.amount) {
      return fail(
        res,
        req,
        400,
        "INVALID_REQUEST",
        "amount is required",
      );
    }

    const idempotencyKey =
      req.headers["idempotency-key"] || "";

    if (
      !idempotencyKey.endsWith(
        ":LENDER_REQUEST_DISBURSAL:V1",
      )
    ) {
      return fail(
        res,
        req,
        400,
        "INVALID_IDEMPOTENCY_KEY",
        "Invalid disbursal Idempotency-Key",
      );
    }

    return runIdempotent(
      req,
      res,
      async () => {
        const data = await service.requestDisbursal(
          req.params.partnerApplicationId,
          req.body,
        );

        if (!data) {
          const error = new Error(
            "Application not found",
          );

          error.statusCode = 404;
          error.code = "APPLICATION_NOT_FOUND";

          throw error;
        }

        return data;
      },
    );
  },
);

/*
|--------------------------------------------------------------------------
| 7. RECORD REPAYMENT
|--------------------------------------------------------------------------
*/

router.post(
  "/applications/:partnerApplicationId/repayment",
  async (req, res) => {
    try {
      const payload =
        service.validateRepaymentPayload(
          req.body
        );

      const data =
        await service.recordRepayment(
          req.params.partnerApplicationId,
          payload
        );

      return success(
        res,
        req,
        data
      );

    } catch (error) {
      return handleError(
        res,
        req,
        error,
        "Repayment error"
      );
    }
  }
);

/*
|--------------------------------------------------------------------------
| 8. ADD EXTRA CHARGE
|--------------------------------------------------------------------------
*/

router.post(
  "/applications/:partnerApplicationId/extra-charge",
  async (req, res) => {
    try {
      const payload =
        service.validateExtraChargePayload(
          req.body
        );

      const data =
        await service.addExtraCharge(
          req.params.partnerApplicationId,
          payload
        );

      return success(
        res,
        req,
        data
      );

    } catch (error) {
      return handleError(
        res,
        req,
        error,
        "Extra charge error"
      );
    }
  }
);

/*
|--------------------------------------------------------------------------
| 9. WAIVE EXTRA CHARGE
|--------------------------------------------------------------------------
*/

router.post(
  "/applications/:partnerApplicationId/charge-waiver",
  async (req, res) => {
    try {
      const payload =
        service.validateWaiverPayload(
          req.body
        );

      const data =
        await service.waiveExtraCharge(
          req.params.partnerApplicationId,
          payload
        );

      return success(
        res,
        req,
        data
      );

    } catch (error) {
      return handleError(
        res,
        req,
        error,
        "Charge waiver error"
      );
    }
  }
);

/*
|--------------------------------------------------------------------------
| 10. RECORD DISBURSEMENT UTR
|--------------------------------------------------------------------------
*/

router.post(
  "/applications/:partnerApplicationId/disbursement-utr",
  async (req, res) => {
    try {
      const payload =
        service.validateDisbursementUtrPayload(
          req.body
        );

      const data =
        await service.recordDisbursementUtr(
          req.params.partnerApplicationId,
          payload
        );

      return success(
        res,
        req,
        data
      );

    } catch (error) {
      return handleError(
        res,
        req,
        error
      );
    }
  }
);
module.exports = router;