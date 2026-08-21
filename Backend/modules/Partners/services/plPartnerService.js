const crypto = require("crypto");
const db = require("../../../config/db");
const { runPlPartnerBre } = require("./PartnerBre");
/*
|--------------------------------------------------------------------------
| COMMON QUERY
|--------------------------------------------------------------------------
*/
function query(sql, values = []) {
  return db.promise().query(sql, values);
}

async function queryDB(sql, params = []) {
  const [rows] =
    await db.promise().query(
      sql,
      params
    );

  return rows;
}

/*
|--------------------------------------------------------------------------
| ERROR HELPER
|--------------------------------------------------------------------------
*/
function apiError(statusCode, code, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;

  return error;
}

function requireObject(input, name = "body") {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw apiError(
      400,
      "VALIDATION_ERROR",
      `${name} must be an object`
    );
  }

  return input;
}

function requiredString(
  value,
  field,
  maxLength = 255
) {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    throw apiError(
      400,
      "VALIDATION_ERROR",
      `${field} is required`
    );
  }

  const text = String(value).trim();

  if (text.length > maxLength) {
    throw apiError(
      400,
      "VALIDATION_ERROR",
      `${field} must not exceed ${maxLength} characters`
    );
  }

  return text;
}

function optionalString(
  value,
  field,
  maxLength = 255
) {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const text = String(value).trim();

  if (text.length > maxLength) {
    throw apiError(
      400,
      "VALIDATION_ERROR",
      `${field} must not exceed ${maxLength} characters`
    );
  }

  return text;
}

function requireDate(value, field) {
  const text =
    requiredString(
      value,
      field,
      10
    );

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(text)
  ) {
    throw apiError(
      400,
      "VALIDATION_ERROR",
      `${field} must be YYYY-MM-DD`
    );
  }

  const [year, month, day] =
    text.split("-").map(Number);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw apiError(
      400,
      "VALIDATION_ERROR",
      `${field} is not a valid date`
    );
  }

  return text;
}

function assertApplicationIdentity(
  application,
  payload
) {
  if (!application) {
    throw apiError(
      404,
      "APPLICATION_NOT_FOUND",
      "Application not found"
    );
  }

  const dbLan =
    String(application.lan || "")
      .trim()
      .toUpperCase();

  const requestLan =
    String(payload.lan || "")
      .trim()
      .toUpperCase();

  if (dbLan !== requestLan) {
    throw apiError(
      409,
      "APPLICATION_IDENTITY_MISMATCH",
      "lan does not match the application"
    );
  }

  const dbReference =
    String(
      application.external_application_reference ||
      ""
    ).trim();

  const requestReference =
    String(
      payload.externalApplicationReference ||
      ""
    ).trim();

  if (
    dbReference !== requestReference
  ) {
    throw apiError(
      409,
      "APPLICATION_IDENTITY_MISMATCH",
      "externalApplicationReference does not match the application"
    );
  }
}

/*
|--------------------------------------------------------------------------
| REQUEST HASH
|--------------------------------------------------------------------------
*/
function makeHash(data) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(data || {}))
    .digest("hex");
}


/*
|--------------------------------------------------------------------------
| INTERNAL CLIENT ID
|--------------------------------------------------------------------------
|
| client_id is only for your internal DB.
| PLP does NOT send X-Client-Id.
|
*/
function getClientId() {
  return Number(
    process.env.PARTNER_INTERNAL_CLIENT_ID || 1,
  );
}


/*
|--------------------------------------------------------------------------
| GET APPLICATION
|--------------------------------------------------------------------------
*/
async function getApplication(partnerApplicationId) {
  const [rows] = await query(
    `SELECT *
     FROM pl_partner_applications
     WHERE partner_application_id = ?
     LIMIT 1`,
    [partnerApplicationId],
  );

  return rows[0] || null;
}


/*
|--------------------------------------------------------------------------
| 1. CREATE APPLICATION
|--------------------------------------------------------------------------
*/
async function createApplication(body) {
  const partnerApplicationId =
    crypto.randomUUID();

  const partnerApplicationNumber =
    `FT-${Date.now()}`;

  const customer =
    body.customer || {};

  const panVerification =
    body.panVerification || {};


  await query(
    `INSERT INTO pl_partner_applications
    (
      client_id,

      partner_application_id,
      partner_application_number,

      external_application_reference,
      lan,
      source_system,
      product_code,

      requested_amount,
      requested_tenure,
      tenure_type,
      interest_rate,
      processing_fee,

      create_request_hash,

      customer_full_name,
      customer_first_name,
      customer_middle_name,
      customer_last_name,
      customer_father_name,

      pan_number,
      date_of_birth,
      gender,
      mobile_number,
      email,

      pan_verified,
      pan_provider_reference,
      pan_verified_at,

      status
    )
    VALUES
    (
      ?,
      ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      'CREATED'
    )`,
    [
      getClientId(),

      partnerApplicationId,
      partnerApplicationNumber,

      body.externalApplicationReference,
      body.lan,
      body.sourceSystem,
      body.productCode,

      body.requestedAmount ?? null,
      body.requestedTenure ?? null,
      body.tenureType ?? null,
      body.interestRate ?? null,

      // API contract field = processingFeePercent
      body.processingFeePercent ?? null,

      makeHash(body),

      customer.fullName,
      customer.firstName,
      customer.middleName ?? null,
      customer.lastName,
      customer.fatherName,

      customer.panNumber,
      customer.dateOfBirth,
      customer.gender ?? null,
      customer.mobileNumber ?? null,
      customer.email ?? null,

      panVerification.verified ? 1 : 0,
      panVerification.providerReference ?? null,
      panVerification.verifiedAt ?? null,
    ],
  );


  return {
    externalApplicationReference:
      body.externalApplicationReference,

    lan: body.lan,

    status: "CREATED",

    partnerApplicationId,

    partnerApplicationNumber,

    createdAt:
      new Date().toISOString(),
  };
}


/*
|--------------------------------------------------------------------------
| 2. SAVE CONSENT
|--------------------------------------------------------------------------
|
| Uses:
| pl_partner_application_consents
|
*/
async function saveConsent(
  partnerApplicationId,
  body,
) {
  const app =
    await getApplication(partnerApplicationId);

  if (!app) {
    return null;
  }


  const consentReference =
    `FIN-CONSENT-${crypto.randomUUID()}`;


  await query(
    `INSERT INTO pl_partner_application_consents
    (
      client_id,
      application_id,

      consent_id,
      consent_reference,
      source_consent_reference,

      consent_type,
      consent_template_id,
      consent_version,
      consent_text_hash,

      accepted_at,
      ip_address,
      user_agent_hash,

      recorded_at,
      created_at
    )
    VALUES
    (
      ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      NOW(3),
      NOW(3)
    )`,
    [
      app.client_id || getClientId(),
      app.id,

      body.consentId,
      consentReference,
      body.consentReference ?? null,

      body.consentType,
      body.consentTemplateId,
      body.consentVersion,
      body.consentTextHash,

      body.acceptedAt,
      body.ipAddress ?? null,
      body.userAgentHash ?? null,
    ],
  );


  await query(
    `UPDATE pl_partner_applications
     SET
       status =
         CASE
           WHEN status = 'CREATED'
           THEN 'CONSENT_RECORDED'
           ELSE status
         END,

       updated_at = NOW(3)

     WHERE id = ?`,
    [app.id],
  );


  const [rows] = await query(
    `SELECT recorded_at
     FROM pl_partner_application_consents
     WHERE application_id = ?
       AND consent_reference = ?
     LIMIT 1`,
    [
      app.id,
      consentReference,
    ],
  );


  return {
    status: "RECORDED",

    consentReference,

    recordedAt:
      rows[0]?.recorded_at
        ? new Date(
          rows[0].recorded_at,
        ).toISOString()
        : new Date().toISOString(),
  };
}


/*
|--------------------------------------------------------------------------
| PROFILE HELPERS
|--------------------------------------------------------------------------
*/

function getValue(object, path) {
  return path
    .split(".")
    .reduce(
      (value, key) =>
        value?.[key],
      object,
    );
}

function keepExisting(
  incoming,
  existing,
) {
  // Field not sent → keep previous value
  if (incoming === undefined) {
    return existing ?? null;
  }

  // Explicit null → clear field
  if (incoming === null) {
    return null;
  }

  // Empty string → clear field
  if (
    typeof incoming === "string" &&
    incoming.trim() === ""
  ) {
    return null;
  }

  // New value → update field
  return incoming;
}
/*
|--------------------------------------------------------------------------
| PROFILE FIELD MAPPING
|--------------------------------------------------------------------------
|
| First value = pl_partner_applications column
| Second value = API payload path
|
*/
const PROFILE_FIELDS = [

  /*
  | Customer
  */
  [
    "customer_full_name",
    "customer.fullName",
  ],

  [
    "customer_first_name",
    "customer.firstName",
  ],

  [
    "customer_middle_name",
    "customer.middleName",
  ],

  [
    "customer_last_name",
    "customer.lastName",
  ],

  [
    "customer_father_name",
    "customer.fatherName",
  ],

  [
    "pan_number",
    "customer.panNumber",
  ],

  [
    "date_of_birth",
    "customer.dateOfBirth",
  ],

  [
    "gender",
    "customer.gender",
  ],

  [
    "mobile_number",
    "customer.mobileNumber",
  ],

  [
    "email",
    "customer.email",
  ],


  /*
  | Employment
  */
  [
    "employment_employment_type",
    "employment.employmentType",
  ],

  [
    "employment_company_type",
    "employment.companyType",
  ],

  [
    "employment_company_name",
    "employment.companyName",
  ],

  [
    "employment_designation",
    "employment.designation",
  ],

  [
    "employment_business_name",
    "employment.businessName",
  ],

  [
    "employment_business_constitution",
    "employment.businessConstitution",
  ],

  [
    "employment_monthly_income",
    "employment.monthlyIncome",
  ],

  [
    "employment_annual_turnover",
    "employment.annualTurnover",
  ],

  [
    "employment_employment_vintage",
    "employment.employmentVintage",
  ],

  [
    "employment_business_vintage",
    "employment.businessVintage",
  ],

  [
    "employment_salary_mode",
    "employment.salaryMode",
  ],

  [
    "employment_completed_at",
    "employment.completedAt",
  ],


  /*
  | Aadhaar KYC
  */
  [
    "aadhaar_status",
    "aadhaarKyc.status",
  ],

  [
    "aadhaar_masked",
    "aadhaarKyc.maskedAadhaar",
  ],

  [
    "aadhaar_verified_name",
    "aadhaarKyc.verifiedName",
  ],

  [
    "aadhaar_date_of_birth",
    "aadhaarKyc.dateOfBirth",
  ],

  [
    "aadhaar_gender",
    "aadhaarKyc.gender",
  ],

  [
    "aadhaar_provider",
    "aadhaarKyc.provider",
  ],

  [
    "aadhaar_provider_reference",
    "aadhaarKyc.providerReference",
  ],

  [
    "aadhaar_verified_at",
    "aadhaarKyc.verifiedAt",
  ],


  /*
  | Permanent Address
  */
  [
    "perm_address_line1",
    "permanentAddress.addressLine1",
  ],

  [
    "perm_address_line2",
    "permanentAddress.addressLine2",
  ],

  [
    "perm_landmark",
    "permanentAddress.landmark",
  ],

  [
    "perm_locality",
    "permanentAddress.locality",
  ],

  [
    "perm_district",
    "permanentAddress.district",
  ],

  [
    "perm_city",
    "permanentAddress.city",
  ],

  [
    "perm_state",
    "permanentAddress.state",
  ],

  [
    "perm_country",
    "permanentAddress.country",
  ],

  [
    "perm_pincode",
    "permanentAddress.pincode",
  ],

  [
    "perm_source",
    "permanentAddress.source",
  ],


  /*
  | Current Address
  */
  [
    "curr_same_as_perm",
    "currentAddress.sameAsPermanent",
  ],

  [
    "curr_address_line1",
    "currentAddress.addressLine1",
  ],

  [
    "curr_address_line2",
    "currentAddress.addressLine2",
  ],

  [
    "curr_landmark",
    "currentAddress.landmark",
  ],

  [
    "curr_locality",
    "currentAddress.locality",
  ],

  [
    "curr_district",
    "currentAddress.district",
  ],

  [
    "curr_city",
    "currentAddress.city",
  ],

  [
    "curr_state",
    "currentAddress.state",
  ],

  [
    "curr_country",
    "currentAddress.country",
  ],

  [
    "curr_pincode",
    "currentAddress.pincode",
  ],

  [
    "curr_source",
    "currentAddress.source",
  ],


  /*
  | Current Address Evidence
  */
  [
    "evidence_live_photo_document_reference",
    "currentAddressEvidence.livePhotoDocumentReference",
  ],

  [
    "liveness_provider",
    "currentAddressEvidence.livenessProvider",
  ],

  [
    "liveness_reference",
    "currentAddressEvidence.livenessReference",
  ],

  [
    "liveness_status",
    "currentAddressEvidence.livenessStatus",
  ],

  [
    "liveness_score",
    "currentAddressEvidence.livenessScore",
  ],

  [
    "evidence_reference",
    "currentAddressEvidence.evidenceReference",
  ],

  [
    "evidence_latitude",
    "currentAddressEvidence.latitude",
  ],

  [
    "evidence_longitude",
    "currentAddressEvidence.longitude",
  ],

  [
    "evidence_captured_at",
    "currentAddressEvidence.capturedAt",
  ],

  [
    "evidence_verified_at",
    "currentAddressEvidence.verifiedAt",
  ],


  /*
  | Selected Offer
  */
  [
    "selected_offer_amount",
    "selectedOffer.amount",
  ],

  [
    "selected_offer_tenure",
    "selectedOffer.tenure",
  ],

  [
    "selected_offer_selected_at",
    "selectedOffer.selectedAt",
  ],


  /*
  | Bank Details
  */
  [
    "bank_account_holder_name",
    "bankDetails.accountHolderName",
  ],

  [
    "bank_account_number",
    "bankDetails.accountNumber",
  ],

  [
    "bank_ifsc_code",
    "bankDetails.ifscCode",
  ],

  [
    "bank_name",
    "bankDetails.bankName",
  ],

  [
    "bank_account_type",
    "bankDetails.accountType",
  ],

  [
    "bank_verified_at",
    "bankDetails.verifiedAt",
  ],


  /*
  | Mandate
  */
  [
    "mandate_umrn",
    "mandate.umrn",
  ],

  [
    "mandate_provider",
    "mandate.provider",
  ],

  [
    "mandate_type",
    "mandate.mandateType",
  ],

  [
    "mandate_authorized_at",
    "mandate.authorizedAt",
  ],
];


function buildMergedProfile(app, body) {
  const merged = {};

  for (
    const [column, path]
    of PROFILE_FIELDS
  ) {
    merged[column] =
      keepExisting(
        getValue(body, path),
        app[column],
      );
  }

  return merged;
}


/*
|--------------------------------------------------------------------------
| 3. UPDATE PROFILE
|--------------------------------------------------------------------------
|
| Main table:
| pl_partner_applications
|
| History:
| pl_partner_application_detail_versions
|
*/
async function updateProfile(
  partnerApplicationId,
  body,
) {
  const connection =
    await db.promise().getConnection();

  try {

    await connection.beginTransaction();


    const [appRows] =
      await connection.query(
        `SELECT *
         FROM pl_partner_applications
         WHERE partner_application_id = ?
         LIMIT 1
         FOR UPDATE`,
        [partnerApplicationId],
      );


    const app =
      appRows[0];

    if (!app) {
      await connection.rollback();
      return null;
    }


    const detailsVersion =
      Number(body.detailsVersion);

    const requestHash =
      makeHash(body);


    /*
    |--------------------------------------------------------------------------
    | CHECK EXISTING VERSION
    |--------------------------------------------------------------------------
    */
    const [existingVersions] =
      await connection.query(
        `SELECT
           request_hash,
           accepted_at
         FROM pl_partner_application_detail_versions
         WHERE application_id = ?
           AND details_version = ?
         LIMIT 1`,
        [
          app.id,
          detailsVersion,
        ],
      );


    if (existingVersions.length) {

      const existing =
        existingVersions[0];

      if (
        existing.request_hash !==
        requestHash
      ) {
        throw apiError(
          409,
          "DETAILS_VERSION_CONFLICT",
          "This detailsVersion already exists with different data",
        );
      }


      await connection.commit();


      return {
        detailsVersion,

        status:
          "DETAILS_ACCEPTED",

        updatedAt:
          new Date(
            existing.accepted_at,
          ).toISOString(),
      };
    }


    /*
    |--------------------------------------------------------------------------
    | V1 -> V2 -> V3 -> V4
    |--------------------------------------------------------------------------
    */

    const currentVersion =
      Number(
        app.latest_details_version || 0,
      );

    const expectedVersion =
      currentVersion + 1;


    if (
      detailsVersion !==
      expectedVersion
    ) {
      throw apiError(
        409,
        "INVALID_DETAILS_VERSION",
        `Expected detailsVersion ${expectedVersion} but received ${detailsVersion}`,
      );
    }


    /*
    |--------------------------------------------------------------------------
    | MERGE INCOMING + EXISTING DATA
    |--------------------------------------------------------------------------
    */

    const merged =
      buildMergedProfile(
        app,
        body,
      );



    /*
    |--------------------------------------------------------------------------
    | DETAIL VERSION SNAPSHOT
    |--------------------------------------------------------------------------
    |
    | Detail table customer fields have customer_ prefix
    |
    */

    const detailSnapshot = {
      ...merged,

      customer_pan_number:
        merged.pan_number,

      customer_date_of_birth:
        merged.date_of_birth,

      customer_gender:
        merged.gender,

      customer_mobile_number:
        merged.mobile_number,

      customer_email:
        merged.email,
    };


    delete detailSnapshot.pan_number;
    delete detailSnapshot.date_of_birth;
    delete detailSnapshot.gender;
    delete detailSnapshot.mobile_number;
    delete detailSnapshot.email;


    const detailColumns =
      Object.keys(detailSnapshot);

    const detailValues =
      Object.values(detailSnapshot);


    await connection.query(
      `INSERT INTO pl_partner_application_detail_versions
      (
        application_id,
        details_version,
        request_hash,

        ${detailColumns
        .map(
          (column) =>
            `\`${column}\``,
        )
        .join(", ")},

        details_json,
        accepted_at,
        created_at
      )
      VALUES
      (
        ?, ?, ?,

        ${detailColumns
        .map(() => "?")
        .join(", ")},

        ?,
        NOW(3),
        NOW(3)
      )`,
      [
        app.id,
        detailsVersion,
        requestHash,

        ...detailValues,

        JSON.stringify(body),
      ],
    );


    /*
    |--------------------------------------------------------------------------
    | UPDATE MAIN APPLICATION
    |--------------------------------------------------------------------------
    */

    const mainColumns =
      Object.keys(merged);

    const mainValues =
      Object.values(merged);


    await connection.query(
      `UPDATE pl_partner_applications
       SET

         ${mainColumns
        .map(
          (column) =>
            `\`${column}\` = ?`,
        )
        .join(", ")},

         latest_details_version = ?,

         details_updated_at = NOW(3),

         status =
           CASE
             WHEN status IN (
               'DOCUMENTS_PARTIALLY_RECEIVED',
               'DOCUMENTS_RECEIVED'
             )
             THEN status
             ELSE 'DETAILS_ACCEPTED'
           END,

         updated_at = NOW(3)

       WHERE id = ?`,
      [
        ...mainValues,
        detailsVersion,
        app.id,
      ],
    );


    await connection.commit();


    return {
      detailsVersion,

      status:
        "DETAILS_ACCEPTED",

      updatedAt:
        new Date().toISOString(),
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
| 4. SAVE DOCUMENT
|--------------------------------------------------------------------------
|
| I am keeping your existing document table logic.
|
*/
async function saveDocument(
  partnerApplicationId,
  body,
) {
  const app =
    await getApplication(
      partnerApplicationId,
    );

  if (!app) {
    return null;
  }


  const partnerDocumentId =
    crypto.randomUUID();


  await query(
    `INSERT INTO pl_partner_documents
    (
      partner_document_id,
      partner_application_id,

      document_type,
      source_document_id,

      file_name,
      mime_type,
      file_size,
      file_sha256,
      content_base64,

      source,
      captured_at
    )
    VALUES
    (
      ?, ?,
      ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?
    )`,
    [
      partnerDocumentId,
      partnerApplicationId,

      body.documentType,
      body.sourceDocumentId ?? null,

      body.fileName,
      body.mimeType ?? null,
      body.fileSize ?? null,
      body.fileSha256,
      body.contentBase64,

      body.source ?? null,
      body.capturedAt ?? null,
    ],
  );


  /*
  | Optional status update
  */
  await query(
    `UPDATE pl_partner_applications
     SET
       status =
         CASE
           WHEN status = 'DOCUMENTS_RECEIVED'
           THEN status
           ELSE 'DOCUMENTS_PARTIALLY_RECEIVED'
         END,

       updated_at = NOW(3)

     WHERE id = ?`,
    [app.id],
  );


  return {
    documentType:
      body.documentType,

    fileSha256:
      body.fileSha256,

    status:
      "RECEIVED",

    partnerDocumentId,

    receivedAt:
      new Date().toISOString(),
  };
}


/*
|--------------------------------------------------------------------------
| BRE RESPONSE HELPER
|--------------------------------------------------------------------------
*/
function buildBreResponse(
  result,
  version,
  app,
) {
  const decision =
    String(
      result?.decision || "",
    ).toUpperCase();


  if (decision === "REJECTED") {
    return {
      status: "rejected",
    };
  }


  if (decision !== "APPROVED") {
    return {
      status: "pending",
    };
  }


  /*
  |--------------------------------------------------------------------------
  | V1
  |--------------------------------------------------------------------------
  | Pre approval credit limit
  */

  let approvedAmount =
    Number(
      result.creditLimit || 0,
    );


  /*
  |--------------------------------------------------------------------------
  | V2
  |--------------------------------------------------------------------------
  | Final selected approved amount
  */

  if (version === 2) {
    approvedAmount =
      Number(
        result.grossApprovedLoanAmount ||
        app.selected_offer_amount ||
        result.creditLimit ||
        0,
      );
  }


  const isNewCustomer =
    result.newCustomer !== false;


  return {
    status: "approved",

    CREDIT_LIMIT_CHECK_RPM: {
      derived_values: {

        LIMIT_ASSIGNMENT_IS_NEW_CUSTOMER_RPM:
          isNewCustomer
            ? approvedAmount
            : 0,

        LIMIT_ASSIGNMENT_IS_REPEAT_CUSTOMER_RPM:
          isNewCustomer
            ? 0
            : approvedAmount,
      },
    },
  };
}


/*
|--------------------------------------------------------------------------
| 5. REQUEST DECISION
|--------------------------------------------------------------------------
|
| V1 = PRE_APPROVAL
| V2 = FINAL_APPROVAL
|
| runPlPartnerBre already stores:
|
| bre_policy_version
| bre_decision_stage
| bre_status
| bre_reason
| bre_credit_limit
| bre_approved_loan_amount
| bre_gross_approved_amount
| bre_checked_at
| bre_details_json
| bre_final_status
| bre_final_reason
|
*/
async function requestDecision(
  partnerApplicationId,
  body,
  version,
) {
  const app =
    await getApplication(
      partnerApplicationId,
    );

  if (!app) {
    return null;
  }


  const phase =
    version === 1
      ? "PRE_APPROVAL"
      : "FINAL_APPROVAL";


  const result =
    await runPlPartnerBre(
      app,
      {
        phase,
      },
    );


  return buildBreResponse(
    result,
    version,
    app,
  );
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
  const app =
    await getApplication(
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


  const disbursalReference =
    `DISB-${Date.now()}`;


  /*
  |--------------------------------------------------------------------------
  | CALL ACTUAL FUND TRANSFER HERE
  |--------------------------------------------------------------------------
  |
  | Example later:
  |
  | await triggerFundTransfer({
  |   lan: body.lan,
  |   amount: body.amount
  | });
  |
  | DO NOT mark DISBURSED here.
  | DISBURSED will come from webhook.
  |
  */


  return {
    status: "REQUESTED",

    disbursalReference,
  };
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
async function executeIdempotent({
  idempotencyKey,
  method,
  endpoint,
  payload,
  operation,
  successStatus = 200,
}) {

  if (!idempotencyKey) {
    throw apiError(
      400,
      "IDEMPOTENCY_KEY_REQUIRED",
      "Idempotency-Key header is required",
    );
  }


  const clientId =
    getClientId();

  const requestHash =
    makeHash(payload);


  const [rows] =
    await query(
      `SELECT *
       FROM pl_partner_idempotency_records
       WHERE client_id = ?
         AND idempotency_key = ?
       LIMIT 1`,
      [
        clientId,
        idempotencyKey,
      ],
    );


  const existing =
    rows[0];


  /*
  |--------------------------------------------------------------------------
  | EXISTING KEY
  |--------------------------------------------------------------------------
  */
  if (existing) {

    /*
    | Same key but different payload
    */
    if (
      existing.request_hash !==
      requestHash
    ) {
      throw apiError(
        409,
        "IDEMPOTENCY_CONFLICT",
        "Idempotency-Key was already used with different request data",
      );
    }


    /*
    | Already completed
    */
    if (
      existing.processing_status ===
      "COMPLETED"
    ) {
      return {
        statusCode:
          existing.response_status ||
          successStatus,

        data:
          existing.response_body
            ? JSON.parse(
              existing.response_body,
            )
            : null,
      };
    }


    /*
    | Allow failed request to retry
    */
    await query(
      `UPDATE pl_partner_idempotency_records
       SET
         processing_status = 'PROCESSING',
         response_status = NULL,
         response_body = NULL,
         updated_at = NOW(3)
       WHERE id = ?`,
      [existing.id],
    );

  } else {

    /*
    |--------------------------------------------------------------------------
    | FIRST REQUEST
    |--------------------------------------------------------------------------
    */

    await query(
      `INSERT INTO pl_partner_idempotency_records
      (
        client_id,
        idempotency_key,
        request_method,
        endpoint,
        request_hash,
        processing_status,
        created_at,
        updated_at
      )
      VALUES
      (
        ?, ?, ?, ?, ?,
        'PROCESSING',
        NOW(3),
        NOW(3)
      )`,
      [
        clientId,
        idempotencyKey,
        method,
        endpoint,
        requestHash,
      ],
    );
  }


  try {

    const data =
      await operation();


    await query(
      `UPDATE pl_partner_idempotency_records
       SET
         processing_status = 'COMPLETED',
         response_status = ?,
         response_body = ?,
         completed_at = NOW(3),
         updated_at = NOW(3)

       WHERE client_id = ?
         AND idempotency_key = ?`,
      [
        successStatus,
        JSON.stringify(data),

        clientId,
        idempotencyKey,
      ],
    );


    return {
      statusCode:
        successStatus,

      data,
    };

  } catch (error) {

    await query(
      `UPDATE pl_partner_idempotency_records
       SET
         processing_status = 'FAILED',

         response_status = ?,

         response_body = ?,

         updated_at = NOW(3)

       WHERE client_id = ?
         AND idempotency_key = ?`,
      [
        error.statusCode || 500,

        JSON.stringify({
          code:
            error.code ||
            "SERVER_ERROR",

          message:
            error.message,
        }),

        clientId,
        idempotencyKey,
      ],
    );


    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| ADD EXTRA CHARGES
|--------------------------------------------------------------------------
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
    await db.promise().getConnection();

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

const validateRepaymentPayload = (input) => {
  const body = requireObject(input, "body");

  const amount = requiredString(body.amount, "amount", 30);

  if (!/^[0-9]+(\.[0-9]{1,2})?$/.test(amount) || Number(amount) <= 0) {
    throw apiError(
      400,
      "VALIDATION_ERROR",
      "amount must be a valid positive number.",
      {
        field: "amount",
      }
    );
  }

  const paymentId = requiredString(body.paymentId, "paymentId", 100);

  return {
    externalApplicationReference:
      requiredString(
        body.externalApplicationReference,
        "externalApplicationReference",
        100
      ),

    lan: requiredString(
      body.lan,
      "lan",
      50
    ),

    amount,

    paymentDate:
      requireDate(
        body.paymentDate,
        "paymentDate"
      ),

    paymentId,

    paymentMode:
      optionalString(
        body.paymentMode,
        "paymentMode",
        50
      ) || "API",

    utr:
      optionalString(
        body.utr,
        "utr",
        100
      ) || paymentId,
  };
};

/*
|--------------------------------------------------------------------------
| Extra Charges
|--------------------------------------------------------------------------
*/

const validateExtraChargePayload = (input) => {
  const body = requireObject(input, "body");

  const amount = requiredString(body.amount, "amount", 30);

  if (!/^[0-9]+(\.[0-9]{1,2})?$/.test(amount) || Number(amount) <= 0) {
    throw apiError(
      400,
      "VALIDATION_ERROR",
      "amount must be a valid positive number.",
      {
        field: "amount",
      }
    );
  }

  return {
    externalApplicationReference:
      requiredString(
        body.externalApplicationReference,
        "externalApplicationReference",
        100
      ),

    lan: requiredString(
      body.lan,
      "lan",
      50
    ),

    chargeType:
      requiredString(
        body.chargeType,
        "chargeType",
        100
      ),

    amount,

    dueDate:
      requireDate(
        body.dueDate,
        "dueDate"
      ),

    remarks:
      optionalString(
        body.remarks,
        "remarks",
        255
      ),
  };
};

/*
|--------------------------------------------------------------------------
| WAIVER
|--------------------------------------------------------------------------
*/

const validateWaiverPayload = (input) => {
  const body = requireObject(input, "body");

  const waiverAmount = requiredString(body.waiverAmount, "waiverAmount", 30);

  if (!/^[0-9]+(\.[0-9]{1,2})?$/.test(waiverAmount) || Number(waiverAmount) <= 0) {
    throw apiError(
      400,
      "VALIDATION_ERROR",
      "waiverAmount must be a valid positive number.",
      {
        field: "waiverAmount",
      }
    );
  }

  return {
    externalApplicationReference:
      requiredString(
        body.externalApplicationReference,
        "externalApplicationReference",
        100
      ),

    lan: requiredString(
      body.lan,
      "lan",
      50
    ),

    chargeType:
      requiredString(
        body.chargeType,
        "chargeType",
        100
      ),

    waiverAmount,
  };
};

/*
|--------------------------------------------------------------------------
| DISBURSEMENT UTR
|--------------------------------------------------------------------------
*/

const validateDisbursementUtrPayload = (input) => {
  const body = requireObject(input, "body");

  return {
    externalApplicationReference:
      requiredString(
        body.externalApplicationReference,
        "externalApplicationReference",
        100
      ),

    lan:
      requiredString(
        body.lan,
        "lan",
        50
      ),

    disbursementUtr:
      requiredString(
        body.disbursementUtr,
        "disbursementUtr",
        50
      ),

    disbursementDate:
      requireDate(
        body.disbursementDate,
        "disbursementDate"
      ),
  };
};

/*
|--------------------------------------------------------------------------
| RECORD DISBURSEMENT UTR
|--------------------------------------------------------------------------
*/

async function recordDisbursementUtr(
  partnerApplicationId,
  payload
) {
  const connection =
    await db.promise().getConnection();

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
      p.requested_amount,
      p.requested_tenure,
      p.tenure_type,
      p.interest_rate,
      d.Disbursement_Date,
      DATE_FORMAT(
        DATE_ADD(
          d.Disbursement_Date,
          INTERVAL p.requested_tenure DAY
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
    Number(loan.requested_amount);

  const tenure =
    Number(loan.requested_tenure);

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
  | Amount × ROI × Days / 365
  |
  */

  const interest =
    Number(
      (
        amount *
        (roi / 100) *
        (tenure / 365)
      ).toFixed(2)
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
    await db.promise().getConnection();

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
| EXPORT
|--------------------------------------------------------------------------
*/
module.exports = {
  createApplication,
  saveConsent,
  updateProfile,
  saveDocument,
  requestDecision,
  requestDisbursal,
  executeIdempotent,
  validateRepaymentPayload,
  validateExtraChargePayload,
  validateWaiverPayload,
  recordRepayment,
  addExtraCharge,
  waiveExtraCharge,
  generatePlPartnerRps,
  validateDisbursementUtrPayload,
  recordDisbursementUtr,
};