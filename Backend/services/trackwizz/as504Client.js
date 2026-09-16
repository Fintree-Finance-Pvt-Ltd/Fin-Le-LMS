/**
 * Backend/services/trackwizz/as504Client.js
 *
 * Low-level TrackWizz AS504 HTTP client.
 *
 * Responsibilities:
 * - Send Purpose-01 payload to TrackWizz
 * - Add required headers
 * - Handle HTTP/network errors
 * - Handle TrackWizz validation errors
 * - Parse TrackWizz Purpose-01 response
 */


const axios = require("axios");

const config =
  require("../../config/trackwizz.config");


/* =====================================================
   TRACKWIZZ VALIDATION ERROR HINTS
===================================================== */

const MRV_HINTS = {
  MRV1:
    "API Token missing — check TW_API_TOKEN env",

  MRV2:
    "Invalid/unrecognized API Token — verify token with TrackWizz team",

  MRV3:
    "User lacks API access in Subscription Master",

  MRV10:
    "sourceSystemName is missing in payload",

  MRV11:
    "sourceSystemCustomerCode is missing",

  MRV12:
    "purpose is missing",

  MRV13:
    "Unknown purpose code",

  MRV14:
    "constitutionType is missing",

  MRV27:
    "sourceSystemName not configured on TrackWizz side — ask TrackWizz to whitelist it",

  MRV28:
    "requestId contains disallowed characters",

  MRV29:
    "requestId is missing",

  MRV49:
    "sourceSystemCustomerCode or applicationRefNumber required for purpose 01/03",
};


/* =====================================================
   CUSTOM ERROR
===================================================== */

class As504Error extends Error {
  constructor(
    message,
    {
      code = null,
      httpStatus = null,
      responseBody = null,
      transient = false,
    } = {}
  ) {
    super(message);

    this.name =
      "As504Error";

    this.code =
      code;

    this.httpStatus =
      httpStatus;

    this.responseBody =
      responseBody;

    /*
     * true means it can generally
     * be retried later.
     *
     * Examples:
     * - timeout
     * - network error
     * - HTTP 5xx
     */
    this.transient =
      transient;
  }
}


/* =====================================================
   CALL TRACKWIZZ AS504
===================================================== */

/**
 * Send TrackWizz AS504 request.
 *
 * @param {object} payload
 *
 * @returns
 * {
 *   httpStatus,
 *   body
 * }
 */
async function callAs504(
  payload
) {


  /* =====================================================
     LOCAL MOCK MODE
  ===================================================== */

  if (
    String(
      process.env.TW_MOCK_MODE || ""
    )
      .trim()
      .toLowerCase() === "true"
  ) {

    console.log(
      "⚠️ TrackWizz MOCK MODE enabled"
    );

    return {
      httpStatus: 200,

      body: {
        response: {
          overallStatus:
            "AcceptedByTW",

          customerResponse: [
            {
              validationOutcome:
                "Success",

              purposeResponse: [
                {
                  purposeCode:
                    "01",

                  validationCode:
                    "",

                  validationDescription:
                    "",

                  validationFailureCount:
                    0,

                  data: {
                    suggestedAction:
                      "Proceed",

                    profileCode:
                      "TEST_PROFILE",

                    hitsDetected:
                      "No",

                    hitsCount:
                      0,

                    confirmedHits:
                      "No",

                    caseId:
                      null,

                    caseUrl:
                      null,

                    reportData:
                      null,

                    hitResponse:
                      []
                  }
                }
              ]
            }
          ]
        }
      }
    };
  }

  /* -----------------------------------------------
     Config validation
  ----------------------------------------------- */

  if (!config.url) {
    throw new As504Error(
      "TW_URL not configured",
      {
        code:
          "CONFIG",
      }
    );
  }

  if (!config.apiToken) {
    throw new As504Error(
      "TW_API_TOKEN not configured",
      {
        code:
          "CONFIG",
      }
    );
  }

  if (!config.cluster) {
    throw new As504Error(
      "TW_CLUSTER not configured",
      {
        code:
          "CONFIG",
      }
    );
  }

  if (!config.domain) {
    throw new As504Error(
      "TW_DOMAIN not configured",
      {
        code:
          "CONFIG",
      }
    );
  }

  if (!config.sourceSystemName) {
    throw new As504Error(
      "TW_SOURCE_SYSTEM_NAME not configured",
      {
        code:
          "CONFIG",
      }
    );
  }


  let response;

  try {
    response =
      await axios.post(
        config.url,

        payload,

        {
          headers: {
            "Content-Type":
              "application/json",

            APIToken:
              config.apiToken,

            Cluster:
              config.cluster,

            Domain:
              config.domain,
          },

          timeout:
            config.timeoutMs,

          /*
           * TrackWizz can return
           * base64 PDF report data.
           */
          maxContentLength:
            50 *
            1024 *
            1024,

          maxBodyLength:
            10 *
            1024 *
            1024,

          /*
           * We handle HTTP status manually.
           */
          validateStatus:
            () => true,
        }
      );

  } catch (error) {
    /*
     * Network / timeout failure
     */
    throw new As504Error(
      `AS504 transport error: ${error.message}`,
      {
        code:
          "TRANSPORT",

        transient:
          true,
      }
    );
  }


  const body =
    response.data;


  /* =====================================================
     HTTP 5XX
  ===================================================== */

  if (
    response.status >= 500
  ) {
    throw new As504Error(
      `AS504 server error (HTTP ${response.status})`,
      {
        httpStatus:
          response.status,

        responseBody:
          body,

        transient:
          true,
      }
    );
  }


  /* =====================================================
     TRACKWIZZ MRV VALIDATION ERRORS
  ===================================================== */

  if (
    body &&
    body.validationCode
  ) {
    const codes =
      Array.isArray(
        body.validationCode
      )
        ? body.validationCode.map(
            String
          )
        : String(
            body.validationCode
          )
            .split(",")
            .map(
              (value) =>
                value.trim()
            )
            .filter(Boolean);


    const hints =
      codes
        .map(
          (code) =>
            MRV_HINTS[
              code
            ]
        )
        .filter(Boolean)
        .join("; ");


    throw new As504Error(
      `AS504 rejected request [${codes.join(
        ","
      )}]: ${
        body.validationDescription ||
        ""
      }${
        hints
          ? " — " +
            hints
          : ""
      }`,
      {
        code:
          codes.join(
            ","
          ),

        httpStatus:
          response.status,

        responseBody:
          body,
      }
    );
  }


  /* =====================================================
     UNEXPECTED RESPONSE
  ===================================================== */

  if (
    response.status !== 200 ||
    !body ||
    !body.response
  ) {
    throw new As504Error(
      `Unexpected AS504 response (HTTP ${response.status})`,
      {
        httpStatus:
          response.status,

        responseBody:
          body,

        transient:
          response.status ===
          429,
      }
    );
  }


  return {
    httpStatus:
      response.status,

    body,
  };
}


/* =====================================================
   PURPOSE-01 RESPONSE PARSER
===================================================== */

/**
 * Convert TrackWizz Purpose-01 response
 * into a simpler normalized object.
 */
function parsePurpose01Response(
  body
) {
  const overallStatus =
    body.response
      ?.overallStatus ??
    null;


  const customer =
    body.response
      ?.customerResponse
      ?.[0] ??
    {};


  /*
   * Prefer purposeCode 01.
   *
   * If vendor response doesn't explicitly
   * include it, use the first purpose response.
   */
  const purposeResponse =
    (
      customer
        .purposeResponse ||
      []
    ).find(
      (item) =>
        item.purposeCode ===
        "01"
    ) ||
    customer
      .purposeResponse
      ?.[0] ||
    {};


  const data =
    purposeResponse.data ||
    {};


  return {
    /*
     * AcceptedByTW / RejectedByTW
     */
    overallStatus,


    /*
     * Success / Failure
     */
    validationOutcome:
      customer
        .validationOutcome ??
      null,


    validationCode:
      purposeResponse
        .validationCode ||
      null,


    validationDescription:
      purposeResponse
        .validationDescription ||
      null,


    validationFailureCount:
      purposeResponse
        .validationFailureCount ??
      0,


    /*
     * Proceed / Review / Stop
     */
    suggestedAction:
      data
        .suggestedAction ??
      null,


    profileCode:
      data.profileCode ??
      null,


    /*
     * Yes / No
     */
    hitsDetected:
      data.hitsDetected ??
      null,


    hitsCount:
      data.hitsCount ??
      0,


    /*
     * Yes / No
     */
    confirmedHits:
      data.confirmedHits ??
      null,


    caseId:
      data.caseId ??
      null,


    caseUrl:
      data.caseUrl ??
      null,


    /*
     * TrackWizz base64 PDF
     */
    reportData:
      data.reportData ??
      null,


    /*
     * Individual watchlist matches
     */
    hits:
      (
        data.hitResponse ||
        []
      ).map(
        (hit) => ({
          source:
            hit.source ??
            null,

          watchlistSourceId:
            hit
              .watchlistSourceId ??
            null,

          /*
           * Example:
           * Confirm Hit
           * Probable Hit
           */
          matchType:
            hit.matchType ??
            null,

          score:
            hit.score ??
            null,

          confirmedMatchingAttributes:
            hit
              .confirmedMatchingAttributes ??
            null,
        })
      ),
  };
}


/* =====================================================
   EXPORTS
===================================================== */

module.exports = {
  callAs504,

  parsePurpose01Response,

  As504Error,

  MRV_HINTS,
};