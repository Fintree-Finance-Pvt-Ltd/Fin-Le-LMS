const PartnerApiError = require("../errors/PartnerApiError");
const {
  hasValue,
  hasMeaningfulObjectData,
  isUuidV4,
} = require("../utils/partnerUtils");

function requireObject(value, field) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new PartnerApiError(
      400,
      "VALIDATION_ERROR",
      `${field} is required.`,
      { field },
    );
  }
}

function requireString(value, field) {
  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    throw new PartnerApiError(
      400,
      "VALIDATION_ERROR",
      `${field} is required.`,
      { field },
    );
  }
}

function requireBoolean(value, field) {
  if (typeof value !== "boolean") {
    throw new PartnerApiError(
      400,
      "VALIDATION_ERROR",
      `${field} must be boolean.`,
      { field },
    );
  }
}

function requireInteger(value, field) {
  if (!Number.isInteger(Number(value))) {
    throw new PartnerApiError(
      400,
      "VALIDATION_ERROR",
      `${field} must be an integer.`,
      { field },
    );
  }
}

function validateDateIfProvided(value, field) {
  if (!hasValue(value)) {
    return;
  }

  if (Number.isNaN(new Date(value).getTime())) {
    throw new PartnerApiError(
      400,
      "VALIDATION_ERROR",
      `${field} must be a valid date/time.`,
      { field },
    );
  }
}

function validatePartnerApplicationId(value) {
  if (!isUuidV4(value)) {
    throw new PartnerApiError(
      400,
      "INVALID_PARTNER_APPLICATION_ID",
      "partnerApplicationId must be a valid UUID v4.",
    );
  }
}

function validateCreateApplication(payload) {
  requireObject(payload, "request body");

  requireString(
    payload.externalApplicationReference,
    "externalApplicationReference",
  );

  requireString(payload.lan, "lan");

  if (!payload.lan.startsWith("FTPL")) {
    throw new PartnerApiError(
      400,
      "INVALID_LAN",
      "LAN must start with FTPL.",
    );
  }

  requireString(
    payload.sourceSystem,
    "sourceSystem",
  );

  requireString(
    payload.productCode,
    "productCode",
  );

  requireObject(payload.customer, "customer");

  requireString(
    payload.customer.fullName,
    "customer.fullName",
  );

  requireString(
    payload.customer.firstName,
    "customer.firstName",
  );

  requireString(
    payload.customer.lastName,
    "customer.lastName",
  );

  requireString(
    payload.customer.fatherName,
    "customer.fatherName",
  );

  requireString(
    payload.customer.panNumber,
    "customer.panNumber",
  );

  requireString(
    payload.customer.dateOfBirth,
    "customer.dateOfBirth",
  );

  validateDateIfProvided(
    payload.customer.dateOfBirth,
    "customer.dateOfBirth",
  );

  /*
   * Allowed NULL:
   *
   * customer.middleName
   * customer.gender
   * customer.mobileNumber
   * customer.email
   *
   * requestedAmount
   * requestedTenure
   * tenureType
   * interestRate
   * processingFeePercent
   */

  requireObject(
    payload.panVerification,
    "panVerification",
  );

  requireBoolean(
    payload.panVerification.verified,
    "panVerification.verified",
  );

  validateDateIfProvided(
    payload.panVerification.verifiedAt,
    "panVerification.verifiedAt",
  );
}

function validateConsent(payload) {
  requireObject(payload, "request body");

  requireString(
    payload.externalApplicationReference,
    "externalApplicationReference",
  );

  requireString(payload.lan, "lan");

  requireString(
    payload.consentType,
    "consentType",
  );

  if (
    payload.consentType !==
    "LENDER_DATA_SHARING"
  ) {
    throw new PartnerApiError(
      400,
      "INVALID_CONSENT_TYPE",
      "consentType must be LENDER_DATA_SHARING.",
    );
  }

  requireString(
    payload.consentId,
    "consentId",
  );

  requireString(
    payload.consentTemplateId,
    "consentTemplateId",
  );

  requireString(
    payload.consentVersion,
    "consentVersion",
  );

  requireString(
    payload.consentTextHash,
    "consentTextHash",
  );

  if (
    !/^[a-fA-F0-9]{64}$/.test(
      payload.consentTextHash,
    )
  ) {
    throw new PartnerApiError(
      400,
      "INVALID_CONSENT_HASH",
      "consentTextHash must be a SHA-256 hexadecimal value.",
    );
  }

  requireString(
    payload.acceptedAt,
    "acceptedAt",
  );

  validateDateIfProvided(
    payload.acceptedAt,
    "acceptedAt",
  );
}

function validateProfileUpdate(payload) {
  requireObject(payload, "request body");

  requireString(
    payload.externalApplicationReference,
    "externalApplicationReference",
  );

  requireString(payload.lan, "lan");

  requireInteger(
    payload.detailsVersion,
    "detailsVersion",
  );

  const version = Number(
    payload.detailsVersion,
  );

  if (version < 1) {
    throw new PartnerApiError(
      400,
      "INVALID_DETAILS_VERSION",
      "detailsVersion must be a positive integer.",
    );
  }

  /*
   * Flexible update:
   * Any supported section can arrive in any version.
   */
  const sections = [
    payload.customer,
    payload.employment,
    payload.aadhaarKyc,
    payload.permanentAddress,
    payload.currentAddress,
    payload.currentAddressEvidence,
    payload.selectedOffer,
    payload.bankDetails,
    payload.mandate,
  ];

  if (
    !sections.some(
      hasMeaningfulObjectData,
    )
  ) {
    throw new PartnerApiError(
      400,
      "UPDATE_DATA_REQUIRED",
      "At least one application detail must be supplied.",
    );
  }

  /*
   * Validate only fields that were actually supplied.
   */
  const enumChecks = [
    [
      payload.employment?.employmentType,
      ["SALARIED", "SELF_EMPLOYED"],
      "INVALID_EMPLOYMENT_TYPE",
      "employmentType must be SALARIED or SELF_EMPLOYED.",
    ],
    [
      payload.bankDetails?.accountType,
      ["SAVINGS", "CURRENT"],
      "INVALID_BANK_ACCOUNT_TYPE",
      "accountType must be SAVINGS or CURRENT.",
    ],
    [
      payload.mandate?.mandateType,
      ["ENACH", "UPI"],
      "INVALID_MANDATE_TYPE",
      "mandateType must be ENACH or UPI.",
    ],
  ];

  for (
    const [
      value,
      allowed,
      code,
      message,
    ] of enumChecks
  ) {
    if (
      hasValue(value) &&
      !allowed.includes(value)
    ) {
      throw new PartnerApiError(
        400,
        code,
        message,
      );
    }
  }
}

function validateDecisionConsent(
  value,
  field,
) {
  requireObject(value, field);

  requireString(
    value.reference,
    `${field}.reference`,
  );

  requireString(
    value.hash,
    `${field}.hash`,
  );

  if (
    !/^[a-fA-F0-9]{64}$/.test(
      value.hash.trim(),
    )
  ) {
    throw new PartnerApiError(
      400,
      "INVALID_CONSENT_HASH",
      `${field}.hash must be a SHA-256 hexadecimal value.`,
      {
        field: `${field}.hash`,
      },
    );
  }
}

function validateRequestDecision(
  payload,
) {
  requireObject(
    payload,
    "request body",
  );

  requireString(
    payload.externalApplicationReference,
    "externalApplicationReference",
  );

  requireString(
    payload.productCode,
    "productCode",
  );

  validateDecisionConsent(
    payload.bureauConsent,
    "bureauConsent",
  );

  validateDecisionConsent(
    payload.decisionConsent,
    "decisionConsent",
  );
}

function getRequestDecisionVersion(
  req,
  externalApplicationReference,
) {
  const key =
    req.get("Idempotency-Key");

  if (!key) {
    throw new PartnerApiError(
      400,
      "IDEMPOTENCY_KEY_REQUIRED",
      "Idempotency-Key header is required.",
    );
  }

  const expectedV1 =
    `${externalApplicationReference}:LENDER_REQUEST_DECISION:V1`;

  const expectedV2 =
    `${externalApplicationReference}:LENDER_REQUEST_DECISION:V2`;

  if (key === expectedV1) {
    return 1;
  }

  if (key === expectedV2) {
    return 2;
  }

  throw new PartnerApiError(
    400,
    "INVALID_IDEMPOTENCY_KEY",
    "Idempotency-Key does not match the expected Request Decision operation.",
    {
      expected: [
        expectedV1,
        expectedV2,
      ],
    },
  );
}

function validateIdempotencyKey(
  req,
  expectedKey,
) {
  const key = req.get("Idempotency-Key");

  if (!key) {
    throw new PartnerApiError(
      400,
      "IDEMPOTENCY_KEY_REQUIRED",
      "Idempotency-Key header is required.",
    );
  }

  if (key !== expectedKey) {
    throw new PartnerApiError(
      400,
      "INVALID_IDEMPOTENCY_KEY",
      "Idempotency-Key does not match the expected operation.",
      {
        expected: expectedKey,
      },
    );
  }
}

function validateTriggerDisbursal(
  payload,
) {
  requireObject(
    payload,
    "request body",
  );

  requireString(
    payload.externalApplicationReference,
    "externalApplicationReference",
  );

  requireString(
    payload.lan,
    "lan",
  );

  if (
    !payload.lan.startsWith("FTPL")
  ) {
    throw new PartnerApiError(
      400,
      "INVALID_LAN",
      "LAN must start with FTPL.",
    );
  }

  requireString(
    payload.amount,
    "amount",
  );

  const amount =
    Number(payload.amount);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new PartnerApiError(
      400,
      "INVALID_DISBURSAL_AMOUNT",
      "amount must be a valid positive amount.",
      {
        field: "amount",
      },
    );
  }

  if (
    payload.trigger_fund !== true
  ) {
    throw new PartnerApiError(
      400,
      "INVALID_TRIGGER_FUND",
      "trigger_fund must be true.",
      {
        field: "trigger_fund",
      },
    );
  }
}

module.exports = {
  validatePartnerApplicationId,
  validateCreateApplication,
  validateConsent,
  validateProfileUpdate,
  validateRequestDecision,
  getRequestDecisionVersion,
  validateTriggerDisbursal,
  validateIdempotencyKey,
};