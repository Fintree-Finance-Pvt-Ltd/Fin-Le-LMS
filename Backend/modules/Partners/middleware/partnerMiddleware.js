// const crypto = require("crypto");
// const db = require("../../../config/db");
// const PartnerApiError = require("../errors/PartnerApiError");

// const {
//   hashApiKey,
//   isUuidV4,
// } = require("../utils/partnerUtils");

// function correlationIdMiddleware(req, res, next) {
//   const correlationId =
//     req.get("X-Correlation-Id");

//   req.correlationId =
//     correlationId || crypto.randomUUID();

//   if (!correlationId) {
//     return next(
//       new PartnerApiError(
//         400,
//         "CORRELATION_ID_REQUIRED",
//         "X-Correlation-Id header is required.",
//       ),
//     );
//   }

//   if (!isUuidV4(correlationId)) {
//     return next(
//       new PartnerApiError(
//         400,
//         "INVALID_CORRELATION_ID",
//         "X-Correlation-Id must be a valid UUID v4.",
//       ),
//     );
//   }

//   next();
// }

// async function verifyPartnerApiKey(
//   req,
//   res,
//   next,
// ) {
//   try {
//     const receivedKey =
//       req.get("x-api-key");

//     if (
//       !receivedKey ||
//       !receivedKey.trim()
//     ) {
//       throw new PartnerApiError(
//         401,
//         "UNAUTHORIZED",
//         "Invalid or missing API key.",
//       );
//     }

//     const apiKeyHash =
//       hashApiKey(receivedKey.trim());

//     const [rows] =
//       await db.query(
//         `SELECT
//            id,
//            partner_code,
//            partner_name,
//            api_key_prefix,
//            status,
//            expires_at
//          FROM partner_api_keys
//          WHERE api_key_hash = ?
//          LIMIT 1`,
//         [apiKeyHash],
//       );

//     if (!rows.length) {
//       throw new PartnerApiError(
//         401,
//         "UNAUTHORIZED",
//         "Invalid or missing API key.",
//       );
//     }

//     const apiKeyRecord = rows[0];

//     if (
//       apiKeyRecord.status !== "ACTIVE"
//     ) {
//       throw new PartnerApiError(
//         401,
//         "UNAUTHORIZED",
//         "Invalid or missing API key.",
//       );
//     }

//     if (
//       apiKeyRecord.expires_at &&
//       new Date(
//         apiKeyRecord.expires_at,
//       ).getTime() <= Date.now()
//     ) {
//       throw new PartnerApiError(
//         401,
//         "UNAUTHORIZED",
//         "Invalid or missing API key.",
//       );
//     }

//     /*
//      * Useful internally later.
//      * Nothing is returned to the caller.
//      */
//     req.partnerApiKey = {
//       id: apiKeyRecord.id,
//       partnerCode:
//         apiKeyRecord.partner_code,
//       partnerName:
//         apiKeyRecord.partner_name,
//     };

//     /*
//      * Update last successful usage.
//      * Authentication should not fail just because
//      * this tracking update fails.
//      */
//     db
//       .query(
//         `UPDATE partner_api_keys
//          SET last_used_at = NOW(3)
//          WHERE id = ?`,
//         [apiKeyRecord.id],
//       )
//       .catch((error) => {
//         console.error(
//           "Partner API key last_used_at update failed:",
//           error,
//         );
//       });

//     next();
//   } catch (error) {
//     next(error);
//   }
// }

// function asyncHandler(handler) {
//   return function wrapped(
//     req,
//     res,
//     next,
//   ) {
//     Promise.resolve(
//       handler(req, res, next),
//     ).catch(next);
//   };
// }

// function partnerErrorHandler(
//   error,
//   req,
//   res,
//   next,
// ) {
//   console.error(
//     "[Partner API Error]",
//     error,
//   );

//   const correlationId =
//     req.correlationId ||
//     crypto.randomUUID();

//   if (
//     error instanceof PartnerApiError
//   ) {
//     const errorPayload = {
//       code: error.code,
//       message: error.message,
//     };

//     if (
//       error.details !== undefined
//     ) {
//       errorPayload.details =
//         error.details;
//     }

//     return res
//       .status(error.statusCode)
//       .json({
//         success: false,
//         error: errorPayload,
//         correlationId,
//       });
//   }

//   return res.status(500).json({
//     success: false,
//     error: {
//       code: "INTERNAL_SERVER_ERROR",
//       message:
//         "An unexpected error occurred.",
//     },
//     correlationId,
//   });
// }

// module.exports = {
//   correlationIdMiddleware,
//   verifyPartnerApiKey,
//   asyncHandler,
//   partnerErrorHandler,
// };
