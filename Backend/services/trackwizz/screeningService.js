/**
 * Backend/services/trackwizz/screeningService.js
 *
 * Personal Loan TrackWizz AML Screening Service
 *
 * Flow:
 *
 * "fintreepl" + LAN
 *       ↓
 * loanBookingAdapter.js
 *       ↓
 * payloadBuilder.js
 *       ↓
 * screening_requests audit
 *       ↓
 * TrackWizz AS504
 *       ↓
 * parse response
 *       ↓
 * save PDF
 *       ↓
 * loan_documents
 *       ↓
 * screening_hits
 *       ↓
 * pl_partner_applications.aml_*
 */

const db =
  require("../../config/db");

const fs =
  require("fs");

const path =
  require("path");

const crypto =
  require("crypto");


const {
  buildPurpose01Payload,
} = require("./payloadBuilder");


const {
  callAs504,
  parsePurpose01Response,
  As504Error,
} = require("./as504Client");


const {
  getLeadByLan,
  getPartnerConfig,
} = require("./loanBookingAdapter");


/* =====================================================
   CONFIGURATION
===================================================== */

const ON_ERROR_POLICY =
  String(
    process.env.TW_ON_ERROR_POLICY ||
      "BLOCK"
  )
    .trim()
    .toUpperCase() === "ALLOW"
    ? "ALLOW"
    : "BLOCK";


const parsedMaxReportBytes =
  Number(
    process.env.TW_MAX_REPORT_BYTES
  );


const MAX_REPORT_BYTES =
  Number.isFinite(
    parsedMaxReportBytes
  ) &&
  parsedMaxReportBytes > 0
    ? parsedMaxReportBytes
    : 25 * 1024 * 1024;


const ACTION_MAP =
  Object.freeze({
    proceed:
      "PROCEED",

    review:
      "REVIEW",

    stop:
      "STOP",
  });


/* =====================================================
   GENERAL HELPERS
===================================================== */

function quoteIdentifier(
  identifier
) {
  const value =
    String(
      identifier || ""
    );


  if (
    !/^[A-Za-z0-9_]+$/.test(
      value
    )
  ) {
    const err =
      new Error(
        `Invalid SQL identifier "${value}"`
      );

    err.code =
      "INVALID_SQL_IDENTIFIER";

    throw err;
  }


  return `\`${value}\``;
}


function truncate(
  value,
  maxLength = 255
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }


  return String(
    value
  ).slice(
    0,
    maxLength
  );
}


function serializeJson(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }


  if (
    typeof value ===
    "string"
  ) {
    try {
      JSON.parse(
        value
      );

      return value;

    } catch (_) {
      return JSON.stringify({
        raw:
          value,
      });
    }
  }


  try {
    return JSON.stringify(
      value
    );

  } catch (_) {
    return JSON.stringify({
      serializationError:
        true,

      message:
        "Unable to serialize value",
    });
  }
}


function equalsIgnoreCase(
  left,
  right
) {
  return (
    String(
      left || ""
    )
      .trim()
      .toLowerCase() ===

    String(
      right || ""
    )
      .trim()
      .toLowerCase()
  );
}


function normalizeHits(
  result
) {
  return Array.isArray(
    result?.hits
  )
    ? result.hits
    : [];
}


function normalizeHitsCount(
  result,
  hits
) {
  const value =
    Number(
      result?.hitsCount
    );


  return Number.isFinite(
    value
  )
    ? value
    : hits.length;
}


function getDecision(
  suggestedAction
) {
  const action =
    String(
      suggestedAction || ""
    )
      .trim()
      .toLowerCase();


  /*
   * Unknown action should never
   * automatically pass.
   */
  return (
    ACTION_MAP[
      action
    ] ||
    "REVIEW"
  );
}


/* =====================================================
   FILE HELPERS
===================================================== */

function safeFilePart(
  value
) {
  const normalized =
    String(
      value || ""
    )
      .trim()
      .replace(
        /[^A-Za-z0-9_.-]/g,
        "_"
      )
      .replace(
        /_+/g,
        "_"
      )
      .replace(
        /^_+|_+$/g,
        ""
      );


  return (
    normalized ||
    "unknown"
  );
}


/**
 * Backend/uploads
 */
function makeReportOutputPath(
  partnerKey,
  lan
) {
  const uploadDirectory =
    path.join(
      __dirname,
      "../../uploads"
    );


  if (
    !fs.existsSync(
      uploadDirectory
    )
  ) {
    fs.mkdirSync(
      uploadDirectory,
      {
        recursive:
          true,
      }
    );
  }


  const fileName =
    `${safeFilePart(
      partnerKey
    )}_` +
    `${safeFilePart(
      lan
    )}_` +
    `${Date.now()}_AML.pdf`;


  const filePath =
    path.join(
      uploadDirectory,
      fileName
    );


  return {
    fileName,
    filePath,
  };
}


function buildOriginalReportName(
  partnerKey,
  lan
) {
  return (
    `${safeFilePart(
      partnerKey
    )}-` +
    `${safeFilePart(
      lan
    )}-aml-report.pdf`
  );
}


function calculateSha256(
  buffer
) {
  return crypto
    .createHash(
      "sha256"
    )
    .update(
      buffer
    )
    .digest(
      "hex"
    );
}


/* =====================================================
   BASE64 PDF
===================================================== */

/**
 * TrackWizz reportData may be:
 *
 * JVBERi0...
 *
 * or:
 *
 * data:application/pdf;base64,JVBERi0...
 */
function base64ToPdfBuffer(
  reportData
) {
  if (!reportData) {
    return null;
  }


  let pdfBuffer;


  if (
    Buffer.isBuffer(
      reportData
    )
  ) {
    pdfBuffer =
      reportData;

  } else {

    let base64 =
      String(
        reportData
      )
        .trim()
        .replace(
          /^data:application\/pdf;base64,/i,
          ""
        )
        .replace(
          /\s+/g,
          ""
        );


    if (!base64) {
      return null;
    }


    /*
     * Base64 cannot have
     * remainder 1.
     */
    if (
      base64.length %
        4 ===
      1
    ) {
      const err =
        new Error(
          "TrackWizz reportData contains invalid base64"
        );

      err.code =
        "INVALID_REPORT_BASE64";

      throw err;
    }


    while (
      base64.length %
        4 !==
      0
    ) {
      base64 +=
        "=";
    }


    if (
      !/^[A-Za-z0-9+/]*={0,2}$/.test(
        base64
      )
    ) {
      const err =
        new Error(
          "TrackWizz reportData contains invalid base64 characters"
        );

      err.code =
        "INVALID_REPORT_BASE64";

      throw err;
    }


    pdfBuffer =
      Buffer.from(
        base64,
        "base64"
      );
  }


  if (
    !pdfBuffer.length
  ) {
    const err =
      new Error(
        "TrackWizz PDF report is empty"
      );

    err.code =
      "EMPTY_REPORT_PDF";

    throw err;
  }


  if (
    pdfBuffer.length >
    MAX_REPORT_BYTES
  ) {
    const err =
      new Error(
        `TrackWizz PDF exceeds maximum size of ${MAX_REPORT_BYTES} bytes`
      );

    err.code =
      "REPORT_PDF_TOO_LARGE";

    throw err;
  }


  /*
   * PDF header:
   *
   * %PDF-
   */
  const signature =
    pdfBuffer
      .subarray(
        0,
        5
      )
      .toString(
        "ascii"
      );


  if (
    signature !==
    "%PDF-"
  ) {
    const err =
      new Error(
        "Decoded TrackWizz report is not a valid PDF"
      );

    err.code =
      "INVALID_REPORT_PDF";

    throw err;
  }


  return pdfBuffer;
}


/* =====================================================
   RESPONSE REDACTION
===================================================== */

/**
 * Keep huge base64 PDF out of
 * response_payload.
 *
 * PDF itself goes to report_pdf
 * and loan_documents.
 */
function prepareResponseForAudit(
  body
) {
  if (
    body === null ||
    body === undefined
  ) {
    return null;
  }


  let auditResponse;


  try {

    if (
      typeof body ===
      "string"
    ) {
      auditResponse =
        JSON.parse(
          body
        );

    } else {

      auditResponse =
        JSON.parse(
          JSON.stringify(
            body
          )
        );
    }

  } catch (_) {

    return body;
  }


  const customerResponses =
    auditResponse
      ?.response
      ?.customerResponse;


  if (
    !Array.isArray(
      customerResponses
    )
  ) {
    return auditResponse;
  }


  for (
    const customerResponse
    of customerResponses
  ) {

    const purposeResponses =
      customerResponse
        ?.purposeResponse;


    if (
      !Array.isArray(
        purposeResponses
      )
    ) {
      continue;
    }


    for (
      const purposeResponse
      of purposeResponses
    ) {

      if (
        purposeResponse
          ?.data
          ?.reportData
      ) {

        purposeResponse
          .data
          .reportData =
          "[stored separately as PDF]";
      }
    }
  }


  return auditResponse;
}


/* =====================================================
   CHECK EXISTING SCREENING
===================================================== */

/**
 * Reuse only a COMPLETED screening.
 *
 * FAILED screening may be retried.
 * PENDING should not be treated as a pass.
 */
async function findExistingScreening(
  partnerKey,
  lan
) {
  try {

    const [rows] =
      await db.query(
        `
        SELECT
          id,
          request_id,
          status,
          suggested_action,
          hits_count,
          confirmed_hits,
          report_pdf IS NOT NULL AS has_report,
          report_file_name

        FROM screening_requests

        WHERE partner_key = ?
          AND lan = ?
          AND status = 'COMPLETED'

        ORDER BY id DESC

        LIMIT 1
        `,
        [
          partnerKey,
          lan,
        ]
      );


    return rows.length
      ? rows[0]
      : null;


  } catch (
    error
  ) {

    console.error(
      "[PL AML] Existing screening lookup failed",
      {
        partnerKey,
        lan,
        error:
          error.message,
      }
    );


    /*
     * Do not accidentally skip AML.
     *
     * Try fresh screening.
     */
    return null;
  }
}


/* =====================================================
   CREATE SCREENING AUDIT
===================================================== */

async function createScreeningAudit({
  requestId,
  lead,
  payload,
}) {

  const customer =
    payload
      ?.customerList
      ?.[0];


  if (!customer) {

    const err =
      new Error(
        "TrackWizz payload customerList is empty"
      );

    err.code =
      "INVALID_SCREENING_PAYLOAD";

    throw err;
  }


  if (
    !customer
      .sourceSystemCustomerCode
  ) {

    const err =
      new Error(
        "sourceSystemCustomerCode is required"
      );

    err.code =
      "CUSTOMER_CODE_REQUIRED";

    throw err;
  }


  const [
    insertResult,
  ] =
    await db.query(
      `
      INSERT INTO screening_requests
      (
        request_id,
        lead_id,
        partner_key,
        lan,
        source_system_name,
        source_system_customer_code,
        purpose,
        request_payload,
        status
      )
      VALUES
      (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        '01',
        ?,
        'PENDING'
      )
      `,
      [
        requestId,

        lead.leadId,

        lead.partner,

        lead.lan,

        payload
          .sourceSystemName,

        customer
          .sourceSystemCustomerCode,

        JSON.stringify(
          payload
        ),
      ]
    );


  return (
    insertResult
      .insertId
  );
}


/* =====================================================
   PL LOAN DOCUMENT STORAGE
===================================================== */

/**
 * Your loan_documents table:
 *
 * document_id        CHAR(36) NOT NULL UNIQUE
 * client_id          BIGINT NOT NULL
 * lan                VARCHAR(50) NOT NULL
 * document_type      VARCHAR(100) NOT NULL
 * file_name
 * original_name
 * file_size
 * mime_type
 * file_sha256
 * source_url
 * source
 * doc_password
 * meta_json
 * doc_name
 * sub_type
 * uploaded_at
 */
async function saveToLoanDocuments({
  lead,
  screeningRequestId,
  fileName,
  sourceUrl,
  pdfBuffer,
}) {

  if (
    !lead?.lan
  ) {
    const err =
      new Error(
        "LAN is required to save TrackWizz AML document"
      );

    err.code =
      "DOCUMENT_LAN_REQUIRED";

    throw err;
  }


  if (
    lead.clientId ===
      null ||
    lead.clientId ===
      undefined ||
    String(
      lead.clientId
    ).trim() === ""
  ) {

    const err =
      new Error(
        `client_id is required to save AML document for LAN "${lead.lan}"`
      );

    err.code =
      "DOCUMENT_CLIENT_ID_REQUIRED";

    throw err;
  }


  if (
    !Buffer.isBuffer(
      pdfBuffer
    ) ||
    !pdfBuffer.length
  ) {

    const err =
      new Error(
        "Valid PDF buffer is required"
      );

    err.code =
      "DOCUMENT_PDF_REQUIRED";

    throw err;
  }


  const documentId =
    crypto.randomUUID();


  const originalName =
    buildOriginalReportName(
      lead.partner,
      lead.lan
    );


  const fileSize =
    pdfBuffer.length;


  const mimeType =
    "application/pdf";


  const fileSha256 =
    calculateSha256(
      pdfBuffer
    );


  const metaJson =
    JSON.stringify({
      provider:
        "TRACKWIZZ",

      purpose:
        "01",

      partner:
        lead.partner,

      leadId:
        lead.leadId,

      clientId:
        lead.clientId,

      lan:
        lead.lan,

      screeningRequestId,

      applicationRefNumber:
        lead.applicationRefNumber,

      generatedAt:
        new Date()
          .toISOString(),
    });


  await db.query(
    `
    INSERT INTO loan_documents
    (
      document_id,
      client_id,
      lan,
      document_type,

      file_name,
      original_name,

      file_size,
      mime_type,
      file_sha256,

      source_url,
      source,

      meta_json,

      doc_name,
      sub_type,

      uploaded_at
    )
    VALUES
    (
      ?,
      ?,
      ?,
      ?,

      ?,
      ?,

      ?,
      ?,
      ?,

      ?,
      ?,

      ?,

      ?,
      ?,

      NOW()
    )
    `,
    [
      documentId,

      lead.clientId,

      lead.lan,

      "AML_REPORT",

      fileName,

      originalName,

      fileSize,

      mimeType,

      fileSha256,

      sourceUrl,

      "TRACKWIZZ",

      metaJson,

      "AML_REPORT",

      "TRACKWIZZ",
    ]
  );


  return {
    documentId,
    fileName,
    originalName,
    fileSize,
    mimeType,
    fileSha256,
    sourceUrl,
  };
}


/* =====================================================
   SAVE SUCCESSFUL TRACKWIZZ RESPONSE
===================================================== */

async function persistTrackWizzResponse({
  screeningRequestId,
  httpStatus,
  body,
  result,
  lead,
}) {

  const rawResponse =
    prepareResponseForAudit(
      body
    );


  let reportPdf =
    null;

  let reportMimeType =
    null;

  let reportFileName =
    null;

  let reportFilePath =
    null;

  let reportStorageError =
    null;

  let documentId =
    null;


  /* ===================================================
     TRACKWIZZ PDF
  =================================================== */

  if (
    result.reportData
  ) {

    try {

      reportPdf =
        base64ToPdfBuffer(
          result.reportData
        );


      if (
        reportPdf
      ) {

        reportMimeType =
          "application/pdf";


        const {
          fileName,
          filePath,
        } =
          makeReportOutputPath(
            lead.partner,
            lead.lan
          );


        /*
         * Save physical file:
         *
         * Backend/uploads/<file>.pdf
         */
        fs.writeFileSync(
          filePath,
          reportPdf
        );


        reportFileName =
          fileName;


        reportFilePath =
          `/uploads/${fileName}`;


        console.log(
          "[PL AML] TrackWizz PDF written",
          {
            lan:
              lead.lan,

            fileName,
          }
        );


        /*
         * Save document metadata
         * into PL loan_documents.
         *
         * Failure here does NOT make
         * TrackWizz screening itself fail.
         */
        try {

          const document =
            await saveToLoanDocuments({
              lead,

              screeningRequestId,

              fileName,

              sourceUrl:
                reportFilePath,

              pdfBuffer:
                reportPdf,
            });


          documentId =
            document.documentId;


          console.log(
            "[PL AML] loan_documents row created",
            {
              lan:
                lead.lan,

              clientId:
                lead.clientId,

              documentId,
            }
          );


        } catch (
          documentError
        ) {

          reportStorageError =
            truncate(
              `${
                documentError.code ||
                "LOAN_DOCUMENT_ERROR"
              }: ${
                documentError.message
              }`,
              1000
            );


          console.error(
            "[PL AML] Unable to insert AML PDF into loan_documents",
            {
              lan:
                lead.lan,

              clientId:
                lead.clientId,

              error:
                reportStorageError,
            }
          );
        }
      }


    } catch (
      pdfError
    ) {

      reportStorageError =
        truncate(
          `${
            pdfError.code ||
            "REPORT_ERROR"
          }: ${
            pdfError.message
          }`,
          1000
        );


      console.error(
        "[PL AML] Unable to process TrackWizz PDF",
        {
          screeningRequestId,

          partner:
            lead.partner,

          lan:
            lead.lan,

          error:
            reportStorageError,
        }
      );
    }
  }


  const validationSuccessful =
    equalsIgnoreCase(
      result.validationOutcome,
      "Success"
    );


  /* ===================================================
     SAVE TRACKWIZZ RESPONSE TO AUDIT
  =================================================== */

  await db.query(
    `
    UPDATE screening_requests

    SET
      response_payload = ?,

      http_status = ?,

      overall_status = ?,

      validation_outcome = ?,

      suggested_action = ?,

      hits_detected = ?,

      hits_count = ?,

      confirmed_hits = ?,

      profile_code = ?,

      case_id = ?,

      case_url = ?,

      validation_failure_count = ?,

      report_pdf = ?,

      report_mime_type = ?,

      report_file_name = ?,

      report_file_path = ?,

      report_storage_error = ?,

      error_code = ?,

      error_message = ?,

      status = ?

    WHERE id = ?
    `,
    [
      serializeJson(
        rawResponse
      ),

      httpStatus ??
        null,

      result
        .overallStatus ??
        null,

      result
        .validationOutcome ??
        null,

      result
        .suggestedAction ??
        null,

      result
        .hitsDetected ??
        null,

      result
        .hitsCount ??
        0,

      result
        .confirmedHits ??
        null,

      result
        .profileCode ??
        null,

      result
        .caseId ??
        null,

      result
        .caseUrl ??
        null,

      result
        .validationFailureCount ??
        0,

      reportPdf,

      reportMimeType,

      reportFileName,

      reportFilePath,

      reportStorageError,

      result
        .validationCode ||
        null,

      result
        .validationDescription ||
        null,

      validationSuccessful
        ? "COMPLETED"
        : "FAILED",

      screeningRequestId,
    ]
  );


  return {

    rawResponse,

    reportStored:
      Boolean(
        reportPdf
      ),

    reportFileName,

    reportFilePath,

    documentId,

    reportStorageError,
  };
}


/* =====================================================
   SCREENING FAILURE
===================================================== */

function getErrorHttpStatus(
  error
) {
  return (
    error?.httpStatus ??
    error?.status ??
    error
      ?.response
      ?.status ??
    null
  );
}


function getErrorPayload(
  error
) {
  return (
    error?.responseBody ??
    error?.body ??
    error
      ?.response
      ?.data ??
    null
  );
}


async function persistScreeningFailure({
  screeningRequestId,
  error,
}) {

  const errorPayload =
    prepareResponseForAudit(
      getErrorPayload(
        error
      )
    );


  const errorCode =
    error?.code ||
    (
      error instanceof
      As504Error
        ? "AS504_ERROR"
        : "SCREENING_ERROR"
    );


  await db.query(
    `
    UPDATE screening_requests

    SET
      response_payload = ?,

      http_status = ?,

      error_code = ?,

      error_message = ?,

      status = 'FAILED'

    WHERE id = ?
    `,
    [
      serializeJson(
        errorPayload
      ),

      getErrorHttpStatus(
        error
      ),

      truncate(
        errorCode,
        100
      ),

      truncate(
        error?.message ||
          "TrackWizz screening failed",
        1000
      ),

      screeningRequestId,
    ]
  );


  return errorPayload;
}


/* =====================================================
   SCREENING HITS
===================================================== */

async function persistScreeningHits(
  screeningRequestId,
  hits
) {

  if (
    !Array.isArray(
      hits
    ) ||
    hits.length === 0
  ) {
    return;
  }


  /*
   * Individual INSERTs avoid depending
   * on mysql2 bulk VALUES ? behavior.
   */
  for (
    const hit
    of hits
  ) {

    await db.query(
      `
      INSERT INTO screening_hits
      (
        screening_request_id,
        source,
        watchlist_source_id,
        match_type,
        score,
        confirmed_matching_attributes
      )
      VALUES
      (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?
      )
      `,
      [
        screeningRequestId,

        hit?.source ??
          null,

        hit
          ?.watchlistSourceId ??
          null,

        hit?.matchType ??
          null,

        hit?.score ??
          null,

        hit
          ?.confirmedMatchingAttributes ===
          null ||
        hit
          ?.confirmedMatchingAttributes ===
          undefined
          ? null
          : serializeJson(
              hit
                .confirmedMatchingAttributes
            ),
      ]
    );
  }
}


/* =====================================================
   MAIN AML SCREENING
===================================================== */

async function screenLead(
  lead
) {

  /*
   * Validate and build payload
   * before making external call.
   */
  const {
    requestId,
    payload,
  } =
    buildPurpose01Payload(
      lead
    );


  /*
   * Compliance audit record
   * must exist before TrackWizz call.
   */
  const screeningRequestId =
    await createScreeningAudit({
      requestId,
      lead,
      payload,
    });


  try {

    /* -----------------------------------------------
       Call TrackWizz
    ----------------------------------------------- */

    const {
      httpStatus,
      body,
    } =
      await callAs504(
        payload
      );


    /* -----------------------------------------------
       Parse TrackWizz response
    ----------------------------------------------- */

    const parsedResult =
      parsePurpose01Response(
        body
      );


    if (
      !parsedResult ||
      typeof parsedResult !==
        "object"
    ) {

      const err =
        new Error(
          "Unable to parse TrackWizz response"
        );

      err.code =
        "INVALID_TRACKWIZZ_RESPONSE";

      err.responseBody =
        body;

      throw err;
    }


    const hits =
      normalizeHits(
        parsedResult
      );


    const hitsCount =
      normalizeHitsCount(
        parsedResult,
        hits
      );


    const result = {
      ...parsedResult,

      hits,

      hitsCount,
    };


    /* -----------------------------------------------
       Store response + PDF
    ----------------------------------------------- */

    const persisted =
      await persistTrackWizzResponse({
        screeningRequestId,

        httpStatus,

        body,

        result,

        lead,
      });


    /* -----------------------------------------------
       Store individual AML hits
    ----------------------------------------------- */

    await persistScreeningHits(
      screeningRequestId,
      hits
    );


    /* -----------------------------------------------
       Validate customer response
    ----------------------------------------------- */

    const validationSuccessful =
      equalsIgnoreCase(
        result
          .validationOutcome,

        "Success"
      );


    if (
      !validationSuccessful
    ) {

      const validationReason =
        result
          .validationDescription ||

        result
          .validationCode ||

        "Unknown TrackWizz validation error";


      return {

        decision:
          "ERROR",

        degraded:
          false,

        reason:
          "TrackWizz field validation failed: " +
          validationReason,

        partner:
          lead.partner,

        leadId:
          lead.leadId,

        clientId:
          lead.clientId,

        lan:
          lead.lan,

        screeningRequestId,

        requestId,

        hitsCount,

        confirmedHits:
          equalsIgnoreCase(
            result
              .confirmedHits,

            "Yes"
          ),

        hits,

        hasReport:
          Boolean(
            result
              .reportData
          ),

        reportStored:
          persisted
            .reportStored,

        reportFileName:
          persisted
            .reportFileName,

        reportFilePath:
          persisted
            .reportFilePath,

        documentId:
          persisted
            .documentId,

        reportStorageError:
          persisted
            .reportStorageError,

        rawResponse:
          persisted
            .rawResponse,

        result,
      };
    }


    /* -----------------------------------------------
       Successful screening
    ----------------------------------------------- */

    return {

      decision:
        getDecision(
          result
            .suggestedAction
        ),

      degraded:
        false,

      partner:
        lead.partner,

      leadId:
        lead.leadId,

      clientId:
        lead.clientId,

      lan:
        lead.lan,

      screeningRequestId,

      requestId,

      hitsCount,

      confirmedHits:
        equalsIgnoreCase(
          result
            .confirmedHits,

          "Yes"
        ),

      hits,

      hasReport:
        Boolean(
          result
            .reportData
        ),

      reportStored:
        persisted
          .reportStored,

      reportFileName:
        persisted
          .reportFileName,

      reportFilePath:
        persisted
          .reportFilePath,

      documentId:
        persisted
          .documentId,

      reportStorageError:
        persisted
          .reportStorageError,

      rawResponse:
        persisted
          .rawResponse,

      result,
    };


  } catch (
    error
  ) {

    const isAs504Error =
      error instanceof
      As504Error;


    let rawResponse =
      null;


    /*
     * Keep original TrackWizz error,
     * even if audit update also fails.
     */
    try {

      rawResponse =
        await persistScreeningFailure({
          screeningRequestId,
          error,
        });


    } catch (
      auditError
    ) {

      console.error(
        "[PL AML] Unable to persist TrackWizz failure",
        {
          screeningRequestId,

          originalError:
            error?.message,

          auditError:
            auditError?.message,
        }
      );
    }


    return {

      /*
       * BLOCK normally returns REVIEW
       * from service, but degraded=true
       * ensures DB stores ERROR.
       */
      decision:
        ON_ERROR_POLICY ===
        "ALLOW"
          ? "PROCEED"
          : "REVIEW",

      degraded:
        true,

      reason:
        error?.message ||
        "TrackWizz screening failed",

      retryable:
        isAs504Error
          ? Boolean(
              error
                .transient
            )
          : false,

      partner:
        lead.partner,

      leadId:
        lead.leadId,

      clientId:
        lead.clientId,

      lan:
        lead.lan,

      screeningRequestId,

      requestId,

      hitsCount:
        null,

      confirmedHits:
        false,

      hits:
        [],

      hasReport:
        false,

      reportStored:
        false,

      reportFileName:
        null,

      reportFilePath:
        null,

      documentId:
        null,

      reportStorageError:
        null,

      rawResponse,

      result:
        null,
    };
  }
}


/* =====================================================
   AML SUMMARY HELPERS
===================================================== */

function getHighestAmlScore(
  outcome
) {

  const hits =
    Array.isArray(
      outcome?.hits
    )
      ? outcome.hits
      : [];


  const scores =
    hits

      .map(
        (hit) =>
          Number(
            hit?.score
          )
      )

      .filter(
        Number.isFinite
      );


  return scores.length
    ? Math.max(
        ...scores
      )
    : null;
}


function buildAmlReason(
  outcome
) {

  const hits =
    Array.isArray(
      outcome?.hits
    )
      ? outcome.hits
      : [];


  if (
    outcome.degraded
  ) {

    return truncate(
      `Screening unavailable: ${
        outcome.reason ||
        "Unknown error"
      }`
    );
  }


  if (
    outcome.decision ===
    "ERROR"
  ) {

    return truncate(
      outcome.reason ||
      "TrackWizz validation failure"
    );
  }


  const hitsCount =
    Number(
      outcome.hitsCount
    ) ||
    0;


  if (
    hitsCount > 0
  ) {

    if (
      !hits.length
    ) {

      return truncate(
        `${hitsCount} hit(s) reported; hit details unavailable`
      );
    }


    const topHits =
      hits

        .slice()

        .sort(
          (
            left,
            right
          ) =>
            (
              Number(
                right
                  ?.score
              ) ||
              0
            ) -
            (
              Number(
                left
                  ?.score
              ) ||
              0
            )
        )

        .slice(
          0,
          3
        )

        .map(
          (hit) => {

            const source =
              hit?.source ||
              "Unknown source";


            const matchType =
              hit
                ?.matchType ||
              "Unknown match";


            const score =
              hit?.score ??
              0;


            return (
              `${source} ` +
              `(${matchType}, ${score})`
            );
          }
        )

        .join(
          "; "
        );


    return truncate(
      `${hitsCount} hit(s): ${topHits}`
    );
  }


  return (
    outcome.decision ===
    "PROCEED"
      ? "No watchlist hits"
      : truncate(
          `TrackWizz suggested ${outcome.decision}`
        )
  );
}


function buildAmlApiResponse(
  outcome
) {

  if (
    outcome
      .rawResponse ===
      null ||
    outcome
      .rawResponse ===
      undefined
  ) {

    return null;
  }


  return serializeJson(
    outcome
      .rawResponse
  );
}


/* =====================================================
   UPDATE pl_partner_applications AML COLUMNS
===================================================== */

async function updatePartnerAmlResult({
  partnerKey,
  lead,
  outcome,
}) {

  const cfg =
    getPartnerConfig(
      partnerKey
    );


  if (
    !cfg.amlColumns
  ) {

    const err =
      new Error(
        `[${partnerKey}] AML columns are not configured`
      );

    err.code =
      "AML_COLUMNS_NOT_CONFIGURED";

    throw err;
  }


  const requiredMappings = [
    "status",
    "score",
    "totalMatches",
    "reason",
    "apiResponse",
    "checkedAt",
  ];


  const missingMappings =
    requiredMappings.filter(
      (
        mapping
      ) =>
        !cfg
          .amlColumns[
          mapping
        ]
    );


  if (
    missingMappings.length
  ) {

    const err =
      new Error(
        `[${partnerKey}] missing AML column mappings: ` +
        missingMappings.join(
          ", "
        )
      );

    err.code =
      "AML_COLUMN_MAPPING_INCOMPLETE";

    throw err;
  }


  if (
    lead.leadId ===
      null ||
    lead.leadId ===
      undefined
  ) {

    const err =
      new Error(
        `[${partnerKey}] leadId is required`
      );

    err.code =
      "LEAD_ID_REQUIRED";

    throw err;
  }


  /*
   * Technical/API failure must be
   * stored as ERROR.
   */
  const amlStatus =
    outcome.degraded
      ? "ERROR"
      : outcome.decision;


  const amlScore =
    getHighestAmlScore(
      outcome
    );


  const amlReason =
    buildAmlReason(
      outcome
    );


  const amlApiResponse =
    buildAmlApiResponse(
      outcome
    );


  const hitsValue =
    Number(
      outcome.hitsCount
    );


  const amlTotalMatches =
    outcome.degraded
      ? null
      : Number.isFinite(
          hitsValue
        )
        ? hitsValue
        : 0;


  const table =
    quoteIdentifier(
      cfg.table
    );


  const primaryKey =
    quoteIdentifier(
      cfg.primaryKey ||
      "id"
    );


  const statusColumn =
    quoteIdentifier(
      cfg
        .amlColumns
        .status
    );


  const scoreColumn =
    quoteIdentifier(
      cfg
        .amlColumns
        .score
    );


  const totalMatchesColumn =
    quoteIdentifier(
      cfg
        .amlColumns
        .totalMatches
    );


  const reasonColumn =
    quoteIdentifier(
      cfg
        .amlColumns
        .reason
    );


  const apiResponseColumn =
    quoteIdentifier(
      cfg
        .amlColumns
        .apiResponse
    );


  const checkedAtColumn =
    quoteIdentifier(
      cfg
        .amlColumns
        .checkedAt
    );


  const [
    updateResult,
  ] =
    await db.query(
      `
      UPDATE ${table}

      SET
        ${statusColumn} = ?,

        ${scoreColumn} = ?,

        ${totalMatchesColumn} = ?,

        ${reasonColumn} = ?,

        ${apiResponseColumn} = ?,

        ${checkedAtColumn} = NOW()

      WHERE ${primaryKey} = ?

      LIMIT 1
      `,
      [
        amlStatus,

        amlScore,

        amlTotalMatches,

        amlReason,

        amlApiResponse,

        lead.leadId,
      ]
    );


  /*
   * affectedRows can occasionally be zero
   * when values are unchanged.
   *
   * Confirm application still exists.
   */
  if (
    !updateResult
      .affectedRows
  ) {

    const [
      existingRows,
    ] =
      await db.query(
        `
        SELECT
          ${primaryKey}

        FROM ${table}

        WHERE ${primaryKey} = ?

        LIMIT 1
        `,
        [
          lead.leadId,
        ]
      );


    if (
      !existingRows.length
    ) {

      const err =
        new Error(
          `[${partnerKey}] application row no longer exists`
        );

      err.code =
        "AML_UPDATE_ROW_NOT_FOUND";

      throw err;
    }
  }


  return {

    amlStatus,

    amlScore,

    amlTotalMatches,

    amlReason,
  };
}


/* =====================================================
   SCREEN PL APPLICATION BY LAN
===================================================== */

/**
 * Main function used by plRunBRE.js:
 *
 * await screenLoanBooking(
 *   "fintreepl",
 *   loan.lan
 * );
 *
 *
 * Force rescreen:
 *
 * await screenLoanBooking(
 *   "fintreepl",
 *   loan.lan,
 *   { force: true }
 * );
 */
async function screenLoanBooking(
  partnerKey,
  lan,
  options = {}
) {

  const {
    force =
      false,
  } =
    options;


  /*
   * For fintreepl:
   *
   * reads from
   * pl_partner_applications
   */
  const lead =
    await getLeadByLan(
      partnerKey,
      lan
    );


  /* ===================================================
     REUSE EXISTING COMPLETED AML
  =================================================== */

  if (
    !force
  ) {

    const existing =
      await findExistingScreening(
        partnerKey,
        lead.lan
      );


    if (
      existing
    ) {

      const decision =
        getDecision(
          existing
            .suggested_action
        );


      console.log(
        "[PL AML] Existing TrackWizz screening reused",
        {
          lan:
            lead.lan,

          screeningRequestId:
            existing.id,

          status:
            existing.status,

          decision,
        }
      );


      /*
       * IMPORTANT:
       *
       * We do NOT rewrite aml_score / reason
       * during reuse because detailed hits
       * are not loaded here.
       *
       * plRunBRE will read the original
       * aml_* values from
       * pl_partner_applications.
       */
      return {

        decision,

        degraded:
          false,

        reused:
          true,

        partner:
          partnerKey,

        leadId:
          lead.leadId,

        clientId:
          lead.clientId,

        lan:
          lead.lan,

        screeningRequestId:
          existing.id,

        requestId:
          existing
            .request_id,

        hitsCount:
          existing
            .hits_count ??
          0,

        confirmedHits:
          equalsIgnoreCase(
            existing
              .confirmed_hits,

            "Yes"
          ),

        hits:
          [],

        hasReport:
          Boolean(
            existing
              .has_report
          ),

        reportStored:
          Boolean(
            existing
              .has_report
          ),

        reportFileName:
          existing
            .report_file_name ||
          null,

        reportFilePath:
          existing
            .report_file_name
            ? `/uploads/${
                existing
                  .report_file_name
              }`
            : null,

        documentId:
          null,

        reportStorageError:
          null,

        rawResponse:
          null,

        result:
          null,

        amlStatus:
          decision,

        amlScore:
          null,

        amlTotalMatches:
          existing
            .hits_count ??
          0,

        amlReason:
          null,
      };
    }
  }


  /* ===================================================
     FRESH TRACKWIZZ SCREENING
  =================================================== */

  const outcome =
    await screenLead(
      lead
    );


  /*
   * Write AML summary into:
   *
   * pl_partner_applications
   */
  const amlResult =
    await updatePartnerAmlResult({
      partnerKey,
      lead,
      outcome,
    });


  return {

    ...outcome,

    partner:
      partnerKey,

    leadId:
      lead.leadId,

    clientId:
      lead.clientId,

    lan:
      lead.lan,

    ...amlResult,
  };
}


/* =====================================================
   GET PDF BY SCREENING REQUEST ID
===================================================== */

function normalizeScreeningRequestId(
  value
) {

  const normalized =
    String(
      value || ""
    ).trim();


  if (
    !/^\d+$/.test(
      normalized
    )
  ) {

    const err =
      new Error(
        "Valid screening request ID is required"
      );

    err.code =
      "INVALID_SCREENING_REQUEST_ID";

    throw err;
  }


  return normalized;
}


async function getScreeningReport(
  screeningRequestId
) {

  const normalizedId =
    normalizeScreeningRequestId(
      screeningRequestId
    );


  const [
    rows,
  ] =
    await db.query(
      `
      SELECT
        id,

        partner_key,

        lan,

        report_pdf,

        report_mime_type,

        report_file_name

      FROM screening_requests

      WHERE id = ?

        AND report_pdf IS NOT NULL

      LIMIT 1
      `,
      [
        normalizedId,
      ]
    );


  if (
    !rows.length
  ) {
    return null;
  }


  const row =
    rows[0];


  return {

    screeningRequestId:
      row.id,

    partnerKey:
      row.partner_key,

    lan:
      row.lan,

    fileName:
      row
        .report_file_name ||
      buildOriginalReportName(
        row.partner_key,
        row.lan
      ),

    mimeType:
      row
        .report_mime_type ||
      "application/pdf",

    pdfBuffer:
      row.report_pdf,
  };
}


/* =====================================================
   GET LATEST PDF BY PARTNER + LAN
===================================================== */

async function getScreeningReportByLan(
  partnerKey,
  lan
) {

  /*
   * Ensure valid registered partner.
   */
  getPartnerConfig(
    partnerKey
  );


  const normalizedLan =
    String(
      lan || ""
    ).trim();


  if (
    !normalizedLan
  ) {

    const err =
      new Error(
        "LAN is required"
      );

    err.code =
      "INVALID_LAN";

    throw err;
  }


  const [
    rows,
  ] =
    await db.query(
      `
      SELECT
        id,

        request_id,

        partner_key,

        lan,

        report_pdf,

        report_mime_type,

        report_file_name

      FROM screening_requests

      WHERE partner_key = ?

        AND lan = ?

        AND report_pdf IS NOT NULL

      ORDER BY id DESC

      LIMIT 1
      `,
      [
        partnerKey,

        normalizedLan,
      ]
    );


  if (
    !rows.length
  ) {
    return null;
  }


  const row =
    rows[0];


  return {

    screeningRequestId:
      row.id,

    requestId:
      row.request_id,

    partnerKey:
      row.partner_key,

    lan:
      row.lan,

    fileName:
      row
        .report_file_name ||
      buildOriginalReportName(
        row.partner_key,
        row.lan
      ),

    mimeType:
      row
        .report_mime_type ||
      "application/pdf",

    pdfBuffer:
      row.report_pdf,
  };
}


/* =====================================================
   EXPRESS PDF DOWNLOAD HANDLER
===================================================== */

/**
 * Optional route:
 *
 * GET
 * /aml/report/fintreepl/PL000123
 */
async function downloadScreeningReportByLan(
  req,
  res
) {

  try {

    const partnerKey =
      String(
        req.params
          .partnerKey ||
        ""
      ).trim();


    const lan =
      String(
        req.params
          .lan ||
        ""
      ).trim();


    if (
      !partnerKey
    ) {

      return res
        .status(
          400
        )
        .json({
          success:
            false,

          code:
            "PARTNER_REQUIRED",

          message:
            "partnerKey is required",
        });
    }


    if (
      !lan
    ) {

      return res
        .status(
          400
        )
        .json({
          success:
            false,

          code:
            "LAN_REQUIRED",

          message:
            "LAN is required",
        });
    }


    getPartnerConfig(
      partnerKey
    );


    const report =
      await getScreeningReportByLan(
        partnerKey,
        lan
      );


    if (
      !report
        ?.pdfBuffer
    ) {

      return res
        .status(
          404
        )
        .json({
          success:
            false,

          code:
            "REPORT_NOT_FOUND",

          message:
            `AML report not found for partner "${partnerKey}" and LAN "${lan}"`,
        });
    }


    const pdfBuffer =
      Buffer.isBuffer(
        report.pdfBuffer
      )
        ? report.pdfBuffer
        : Buffer.from(
            report.pdfBuffer
          );


    const fileName =
      report.fileName ||
      buildOriginalReportName(
        partnerKey,
        lan
      );


    res.setHeader(
      "Content-Type",
      report.mimeType ||
        "application/pdf"
    );


    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );


    res.setHeader(
      "Content-Length",
      pdfBuffer.length
    );


    res.setHeader(
      "Cache-Control",
      "private, no-store"
    );


    return res
      .status(
        200
      )
      .send(
        pdfBuffer
      );


  } catch (
    error
  ) {

    console.error(
      "[PL AML] Report download failed",
      {
        partnerKey:
          req.params
            ?.partnerKey,

        lan:
          req.params
            ?.lan,

        error:
          error.message,
      }
    );


    const isInputError =
      [
        "UNKNOWN_PARTNER",
        "INVALID_LAN",
      ].includes(
        error.code
      );


    return res
      .status(
        isInputError
          ? 400
          : 500
      )
      .json({
        success:
          false,

        code:
          error.code ||
          "REPORT_DOWNLOAD_FAILED",

        message:
          error.message,
      });
  }
}


/* =====================================================
   EXPORTS
===================================================== */

module.exports = {

  /*
   * Main functions
   */
  screenLead,

  screenLoanBooking,


  /*
   * PDF retrieval
   */
  getScreeningReport,

  getScreeningReportByLan,

  downloadScreeningReportByLan,


  /*
   * Helpers / testing
   */
  base64ToPdfBuffer,

  prepareResponseForAudit,

  getHighestAmlScore,

  buildAmlReason,

  updatePartnerAmlResult,
};