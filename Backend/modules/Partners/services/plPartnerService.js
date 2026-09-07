const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const db = require("../../../config/db");
const { runPlPartnerBre } = require("./PartnerBre");
const { POLICY } = require("./PartnerPolicy");

/*
 * Partner-submitted documents (POST .../docs) are decoded from base64 and
 * written here as real files, rather than stored as a base64 blob in the DB.
 */
const PARTNER_DOCUMENTS_DIR = path.join(
  __dirname,
  "../../../uploads/partner-documents",
);

if (!fs.existsSync(PARTNER_DOCUMENTS_DIR)) {
  fs.mkdirSync(PARTNER_DOCUMENTS_DIR, {
    recursive: true,
  });
}

function buildPartnerDocumentFileName(
  partnerDocumentId,
  originalFileName,
) {
  const extension = path
    .extname(String(originalFileName || ""))
    .slice(0, 10);

  const base = path
    .basename(
      String(originalFileName || ""),
      extension,
    )
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 80);

  return `${partnerDocumentId}${base ? `_${base}` : ""}${extension}`;
}

/*
 * Provider statuses that mean the money has actually left. Anything else is
 * still in flight and gets completed by the disbursal webhook instead.
 */
const FINAL_PAYOUT_STATUSES = [
  "success",
  "completed",
  "processed",
];

function normalizeProductCode(value) {
  const code = String(value || "")
    .trim()
    .toUpperCase();

  if (
    code === "FFPL10011" ||
    code === "PERSONAL_LOAN"
  ) {
    return "FFPL10011";
  }

  throw apiError(
    400,
    "INVALID_PRODUCT_CODE",
    `Unsupported productCode: ${value}`
  );
}

/*
|--------------------------------------------------------------------------
| COMMON QUERY
|--------------------------------------------------------------------------
*/
function query(sql, values = []) {
  return db.query(sql, values);
}

async function queryDB(sql, params = []) {
  const [rows] =
    await db.query(
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
      normalizeProductCode(
        body.productCode
      ),


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
  // Not sent, explicit null, or empty string → keep previous value
  if (
    incoming === undefined ||
    incoming === null ||
    (
      typeof incoming === "string" &&
      incoming.trim() === ""
    )
  ) {
    return existing ?? null;
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

    const incomingValue = getValue(body, path);

    console.log(
      "PROFILE FIELD:",
      column,
      "PATH:",
      path,
      "INCOMING:",
      incomingValue,
      "EXISTING:",
      app[column],
    );

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
    await db.getConnection();

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
    console.log("REQUEST MANDATE:", JSON.stringify(body.mandate));

    const test = {
      umrn: getValue(body, "mandate.umrn"),
      provider: getValue(body, "mandate.provider"),
      type: getValue(body, "mandate.mandateType"),
      authorizedAt: getValue(body, "mandate.authorizedAt"),
    };

    console.log("MANDATE VALUES:", test);

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


  /*
  |--------------------------------------------------------------------------
  | DECODE + VERIFY
  |--------------------------------------------------------------------------
  |
  | The partner asserts a fileSha256 for the content they sent — verify it
  | actually matches the decoded bytes rather than trusting it blindly, so a
  | corrupted/truncated transfer is rejected instead of silently stored.
  */

  let fileBuffer;

  try {
    fileBuffer = Buffer.from(
      String(body.contentBase64 || ""),
      "base64",
    );
  } catch {
    fileBuffer = null;
  }

  if (!fileBuffer || !fileBuffer.length) {
    throw apiError(
      400,
      "INVALID_DOCUMENT_CONTENT",
      "contentBase64 could not be decoded",
    );
  }

  const computedSha256 = crypto
    .createHash("sha256")
    .update(fileBuffer)
    .digest("hex");

  const claimedSha256 = String(
    body.fileSha256 || "",
  ).toLowerCase();

  if (computedSha256 !== claimedSha256) {
    throw apiError(
      400,
      "FILE_HASH_MISMATCH",
      "fileSha256 does not match the decoded file content",
    );
  }


  /*
  |--------------------------------------------------------------------------
  | WRITE TO DISK
  |--------------------------------------------------------------------------
  */

  const storedFileName =
    buildPartnerDocumentFileName(
      partnerDocumentId,
      body.fileName,
    );

  const filePath = path.join(
    PARTNER_DOCUMENTS_DIR,
    storedFileName,
  );

  await fs.promises.writeFile(
    filePath,
    fileBuffer,
  );

  const relativeFilePath =
    `/uploads/partner-documents/${storedFileName}`;


  /*
  |--------------------------------------------------------------------------
  | PERSIST METADATA
  |--------------------------------------------------------------------------
  */

  try {
    await query(
      `INSERT INTO pl_partner_documents
      (
        client_id,
        application_id,

        partner_document_id,
        partner_application_id,

        document_type,
        source_document_id,

        original_file_name,
        stored_file_name,
        file_path,

        mime_type,
        file_size,
        file_sha256,

        source,
        captured_at,

        received_at
      )
      VALUES
      (
        ?, ?,
        ?, ?,
        ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        NOW(3)
      )`,
      [
        app.client_id || getClientId(),
        app.id,

        partnerDocumentId,
        partnerApplicationId,

        body.documentType,
        body.sourceDocumentId ?? null,

        body.fileName,
        storedFileName,
        relativeFilePath,

        body.mimeType ?? null,
        fileBuffer.length,
        computedSha256,

        body.source ?? null,
        body.capturedAt ?? null,
      ],
    );
  } catch (error) {
    await fs.promises
      .unlink(filePath)
      .catch(() => {});

    throw error;
  }


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
      computedSha256,

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
| RECORD DISBURSEMENT (INTERNAL)
|--------------------------------------------------------------------------
|
| Same work as recordDisbursementUtr, but driven by our own successful
| Easebuzz payout instead of a partner-supplied UTR, so there is no payload
| identity to assert. An already-recorded disbursement is not an error here:
| the money moved either way, so it just returns what already exists.
|
*/
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
           lan
         )
         VALUES (?, ?, ?)`,
        [
          disbursementUtr,
          disbursementDate,
          lan,
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
  const baseUrl = String(
    process.env.PLP_BASE_URL || "",
  )
    .trim()
    .replace(/\/+$/, "");

  const webhookUrl =
    String(
      process.env
        .PLP_DISBURSAL_WEBHOOK_URL || "",
    ).trim() ||
    (baseUrl
      ? `${baseUrl}/api/webhooks/lenders/FFPL2026/disbursal`
      : "");

  if (!webhookUrl) {
    throw new Error(
      "PLP_DISBURSAL_WEBHOOK_URL or PLP_BASE_URL is required to notify the partner",
    );
  }

  const webhookSecret = String(
    process.env
      .PLP_DISBURSAL_WEBHOOK_SECRET || "",
  ).trim();

  await axios.post(
    webhookUrl,
    {
      lan,
      utr,
      disbursement_date: disbursementDate,
      amount: String(amount),
      firstRepaymentDate,
      status: "SUCCESS",
      eventId,
    },
    {
      headers: {
        "Content-Type": "application/json",

        ...(webhookSecret
          ? {
              "x-pl-webhook-secret":
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
  | CHECK PREVIOUS PAYOUT
  |--------------------------------------------------------------------------
  */

  const [existingRows] = await query(
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

  /*
  |--------------------------------------------------------------------------
  | UNIQUE REQUEST NUMBER
  |--------------------------------------------------------------------------
  */

  const uniqueRequestNumber =
    `DISB_${app.id}_${Date.now()}`;

  /*
  |--------------------------------------------------------------------------
  | INSERT QUICK TRANSFER
  |--------------------------------------------------------------------------
  */

  await query(
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

    try {
      await sendPlPartnerDisbursalWebhook({
        lan: app.lan,
        utr,
        disbursementDate: transferDate,
        amount,
        firstRepaymentDate:
          rps?.dueDate || null,
        eventId:
          `evt-${uniqueRequestNumber}`,
      });
    } catch (webhookError) {
      console.error(
        "[PL PARTNER] Disbursal webhook failed (non-blocking)",
        {
          lan: app.lan,
          uniqueRequestNumber,
          error: webhookError.message,
        },
      );
    }

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
      p.bre_gross_approved_amount,
      p.selected_offer_tenure,
      p.tenure_type,
      p.interest_rate,
      d.Disbursement_Date,
      DATE_FORMAT(
        DATE_ADD(
          d.Disbursement_Date,
          INTERVAL (p.selected_offer_tenure - 1) DAY
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
    loan.bre_gross_approved_amount === undefined
  ) {
    throw apiError(
      409,
      "APPROVED_AMOUNT_MISSING",
      "bre_gross_approved_amount is not set for this loan"
    );
  }

  if (
    loan.selected_offer_tenure === null ||
    loan.selected_offer_tenure === undefined
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

async function getAllPersonalLoans({
  page = 1,
  pageSize = 25,
  search = "",
  sortBy = "created_at",
  sortDir = "desc",
} = {}) {

  /*
  |--------------------------------------------------------------------------
  | PAGINATION
  |--------------------------------------------------------------------------
  */

  page = Number.parseInt(page, 10);
  pageSize = Number.parseInt(pageSize, 10);

  if (!Number.isInteger(page) || page < 1) {
    page = 1;
  }

  if (!Number.isInteger(pageSize) || pageSize < 1) {
    pageSize = 25;
  }

  pageSize = Math.min(pageSize, 100);

  const offset =
    (page - 1) * pageSize;


  /*
  |--------------------------------------------------------------------------
  | SAFE SORTING
  |--------------------------------------------------------------------------
  */

  const SORT_COLUMNS = {
    created_at: "pa.created_at",
    updated_at: "pa.updated_at",
    customer_name: "pa.customer_full_name",
    lan: "pa.lan",
    partner_loan_id: "pa.partner_application_id",
    loan_amount: "pa.requested_amount",
    disbursal_amount: "pa.bre_approved_loan_amount",
    disbursement_date: "d.Disbursement_Date",
    status: "pa.status",
    bre_status: "pa.bre_status",
  };

  const sortColumn =
    SORT_COLUMNS[sortBy] ||
    SORT_COLUMNS.created_at;

  const direction =
    String(sortDir).toLowerCase() === "asc"
      ? "ASC"
      : "DESC";


  /*
  |--------------------------------------------------------------------------
  | FILTERS
  |--------------------------------------------------------------------------
  */

  let whereSql = `
    WHERE pa.product_code = ?
  `;

  const filterParams = [
    "FFPL10011",
  ];

  const cleanSearch =
    String(search || "").trim();

  if (cleanSearch) {
    const likeSearch =
      `%${cleanSearch}%`;

    whereSql += `
      AND (
        pa.lan LIKE ?
        OR pa.partner_application_id LIKE ?
        OR pa.partner_application_number LIKE ?
        OR pa.customer_full_name LIKE ?
        OR pa.mobile_number LIKE ?
        OR pa.status LIKE ?
        OR pa.bre_status LIKE ?
      )
    `;

    filterParams.push(
      likeSearch,
      likeSearch,
      likeSearch,
      likeSearch,
      likeSearch,
      likeSearch,
      likeSearch,
    );
  }


  /*
  |--------------------------------------------------------------------------
  | TOTAL COUNT
  |--------------------------------------------------------------------------
  */

  const countSql = `
    SELECT
      COUNT(*) AS total

    FROM pl_partner_applications pa

    LEFT JOIN ev_disbursement_utr d
      ON d.lan = pa.lan

    ${whereSql}
  `;

  const countRows =
    await queryDB(
      countSql,
      filterParams
    );

  const total =
    Number(
      countRows[0]?.total || 0
    );


  /*
  |--------------------------------------------------------------------------
  | FETCH LOANS
  |--------------------------------------------------------------------------
  */

  const loansSql = `
    SELECT

      pa.id,

      pa.partner_application_id,
      pa.partner_application_number,
      pa.external_application_reference,

      pa.lan,

      pa.customer_full_name,
      pa.mobile_number,
      pa.email,

      pa.requested_amount,
      pa.bre_approved_loan_amount,

      d.Disbursement_Date
        AS disbursement_date,

      pa.requested_tenure,
      pa.tenure_type,
      pa.interest_rate,
      pa.processing_fee,

      pa.status,

      pa.employment_employment_type,
      pa.employment_company_name,
      pa.employment_monthly_income,

      pa.bre_status,
      pa.bre_reason,
      pa.bre_final_status,

      pa.created_at,
      pa.updated_at

    FROM pl_partner_applications pa

    LEFT JOIN ev_disbursement_utr d
      ON d.lan = pa.lan

    ${whereSql}

    ORDER BY ${sortColumn} ${direction}

    LIMIT ?
    OFFSET ?
  `;

  const rows =
    await queryDB(
      loansSql,
      [
        ...filterParams,
        pageSize,
        offset,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | FRONTEND RESPONSE MAPPING
  |--------------------------------------------------------------------------
  */

  const loans =
    rows.map((row) => ({
      id: row.id,

      lan:
        row.lan,

      partner_loan_id:
        row.partner_application_id,

      partner_application_number:
        row.partner_application_number,

      external_application_reference:
        row.external_application_reference,

      product:
        "Personal Loan",

      customer_name:
        row.customer_full_name,

      mobile:
        row.mobile_number,

      email:
        row.email,

      loan_amount:
        row.requested_amount,

      disbursal_amount:
        row.bre_approved_loan_amount,

      disbursement_date:
        row.disbursement_date,

      tenure:
        row.requested_tenure,

      tenure_type:
        row.tenure_type,

      interest_rate:
        row.interest_rate,

      processing_fee:
        row.processing_fee,

      status:
        row.status,

      employment_type:
        row.employment_employment_type,

      company_name:
        row.employment_company_name,

      monthly_income:
        row.employment_monthly_income,

      bre_status:
        row.bre_status,

      bre_reason:
        row.bre_reason,

      bre_approved_loan_amount:
        row.bre_approved_loan_amount,

      bre_final_status:
        row.bre_final_status,

      created_at:
        row.created_at,

      updated_at:
        row.updated_at,
    }));


  return {
    rows: loans,

    pagination: {
      page,
      pageSize,
      total,

      totalPages:
        Math.ceil(
          total / pageSize
        ),
    },
  };
}

async function getPersonalLoanByLan(lan) {

  const sql = `
    SELECT
      pa.*,
      d.Disbursement_UTR,
      d.Disbursement_Date,
      d.utr
    FROM pl_partner_applications pa
    LEFT JOIN ev_disbursement_utr d
      ON d.lan = pa.lan
    WHERE pa.lan = ?
    LIMIT 1
  `;

  const rows = await queryDB(
    sql,
    [lan]
  );

  return rows[0] || null;
}

async function getDisbursementByLan(lan) {


  const sql = `

 SELECT

 pa.lan,

 pa.partner_application_id,

 pa.customer_full_name,

 pa.requested_amount,

 pa.bre_approved_loan_amount,

 pa.interest_rate,

 pa.processing_fee,

 pa.requested_tenure,

 d.Disbursement_UTR,

 d.Disbursement_Date


 FROM pl_partner_applications pa


 LEFT JOIN ev_disbursement_utr d

 ON d.lan = pa.lan


 WHERE pa.lan = ?

 `;


  const rows =
    await queryDB(
      sql,
      [lan]
    );


  if (!rows.length) {

    throw new Error(
      "Disbursement details not found"
    );

  }


  return rows[0];

}

async function getPersonalLoanSchedule(lan) {

  const sql = `
SELECT
id,
lan,
due_date,
status,
emi,
principal,
interest,
opening,
closing,
remaining_emi,
remaining_interest,
remaining_principal,
payment_date,
dpd,
remaining_amount,
extra_paid
FROM manual_rps_fintree_personal_loan
WHERE lan = ?

ORDER BY due_date ASC
`;

  const rows =
    await queryDB(
      sql,
      [lan]
    );

  if (!rows.length) {

    throw new Error(
      "Repayment schedule not found"
    );

  }

  return rows;

}

async function getExtraChargesByLan(lan) {

  const sql = `

SELECT

id,
lan,
charge_date,
due_date,
amount,
paid_amount,
waived_off,
charge_type,
paid_status,
payment_time,
created_at,
remarks

FROM loan_charges

WHERE lan = ?

ORDER BY created_at ASC

`;


  const rows = await queryDB(
    sql,
    [lan]
  );

  return rows;

}

async function getExtraChargesByLan(lan) {

  const sql = `
SELECT
id,
emi_id,
lan,
charge_date,
due_date,
amount,
paid_amount,
waived_amount,
waived_off,
paid_status,
payment_time,
charge_type,
created_at,
remarks

FROM loan_charges

WHERE lan = ?

ORDER BY created_at ASC

`;



  const rows =
    await queryDB(
      sql,
      [lan]
    );

  return rows;

}

async function getApprovedLoans({
  page = 1,
  pageSize = 25,
  search = "",
  sortBy = "created_at",
  sortDir = "desc",
}) {

  const limit = Math.min(
    100,
    Math.max(1, Number(pageSize))
  );

  const offset =
    (Number(page) - 1) * limit;


  const allowedSort = [
    "created_at",
    "lan",
    "customer_full_name",
    "requested_amount",
    "bre_approved_loan_amount"
  ];


  const sortColumn =
    allowedSort.includes(sortBy)
      ? sortBy
      : "created_at";


  const direction =
    sortDir.toLowerCase() === "asc"
      ? "ASC"
      : "DESC";


  const searchCondition = search
    ? `
      AND (
        lan LIKE ?
        OR customer_full_name LIKE ?
        OR mobile_number LIKE ?
      )
    `
    : "";


  const searchParams = search
    ? [
      `%${search}%`,
      `%${search}%`,
      `%${search}%`
    ]
    : [];


  const dataQuery = `
    SELECT
      id,
      lan,
      customer_full_name,
      partner_application_number,
      mobile_number,
      email,
      requested_amount,
      bre_approved_loan_amount,
      bre_final_status,
      created_at

    FROM pl_partner_applications

    WHERE bre_final_status = 'APPROVED'

    ${searchCondition}

    ORDER BY ${sortColumn} ${direction}

    LIMIT ?
    OFFSET ?
  `;


  const countQuery = `
    SELECT COUNT(*) AS total

    FROM pl_partner_applications

    WHERE bre_final_status = 'APPROVED'

    ${searchCondition}
  `;



  const [rows] =
    await db.query(
      dataQuery,
      [
        ...searchParams,
        limit,
        offset
      ]
    );


  const [[countResult]] =
    await db.query(
      countQuery,
      searchParams
    );


  return {

    rows,

    pagination: {
      page: Number(page),
      pageSize: limit,
      total: Number(
        countResult.total || 0
      ),
      totalPages: Math.ceil(
        countResult.total / limit
      )
    }

  };

}

const getDisbursedLoans = async ({
  page = 1,
  pageSize = 25,
  search = "",
  sortBy = "created_at",
  sortDir = "desc",
} = {}) => {

  const pg =
    Math.max(
      1,
      parseInt(page, 10) || 1
    );


  const limit =
    Math.min(
      100,
      Math.max(
        1,
        parseInt(pageSize, 10) || 25
      )
    );


  const offset =
    (pg - 1) * limit;


  const safeSortDir =
    String(sortDir).toLowerCase() === "asc"
      ? "ASC"
      : "DESC";


  const allowedSort = [
    "created_at",
    "updated_at",
    "lan",
    "customer_full_name",
    "mobile_number",
    "external_application_reference",
    "bre_approved_loan_amount",
    "status",
  ];


  const sortColumn =
    allowedSort.includes(sortBy)
      ? sortBy
      : "created_at";


  const cleanSearch =
    String(search || "").trim();


  const searchClause =
    cleanSearch
      ? `
        AND (
          pa.lan LIKE ?
          OR pa.customer_full_name LIKE ?
          OR pa.mobile_number LIKE ?
          OR pa.external_application_reference LIKE ?
        )
      `
      : "";


  const searchParams =
    cleanSearch
      ? [
        `%${cleanSearch}%`,
        `%${cleanSearch}%`,
        `%${cleanSearch}%`,
        `%${cleanSearch}%`,
      ]
      : [];


  const countSql = `
    SELECT
      COUNT(*) AS total

    FROM pl_partner_applications pa

    WHERE pa.status = 'DISBURSED'

    ${searchClause}
  `;


  const dataSql = `
    SELECT

      pa.id,
      pa.partner_application_id,
      pa.partner_application_number,
      pa.external_application_reference,

      pa.lan,

      pa.customer_full_name,
      pa.mobile_number,

      pa.bre_approved_loan_amount,

      pa.status,

      pa.created_at,
      pa.updated_at

    FROM pl_partner_applications pa

    WHERE pa.status = 'DISBURSED'

    ${searchClause}

    ORDER BY pa.${sortColumn} ${safeSortDir}

    LIMIT ? OFFSET ?
  `;


  const [
    [countRows],
    [rows],
  ] = await Promise.all([

    db.query(
      countSql,
      searchParams
    ),

    db.query(
      dataSql,
      [
        ...searchParams,
        limit,
        offset,
      ]
    ),

  ]);


  const total =
    Number(
      countRows[0]?.total || 0
    );


  return {

    rows,

    pagination: {

      page: pg,

      pageSize: limit,

      total,

      totalPages:
        Math.max(
          1,
          Math.ceil(total / limit)
        ),

    },

  };

};

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
  getAllPersonalLoans,
  getPersonalLoanByLan,
  getDisbursementByLan,
  getPersonalLoanSchedule,
  getExtraChargesByLan,
  getDisbursedLoans,
  getApprovedLoans,

};
