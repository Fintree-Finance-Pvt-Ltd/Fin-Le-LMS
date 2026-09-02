const crypto = require("crypto");
const db = require("../../../config/db");
const PartnerApiError = require("../errors/PartnerApiError");
const { runPlPartnerBre, } = require("./PartnerBre");

const {
  getInternalClientId,
  hashRequestBody,
  mergeValue,
  normalizeString,
  normalizeDate,
  normalizeNumber,
  normalizeBoolean,
  dateToIso,
} = require("../utils/partnerUtils");

async function findApplicationForUpdate(
  connection,
  partnerApplicationId,
) {
  const clientId =
    getInternalClientId();

  const [rows] =
    await connection.query(
      `SELECT *
       FROM pl_partner_applications
       WHERE client_id = ?
         AND partner_application_id = ?
       LIMIT 1
       FOR UPDATE`,
      [
        clientId,
        partnerApplicationId,
      ],
    );

  if (!rows.length) {
    throw new PartnerApiError(
      404,
      "APPLICATION_NOT_FOUND",
      "Partner application was not found.",
    );
  }

  return rows[0];
}

function assertApplicationIdentity(
  application,
  payload,
) {
  if (
    application.external_application_reference !==
      payload.externalApplicationReference ||
    application.lan !== payload.lan
  ) {
    throw new PartnerApiError(
      409,
      "APPLICATION_IDENTITY_MISMATCH",
      "externalApplicationReference or LAN does not match the application.",
    );
  }
}

// for approve
function assertDecisionApplicationIdentity(
  application,
  payload,
) {
  if (
    application
      .external_application_reference !==
      payload.externalApplicationReference
  ) {
    throw new PartnerApiError(
      409,
      "APPLICATION_IDENTITY_MISMATCH",
      "externalApplicationReference does not match the application.",
    );
  }

  if (
    application.product_code !==
      payload.productCode
  ) {
    throw new PartnerApiError(
      409,
      "PRODUCT_CODE_MISMATCH",
      "productCode does not match the application.",
    );
  }
}

function assertDisbursalApplicationIdentity(
  application,
  payload,
) {
  if (
    application
      .external_application_reference !==
      payload.externalApplicationReference ||
    application.lan !==
      payload.lan
  ) {
    throw new PartnerApiError(
      409,
      "APPLICATION_IDENTITY_MISMATCH",
      "externalApplicationReference or LAN does not match the application.",
    );
  }
}

/*
 * This is the important merge function.
 *
 * Incoming null/""/missing values NEVER destroy existing data.
 */
function buildMergedState(
  application,
  payload,
) {
  const customer =
    payload.customer || {};

  const employment =
    payload.employment || {};

  const aadhaar =
    payload.aadhaarKyc || {};

  const permanent =
    payload.permanentAddress || {};

  const current =
    payload.currentAddress || {};

  const evidence =
    payload.currentAddressEvidence || {};

  const offer =
    payload.selectedOffer || {};

  const bank =
    payload.bankDetails || {};

  const mandate =
    payload.mandate || {};

  return {
    customer_full_name: mergeValue(
      customer.fullName,
      application.customer_full_name,
      normalizeString,
    ),

    customer_first_name: mergeValue(
      customer.firstName,
      application.customer_first_name,
      normalizeString,
    ),

    customer_middle_name: mergeValue(
      customer.middleName,
      application.customer_middle_name,
      normalizeString,
    ),

    customer_last_name: mergeValue(
      customer.lastName,
      application.customer_last_name,
      normalizeString,
    ),

    customer_father_name: mergeValue(
      customer.fatherName,
      application.customer_father_name,
      normalizeString,
    ),

    pan_number: mergeValue(
      customer.panNumber,
      application.pan_number,
      normalizeString,
    ),

    date_of_birth: mergeValue(
      customer.dateOfBirth,
      application.date_of_birth,
      normalizeDate,
    ),

    gender: mergeValue(
      customer.gender,
      application.gender,
      normalizeString,
    ),

    mobile_number: mergeValue(
      customer.mobileNumber,
      application.mobile_number,
      normalizeString,
    ),

    email: mergeValue(
      customer.email,
      application.email,
      normalizeString,
    ),

    employment_employment_type:
      mergeValue(
        employment.employmentType,
        application.employment_employment_type,
        normalizeString,
      ),

    employment_company_type:
      mergeValue(
        employment.companyType,
        application.employment_company_type,
        normalizeString,
      ),

    employment_company_name:
      mergeValue(
        employment.companyName,
        application.employment_company_name,
        normalizeString,
      ),

    employment_designation:
      mergeValue(
        employment.designation,
        application.employment_designation,
        normalizeString,
      ),

    employment_business_name:
      mergeValue(
        employment.businessName,
        application.employment_business_name,
        normalizeString,
      ),

    employment_business_constitution:
      mergeValue(
        employment.businessConstitution,
        application.employment_business_constitution,
        normalizeString,
      ),

    employment_monthly_income:
      mergeValue(
        employment.monthlyIncome,
        application.employment_monthly_income,
        normalizeNumber,
      ),

    employment_annual_turnover:
      mergeValue(
        employment.annualTurnover,
        application.employment_annual_turnover,
        normalizeNumber,
      ),

    employment_employment_vintage:
      mergeValue(
        employment.employmentVintage,
        application.employment_employment_vintage,
        normalizeNumber,
      ),

    employment_business_vintage:
      mergeValue(
        employment.businessVintage,
        application.employment_business_vintage,
        normalizeNumber,
      ),

    employment_salary_mode:
      mergeValue(
        employment.salaryMode,
        application.employment_salary_mode,
        normalizeString,
      ),

    employment_completed_at:
      mergeValue(
        employment.completedAt,
        application.employment_completed_at,
        normalizeDate,
      ),

    aadhaar_status: mergeValue(
      aadhaar.status,
      application.aadhaar_status,
      normalizeString,
    ),

    aadhaar_masked: mergeValue(
      aadhaar.maskedAadhaar,
      application.aadhaar_masked,
      normalizeString,
    ),

    aadhaar_verified_name:
      mergeValue(
        aadhaar.verifiedName,
        application.aadhaar_verified_name,
        normalizeString,
      ),

    aadhaar_date_of_birth:
      mergeValue(
        aadhaar.dateOfBirth,
        application.aadhaar_date_of_birth,
        normalizeDate,
      ),

    aadhaar_gender: mergeValue(
      aadhaar.gender,
      application.aadhaar_gender,
      normalizeString,
    ),

    aadhaar_provider: mergeValue(
      aadhaar.provider,
      application.aadhaar_provider,
      normalizeString,
    ),

    aadhaar_provider_reference:
      mergeValue(
        aadhaar.providerReference,
        application.aadhaar_provider_reference,
        normalizeString,
      ),

    aadhaar_verified_at:
      mergeValue(
        aadhaar.verifiedAt,
        application.aadhaar_verified_at,
        normalizeDate,
      ),

    perm_address_line1: mergeValue(
      permanent.addressLine1,
      application.perm_address_line1,
      normalizeString,
    ),

    perm_address_line2: mergeValue(
      permanent.addressLine2,
      application.perm_address_line2,
      normalizeString,
    ),

    perm_landmark: mergeValue(
      permanent.landmark,
      application.perm_landmark,
      normalizeString,
    ),

    perm_locality: mergeValue(
      permanent.locality,
      application.perm_locality,
      normalizeString,
    ),

    perm_district: mergeValue(
      permanent.district,
      application.perm_district,
      normalizeString,
    ),

    perm_city: mergeValue(
      permanent.city,
      application.perm_city,
      normalizeString,
    ),

    perm_state: mergeValue(
      permanent.state,
      application.perm_state,
      normalizeString,
    ),

    perm_country: mergeValue(
      permanent.country,
      application.perm_country,
      normalizeString,
    ),

    perm_pincode: mergeValue(
      permanent.pincode,
      application.perm_pincode,
      normalizeString,
    ),

    perm_source: mergeValue(
      permanent.source,
      application.perm_source,
      normalizeString,
    ),

    /*
     * false is valid!
     *
     * Missing -> existing
     * false   -> 0
     * true    -> 1
     */
    curr_same_as_perm: mergeValue(
      current.sameAsPermanent,
      application.curr_same_as_perm,
      normalizeBoolean,
    ),

    curr_address_line1: mergeValue(
      current.addressLine1,
      application.curr_address_line1,
      normalizeString,
    ),

    curr_address_line2: mergeValue(
      current.addressLine2,
      application.curr_address_line2,
      normalizeString,
    ),

    curr_landmark: mergeValue(
      current.landmark,
      application.curr_landmark,
      normalizeString,
    ),

    curr_locality: mergeValue(
      current.locality,
      application.curr_locality,
      normalizeString,
    ),

    curr_district: mergeValue(
      current.district,
      application.curr_district,
      normalizeString,
    ),

    curr_city: mergeValue(
      current.city,
      application.curr_city,
      normalizeString,
    ),

    curr_state: mergeValue(
      current.state,
      application.curr_state,
      normalizeString,
    ),

    curr_country: mergeValue(
      current.country,
      application.curr_country,
      normalizeString,
    ),

    curr_pincode: mergeValue(
      current.pincode,
      application.curr_pincode,
      normalizeString,
    ),

    curr_source: mergeValue(
      current.source,
      application.curr_source,
      normalizeString,
    ),

    evidence_live_photo_document_reference:
      mergeValue(
        evidence.livePhotoDocumentReference,
        application.evidence_live_photo_document_reference,
        normalizeString,
      ),

    liveness_provider: mergeValue(
      evidence.livenessProvider,
      application.liveness_provider,
      normalizeString,
    ),

    liveness_reference: mergeValue(
      evidence.livenessReference,
      application.liveness_reference,
      normalizeString,
    ),

    liveness_status: mergeValue(
      evidence.livenessStatus,
      application.liveness_status,
      normalizeString,
    ),

    liveness_score: mergeValue(
      evidence.livenessScore,
      application.liveness_score,
      normalizeNumber,
    ),

    evidence_reference: mergeValue(
      evidence.evidenceReference,
      application.evidence_reference,
      normalizeString,
    ),

    evidence_latitude: mergeValue(
      evidence.latitude,
      application.evidence_latitude,
      normalizeNumber,
    ),

    evidence_longitude: mergeValue(
      evidence.longitude,
      application.evidence_longitude,
      normalizeNumber,
    ),

    evidence_captured_at: mergeValue(
      evidence.capturedAt,
      application.evidence_captured_at,
      normalizeDate,
    ),

    evidence_verified_at: mergeValue(
      evidence.verifiedAt,
      application.evidence_verified_at,
      normalizeDate,
    ),

    selected_offer_amount: mergeValue(
      offer.amount,
      application.selected_offer_amount,
      normalizeNumber,
    ),

    selected_offer_tenure: mergeValue(
      offer.tenure,
      application.selected_offer_tenure,
      normalizeNumber,
    ),

    selected_offer_selected_at:
      mergeValue(
        offer.selectedAt,
        application.selected_offer_selected_at,
        normalizeDate,
      ),

    bank_account_holder_name:
      mergeValue(
        bank.accountHolderName,
        application.bank_account_holder_name,
        normalizeString,
      ),

    bank_account_number: mergeValue(
      bank.accountNumber,
      application.bank_account_number,
      normalizeString,
    ),

    bank_ifsc_code: mergeValue(
      bank.ifscCode,
      application.bank_ifsc_code,
      normalizeString,
    ),

    bank_name: mergeValue(
      bank.bankName,
      application.bank_name,
      normalizeString,
    ),

    bank_account_type: mergeValue(
      bank.accountType,
      application.bank_account_type,
      normalizeString,
    ),

    bank_verified_at: mergeValue(
      bank.verifiedAt,
      application.bank_verified_at,
      normalizeDate,
    ),

    mandate_umrn: mergeValue(
      mandate.umrn,
      application.mandate_umrn,
      normalizeString,
    ),

    mandate_provider: mergeValue(
      mandate.provider,
      application.mandate_provider,
      normalizeString,
    ),

    mandate_type: mergeValue(
      mandate.mandateType,
      application.mandate_type,
      normalizeString,
    ),

    mandate_authorized_at:
      mergeValue(
        mandate.authorizedAt,
        application.mandate_authorized_at,
        normalizeDate,
      ),
  };
}

function buildDetailSnapshot(merged) {
  return {
    customer_full_name:
      merged.customer_full_name,

    customer_first_name:
      merged.customer_first_name,

    customer_middle_name:
      merged.customer_middle_name,

    customer_last_name:
      merged.customer_last_name,

    customer_father_name:
      merged.customer_father_name,

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

    employment_employment_type:
      merged.employment_employment_type,

    employment_company_type:
      merged.employment_company_type,

    employment_company_name:
      merged.employment_company_name,

    employment_designation:
      merged.employment_designation,

    employment_business_name:
      merged.employment_business_name,

    employment_business_constitution:
      merged.employment_business_constitution,

    employment_monthly_income:
      merged.employment_monthly_income,

    employment_annual_turnover:
      merged.employment_annual_turnover,

    employment_employment_vintage:
      merged.employment_employment_vintage,

    employment_business_vintage:
      merged.employment_business_vintage,

    employment_salary_mode:
      merged.employment_salary_mode,

    employment_completed_at:
      merged.employment_completed_at,

    aadhaar_status:
      merged.aadhaar_status,

    aadhaar_masked:
      merged.aadhaar_masked,

    aadhaar_verified_name:
      merged.aadhaar_verified_name,

    aadhaar_date_of_birth:
      merged.aadhaar_date_of_birth,

    aadhaar_gender:
      merged.aadhaar_gender,

    aadhaar_provider:
      merged.aadhaar_provider,

    aadhaar_provider_reference:
      merged.aadhaar_provider_reference,

    aadhaar_verified_at:
      merged.aadhaar_verified_at,

    perm_address_line1:
      merged.perm_address_line1,

    perm_address_line2:
      merged.perm_address_line2,

    perm_landmark:
      merged.perm_landmark,

    perm_locality:
      merged.perm_locality,

    perm_district:
      merged.perm_district,

    perm_city:
      merged.perm_city,

    perm_state:
      merged.perm_state,

    perm_country:
      merged.perm_country,

    perm_pincode:
      merged.perm_pincode,

    perm_source:
      merged.perm_source,

    curr_same_as_perm:
      merged.curr_same_as_perm,

    curr_address_line1:
      merged.curr_address_line1,

    curr_address_line2:
      merged.curr_address_line2,

    curr_landmark:
      merged.curr_landmark,

    curr_locality:
      merged.curr_locality,

    curr_district:
      merged.curr_district,

    curr_city:
      merged.curr_city,

    curr_state:
      merged.curr_state,

    curr_country:
      merged.curr_country,

    curr_pincode:
      merged.curr_pincode,

    curr_source:
      merged.curr_source,

    evidence_live_photo_document_reference:
      merged.evidence_live_photo_document_reference,

    liveness_provider:
      merged.liveness_provider,

    liveness_reference:
      merged.liveness_reference,

    liveness_status:
      merged.liveness_status,

    liveness_score:
      merged.liveness_score,

    evidence_reference:
      merged.evidence_reference,

    evidence_latitude:
      merged.evidence_latitude,

    evidence_longitude:
      merged.evidence_longitude,

    evidence_captured_at:
      merged.evidence_captured_at,

    evidence_verified_at:
      merged.evidence_verified_at,

    selected_offer_amount:
      merged.selected_offer_amount,

    selected_offer_tenure:
      merged.selected_offer_tenure,

    selected_offer_selected_at:
      merged.selected_offer_selected_at,

    bank_account_holder_name:
      merged.bank_account_holder_name,

    bank_account_number:
      merged.bank_account_number,

    bank_ifsc_code:
      merged.bank_ifsc_code,

    bank_name:
      merged.bank_name,

    bank_account_type:
      merged.bank_account_type,

    bank_verified_at:
      merged.bank_verified_at,

    mandate_umrn:
      merged.mandate_umrn,

    mandate_provider:
      merged.mandate_provider,

    mandate_type:
      merged.mandate_type,

    mandate_authorized_at:
      merged.mandate_authorized_at,
  };
}

async function createApplication({ payload }) {
  const clientId =
    getInternalClientId();

  const createRequestHash =
    hashRequestBody(payload);

  const connection =
    await db.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const [conflicts] =
      await connection.query(
        `SELECT *
         FROM pl_partner_applications
         WHERE client_id = ?
           AND (
             external_application_reference = ?
             OR lan = ?
           )
         FOR UPDATE`,
        [
          clientId,
          payload.externalApplicationReference,
          payload.lan,
        ],
      );

    if (conflicts.length) {
      const existing = conflicts[0];

      const sameApplication =
        existing.external_application_reference ===
          payload.externalApplicationReference &&
        existing.lan === payload.lan;

      if (
        !sameApplication ||
        existing.create_request_hash !==
          createRequestHash
      ) {
        throw new PartnerApiError(
          409,
          "APPLICATION_REFERENCE_CONFLICT",
          "The external application reference or LAN is already linked to another application.",
        );
      }

      await connection.commit();
      transactionStarted = false;

      return {
        statusCode: 200,
        data: {
          externalApplicationReference:
            existing.external_application_reference,

          lan: existing.lan,

          status: "CREATED",

          partnerApplicationId:
            existing.partner_application_id,

          partnerApplicationNumber:
            existing.partner_application_number,

          createdAt:
            dateToIso(
              existing.created_at,
            ),
        },
      };
    }

    const partnerApplicationId =
      crypto.randomUUID();

    const [insertResult] =
      await connection.query(
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
           status,
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
           created_at,
           updated_at
         )
         VALUES (
           ?, ?, NULL, ?, ?, ?, ?,
           ?, ?, ?, ?, ?, ?,
           'CREATED',
           ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
           ?, ?, ?,
           NOW(3),
           NOW(3)
         )`,
        [
          clientId,
          partnerApplicationId,

          payload.externalApplicationReference,
          payload.lan,
          payload.sourceSystem,
          payload.productCode,

          payload.requestedAmount ?? null,
          payload.requestedTenure ?? null,
          payload.tenureType ?? null,
          payload.interestRate ?? null,

          /*
           * API:
           * processingFeePercent
           *
           * DB:
           * processing_fee
           */
          payload.processingFeePercent ??
            null,

          createRequestHash,

          payload.customer.fullName,
          payload.customer.firstName,
          payload.customer.middleName ??
            null,
          payload.customer.lastName,
          payload.customer.fatherName,
          payload.customer.panNumber,
          payload.customer.dateOfBirth,
          payload.customer.gender ?? null,
          payload.customer.mobileNumber ??
            null,
          payload.customer.email ?? null,

          payload.panVerification
            .verified
            ? 1
            : 0,

          payload.panVerification
            .providerReference ?? null,

          payload.panVerification
            .verifiedAt
            ? new Date(
                payload.panVerification
                  .verifiedAt,
              )
            : null,
        ],
      );

    const partnerApplicationNumber =
      `FINPL${String(
        insertResult.insertId,
      ).padStart(8, "0")}`;

    await connection.query(
      `UPDATE pl_partner_applications
       SET partner_application_number = ?
       WHERE id = ?`,
      [
        partnerApplicationNumber,
        insertResult.insertId,
      ],
    );

    const [createdRows] =
      await connection.query(
        `SELECT created_at
         FROM pl_partner_applications
         WHERE id = ?
         LIMIT 1`,
        [insertResult.insertId],
      );

    await connection.commit();
    transactionStarted = false;

    return {
      statusCode: 201,

      /*
       * Exact response data contract.
       */
      data: {
        externalApplicationReference:
          payload.externalApplicationReference,

        lan: payload.lan,

        status: "CREATED",

        partnerApplicationId,

        partnerApplicationNumber,

        createdAt: dateToIso(
          createdRows[0].created_at,
        ),
      },
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch {}
    }

    if (error.code === "ER_DUP_ENTRY") {
      throw new PartnerApiError(
        409,
        "APPLICATION_REFERENCE_CONFLICT",
        "The external application reference or LAN already exists.",
      );
    }

    throw error;
  } finally {
    connection.release();
  }
}

async function recordConsent({
  partnerApplicationId,
  payload,
}) {
  const clientId =
    getInternalClientId();

  const connection =
    await db.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const application =
      await findApplicationForUpdate(
        connection,
        partnerApplicationId,
      );

    assertApplicationIdentity(
      application,
      payload,
    );

    const [existingRows] =
      await connection.query(
        `SELECT *
         FROM pl_partner_application_consents
         WHERE client_id = ?
           AND consent_id = ?
         LIMIT 1
         FOR UPDATE`,
        [
          clientId,
          payload.consentId,
        ],
      );

    if (existingRows.length) {
      const existing =
        existingRows[0];

      if (
        Number(existing.application_id) !==
        Number(application.id)
      ) {
        throw new PartnerApiError(
          409,
          "CONSENT_ID_CONFLICT",
          "The consentId already belongs to another application.",
        );
      }

      await connection.commit();
      transactionStarted = false;

      return {
        statusCode: 200,
        data: {
          status: "RECORDED",

          consentReference:
            existing.consent_reference,

          recordedAt:
            dateToIso(
              existing.recorded_at,
            ),
        },
      };
    }

    const consentReference =
      `FIN-CONSENT-${crypto.randomUUID()}`;

    await connection.query(
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
       VALUES (
         ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
         NOW(3),
         NOW(3)
       )`,
      [
        clientId,
        application.id,
        payload.consentId,
        consentReference,
        payload.consentReference ?? null,
        payload.consentType,
        payload.consentTemplateId,
        payload.consentVersion,
        payload.consentTextHash,
        new Date(payload.acceptedAt),
        payload.ipAddress ?? null,
        payload.userAgentHash ?? null,
      ],
    );

    await connection.query(
      `UPDATE pl_partner_applications
       SET status =
         CASE
           WHEN status = 'CREATED'
             THEN 'CONSENT_RECORDED'
           ELSE status
         END,
         updated_at = NOW(3)
       WHERE id = ?`,
      [application.id],
    );

    const [rows] =
      await connection.query(
        `SELECT recorded_at
         FROM pl_partner_application_consents
         WHERE client_id = ?
           AND consent_reference = ?
         LIMIT 1`,
        [
          clientId,
          consentReference,
        ],
      );

    await connection.commit();
    transactionStarted = false;

    return {
      statusCode: 200,
      data: {
        status: "RECORDED",
        consentReference,
        recordedAt:
          dateToIso(rows[0].recorded_at),
      },
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch {}
    }

    throw error;
  } finally {
    connection.release();
  }
}

async function updateDetails({
  partnerApplicationId,
  payload,
}) {
  const clientId =
    getInternalClientId();

  const connection =
    await db.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const application =
      await findApplicationForUpdate(
        connection,
        partnerApplicationId,
      );

    assertApplicationIdentity(
      application,
      payload,
    );

    const [consents] =
      await connection.query(
        `SELECT id
         FROM pl_partner_application_consents
         WHERE client_id = ?
           AND application_id = ?
           AND consent_type =
             'LENDER_DATA_SHARING'
         LIMIT 1`,
        [
          clientId,
          application.id,
        ],
      );

    if (!consents.length) {
      throw new PartnerApiError(
        422,
        "CONSENT_REQUIRED",
        "Lender data-sharing consent must be recorded before details submission.",
      );
    }

    const requestHash =
      hashRequestBody(payload);

    /*
     * First handle a genuine retry of the same version.
     */
    const [existingVersionRows] =
      await connection.query(
        `SELECT request_hash,
                accepted_at
         FROM pl_partner_application_detail_versions
         WHERE application_id = ?
           AND details_version = ?
         LIMIT 1
         FOR UPDATE`,
        [
          application.id,
          payload.detailsVersion,
        ],
      );

    if (existingVersionRows.length) {
      const existingVersion =
        existingVersionRows[0];

      if (
        existingVersion.request_hash !==
        requestHash
      ) {
        throw new PartnerApiError(
          409,
          "DETAILS_VERSION_CONFLICT",
          "The detailsVersion already exists with different content.",
        );
      }

      await connection.commit();
      transactionStarted = false;

      return {
        statusCode: 200,
        data: {
          detailsVersion:
            payload.detailsVersion,

          status:
            "DETAILS_ACCEPTED",

          updatedAt:
            dateToIso(
              existingVersion.accepted_at,
            ),
        },
      };
    }

    /*
     * Strict V1 -> V2 -> V3 -> V4 sequence.
     *
     * This fixes the reference implementation,
     * which would allow V1 -> V4 directly.
     */
    const currentVersion =
      Number(
        application.latest_details_version ||
          0,
      );

    const expectedVersion =
      currentVersion + 1;

    if (
      Number(payload.detailsVersion) !==
      expectedVersion
    ) {
      throw new PartnerApiError(
        409,
        "INVALID_DETAILS_VERSION",
        `Expected detailsVersion ${expectedVersion} but received ${payload.detailsVersion}.`,
        {
          currentVersion,
          expectedVersion,
          receivedVersion:
            Number(
              payload.detailsVersion,
            ),
        },
      );
    }

    /*
     * This is where your KEEP EXISTING rule
     * is actually applied.
     */
    const merged =
      buildMergedState(
        application,
        payload,
      );

    const detailSnapshot =
      buildDetailSnapshot(merged);

    const detailColumns =
      Object.keys(detailSnapshot);

    const detailValues =
      Object.values(detailSnapshot);

    const acceptedAt =
      new Date();

    await connection.query(
      `INSERT INTO
         pl_partner_application_detail_versions
       (
         application_id,
         details_version,
         request_hash,
         ${detailColumns
           .map((column) => `\`${column}\``)
           .join(", ")},
         details_json,
         accepted_at,
         created_at
       )
       VALUES (
         ?, ?, ?,
         ${detailColumns
           .map(() => "?")
           .join(", ")},
         ?,
         ?,
         ?
       )`,
      [
        application.id,
        payload.detailsVersion,
        requestHash,
        ...detailValues,

        /*
         * Keep exact inbound JSON for audit.
         *
         * The flattened columns above contain
         * the merged/current snapshot.
         */
        JSON.stringify(payload),

        acceptedAt,
        acceptedAt,
      ],
    );

    const updateColumns =
      Object.keys(merged);

    const updateValues =
      Object.values(merged);

    await connection.query(
      `UPDATE pl_partner_applications
       SET
         ${updateColumns
           .map(
             (column) =>
               `\`${column}\` = ?`,
           )
           .join(", ")},

         status =
           CASE
             WHEN status IN (
               'DOCUMENTS_PARTIALLY_RECEIVED',
               'DOCUMENTS_RECEIVED'
             )
               THEN status
             ELSE 'DETAILS_ACCEPTED'
           END,

         latest_details_version = ?,
         details_updated_at = ?,
         updated_at = ?

       WHERE id = ?`,
      [
        ...updateValues,

        payload.detailsVersion,
        acceptedAt,
        acceptedAt,
        application.id,
      ],
    );

    await connection.commit();
    transactionStarted = false;

    return {
      statusCode: 200,
      data: {
        detailsVersion:
          payload.detailsVersion,

        status:
          "DETAILS_ACCEPTED",

        updatedAt:
          acceptedAt.toISOString(),
      },
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch {}
    }

    throw error;
  } finally {
    connection.release();
  }
}

// for disbursement

async function requestDecision({
  partnerApplicationId,
  payload,
  decisionVersion,
}) {
  const connection =
    await db.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const application =
      await findApplicationForUpdate(
        connection,
        partnerApplicationId,
      );

    /*
     * Approve request has no LAN,
     * therefore use its own identity check.
     */
    assertDecisionApplicationIdentity(
      application,
      payload,
    );

    const currentVersion =
      Number(
        application
          .latest_details_version || 0,
      );

    /*
     * DECISION V1
     *
     * Must be called after Profile V1.
     */
    if (decisionVersion === 1) {
      if (currentVersion !== 1) {
        throw new PartnerApiError(
          409,
          "INVALID_APPLICATION_STAGE",
          "Request Decision V1 can only be called after Profile V1.",
          {
            latestDetailsVersion:
              currentVersion,
            requiredDetailsVersion: 1,
          },
        );
      }

      /*
       * ===========================================
       * PRE-APPROVAL BRE GOES HERE
       * ===========================================
       *
       * We will plug your existing Personal Loan
       * BRE/credit-limit function here.
       *
       * DO NOT hard-code 8000.
       */

      await connection.commit();
      transactionStarted = false;

      const breResult =
        await runPlPartnerBre(
          application,
          {
            phase: "PRE_APPROVAL",
          },
        );

      return {
        statusCode: 200,
        data: {
          externalApplicationReference:
            application.external_application_reference,
          productCode:
            application.product_code,
          decision: breResult.decision,
          reason: breResult.reason,
          creditLimit: breResult.creditLimit,
          policyVersion: breResult.policyVersion,
        },
      };
    }

    /*
     * DECISION V2
     *
     * Must be called after Profile V2.
     */
    if (decisionVersion === 2) {
      if (currentVersion !== 2) {
        throw new PartnerApiError(
          409,
          "INVALID_APPLICATION_STAGE",
          "Request Decision V2 can only be called after Profile V2.",
          {
            latestDetailsVersion:
              currentVersion,
            requiredDetailsVersion: 2,
          },
        );
      }

      /*
       * V2 absolutely requires selected offer.
       *
       * These are your ACTUAL existing columns.
       */
      const selectedAmount =
        Number(
          application
            .selected_offer_amount,
        );

      const selectedTenure =
        Number(
          application
            .selected_offer_tenure,
        );

      if (
        !Number.isFinite(
          selectedAmount,
        ) ||
        selectedAmount <= 0 ||
        !Number.isFinite(
          selectedTenure,
        ) ||
        selectedTenure <= 0
      ) {
        throw new PartnerApiError(
          422,
          "SELECTED_OFFER_REQUIRED",
          "A valid selected offer is required before final approval.",
        );
      }

      /*
       * ===========================================
       * FINAL APPROVAL ENGINE GOES HERE
       * ===========================================
       *
       * Use:
       *
       * selectedAmount
       * selectedTenure
       * application
       *
       * Do not read amount/tenure from payload,
       * because approve request intentionally
       * doesn't contain them.
       */

      await connection.commit();
      transactionStarted = false;

      const breResult =
        await runPlPartnerBre(
          application,
          {
            phase: "FINAL_APPROVAL",
          },
        );

      return {
        statusCode: 200,
        data: {
          externalApplicationReference:
            application.external_application_reference,
          productCode:
            application.product_code,
          decision: breResult.decision,
          reason: breResult.reason,
          creditLimit: breResult.creditLimit,
          grossApprovedLoanAmount:
            breResult.grossApprovedLoanAmount,
          approvedLoanAmount:
            breResult.approvedLoanAmount,
          disbursalBreakup:
            breResult.disbursalBreakup,
          policyVersion: breResult.policyVersion,
        },
      };
    }

    throw new PartnerApiError(
      400,
      "INVALID_DECISION_VERSION",
      "Unsupported Request Decision version.",
    );
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch {}
    }

    throw error;
  } finally {
    connection.release();
  }
}

async function triggerDisbursal({
  partnerApplicationId,
  payload,
}) {
  const connection =
    await db.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const application =
      await findApplicationForUpdate(
        connection,
        partnerApplicationId,
      );

    assertDisbursalApplicationIdentity(
      application,
      payload,
    );

    /*
 * FINAL BRE must be approved before
 * disbursal can be triggered.
 */
if (application.bre_final_status !== "APPROVED") {
  throw new PartnerApiError(
    409,
    "FINAL_APPROVAL_NOT_COMPLETED",
    "Final BRE approval must be completed before disbursal.",
  );
}

/*
 * bre_approved_loan_amount is the NET
 * amount after processing fee + GST.
 */
const finalDisbursalAmount =
  Number(
    application
      .bre_approved_loan_amount,
  );

if (
  !Number.isFinite(finalDisbursalAmount) ||
  finalDisbursalAmount <= 0
) {
  throw new PartnerApiError(
    422,
    "FINAL_DISBURSAL_AMOUNT_NOT_FOUND",
    "Final approved disbursal amount is not available.",
  );
}

const requestedDisbursalAmount =
  Number(payload.amount);

if (
  Number(finalDisbursalAmount.toFixed(2)) !==
  Number(requestedDisbursalAmount.toFixed(2))
) {
  throw new PartnerApiError(
    409,
    "DISBURSAL_AMOUNT_MISMATCH",
    "Disbursal amount must match the final approved net disbursal amount.",
    {
      expectedAmount:
        finalDisbursalAmount,
      receivedAmount:
        requestedDisbursalAmount,
    },
  );
}
  
    /*
     * Profile V4 contains mandate information.
     */
    if (
      Number(
        application
          .latest_details_version || 0,
      ) < 4
    ) {
      throw new PartnerApiError(
        409,
        "MANDATE_DETAILS_REQUIRED",
        "Profile V4 must be completed before disbursal can be triggered.",
      );
    }

    if (
      !application.mandate_umrn &&
      !application
        .mandate_authorized_at
    ) {
      throw new PartnerApiError(
        409,
        "MANDATE_NOT_COMPLETED",
        "Mandate must be completed before disbursal can be triggered.",
      );
    }

    /*
     * ===========================================
     * E-SIGN CHECK GOES HERE
     * ===========================================
     *
     * I have NOT invented an e-sign column/table
     * because your supplied Partner service does
     * not contain one.
     *
     * We must connect your real e-sign status here.
     */

    /*
     * ===========================================
     * ACTUAL FUND TRANSFER GOES HERE
     * ===========================================
     *
     * Do NOT mark loan DISBURSED here.
     *
     * This endpoint only TRIGGERS funds.
     * Actual DISBURSED + UTR comes via webhook.
     */

    throw new PartnerApiError(
      501,
      "DISBURSAL_ENGINE_NOT_CONNECTED",
      "Disbursal engine is not connected yet.",
    );
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch {}
    }

    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  createApplication,
  recordConsent,
  updateDetails,
  requestDecision,
  triggerDisbursal,
};
