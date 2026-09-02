// const crypto = require("crypto");
// const db = require("../../../config/db");


// module.exports = async function verifyPartnerApiKey(
//   req,
//   res,
//   next,
// ) {
//   try {
//     const apiKey = req.headers["x-api-key"];

//     /*
//     |--------------------------------------------------------------------------
//     | API KEY REQUIRED
//     |--------------------------------------------------------------------------
//     */
//     if (!apiKey) {
//       return res.status(401).json({
//         success: false,

//         error: {
//           code: "INVALID_API_KEY",
//           message: "Missing x-api-key",
//         },

//         correlationId:
//           req.headers["x-correlation-id"] || null,
//       });
//     }


//     /*
//     |--------------------------------------------------------------------------
//     | HASH INCOMING API KEY
//     |--------------------------------------------------------------------------
//     |
//     | Actual API key is NOT stored in DB.
//     | Only SHA-256 hash is stored.
//     |
//     */
//     const apiKeyHash = crypto
//       .createHash("sha256")
//       .update(apiKey)
//       .digest("hex");


//     /*
//     |--------------------------------------------------------------------------
//     | FIND API KEY
//     |--------------------------------------------------------------------------
//     */
//     const [rows] = await db.query(
//       `SELECT
//          id,
//          partner_code,
//          partner_name,
//          status,
//          expires_at
//        FROM partner_api_keys
//        WHERE api_key_hash = ?
//        LIMIT 1`,
//       [apiKeyHash],
//     );


//     const keyRecord = rows[0];


//     /*
//     |--------------------------------------------------------------------------
//     | KEY NOT FOUND
//     |--------------------------------------------------------------------------
//     */
//     if (!keyRecord) {
//       return res.status(401).json({
//         success: false,

//         error: {
//           code: "INVALID_API_KEY",
//           message: "Invalid x-api-key",
//         },

//         correlationId:
//           req.headers["x-correlation-id"] || null,
//       });
//     }


//     /*
//     |--------------------------------------------------------------------------
//     | KEY INACTIVE
//     |--------------------------------------------------------------------------
//     */
//     if (keyRecord.status !== "ACTIVE") {
//       return res.status(401).json({
//         success: false,

//         error: {
//           code: "API_KEY_INACTIVE",
//           message: "API key is inactive",
//         },

//         correlationId:
//           req.headers["x-correlation-id"] || null,
//       });
//     }


//     /*
//     |--------------------------------------------------------------------------
//     | KEY EXPIRED
//     |--------------------------------------------------------------------------
//     */
//     if (
//       keyRecord.expires_at &&
//       new Date(keyRecord.expires_at) < new Date()
//     ) {
//       return res.status(401).json({
//         success: false,

//         error: {
//           code: "API_KEY_EXPIRED",
//           message: "API key has expired",
//         },

//         correlationId:
//           req.headers["x-correlation-id"] || null,
//       });
//     }


//     /*
//     |--------------------------------------------------------------------------
//     | UPDATE LAST USED
//     |--------------------------------------------------------------------------
//     */
//     await db.query(
//       `UPDATE partner_api_keys
//        SET last_used_at = NOW()
//        WHERE id = ?`,
//       [keyRecord.id],
//     );


//     /*
//     |--------------------------------------------------------------------------
//     | OPTIONAL - AVAILABLE TO ROUTES
//     |--------------------------------------------------------------------------
//     */
//     req.partner = {
//       id: keyRecord.id,
//       partnerCode: keyRecord.partner_code,
//       partnerName: keyRecord.partner_name,
//     };


//     next();

//   } catch (error) {
//     console.error(
//       "Partner API key verification error:",
//       error,
//     );

//     return res.status(500).json({
//       success: false,

//       error: {
//         code: "SERVER_ERROR",
//         message: "API key verification failed",
//       },

//       correlationId:
//         req.headers["x-correlation-id"] || null,
//     });
//   }
// };

module.exports = function verifyPartnerApiKey(
  req,
  res,
  next
) {
  try {
    const apiKey =
      req.headers["x-api-key"];

    const expectedApiKey =
      process.env.FINTREE_API_KEY;

    // Server configuration issue
    if (!expectedApiKey) {
      console.error(
        "FINTREE_API_KEY is not configured"
      );

      return res.status(500).json({
        success: false,
        error: {
          code: "SERVER_CONFIGURATION_ERROR",
          message:
            "Partner API key is not configured",
        },
        correlationId:
          req.headers["x-correlation-id"] ||
          null,
      });
    }

    // Key missing
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_API_KEY",
          message: "Missing x-api-key",
        },
        correlationId:
          req.headers["x-correlation-id"] ||
          null,
      });
    }

    // Key incorrect
    if (apiKey !== expectedApiKey) {
      console.log(
        "FINTREE API authentication failed"
      );

      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_API_KEY",
          message: "Invalid x-api-key",
        },
        correlationId:
          req.headers["x-correlation-id"] ||
          null,
      });
    }

    // Valid FinTree request
    console.log(
      "FINTREE API authentication successful",
      {
        method: req.method,
        path: req.originalUrl,
        correlationId:
          req.headers[
            "x-correlation-id"
          ] || null,
      }
    );

    req.partner = {
      partnerCode: "FINTREE",
      partnerName: "FinTree",
    };

    next();

  } catch (error) {
    console.error(
      "Partner API key verification error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message:
          "API key verification failed",
      },
      correlationId:
        req.headers["x-correlation-id"] ||
        null,
    });
  }
};
