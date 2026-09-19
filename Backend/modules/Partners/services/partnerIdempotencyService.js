const {
  query,
  apiError,
  makeHash,
  getClientId,
} = require("../utils/partnerUtils");

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
    | Already completed — this is the only state where "same key must
    | mean same payload" actually protects anything, since real work
    | already happened under it. A payload mismatch here is a genuine
    | conflict: the caller is trying to reuse a key for a different
    | operation than the one that already succeeded.
    */
    if (
      existing.processing_status ===
      "COMPLETED"
    ) {

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
    | Not completed (FAILED, or a stale PROCESSING left behind by a
    | crash) — nothing irreversible happened under this key yet, so a
    | corrected payload (e.g. a partner fixing a validation mistake from
    | their first attempt, like sending the wrong disbursal amount) is
    | allowed to retry fresh instead of being permanently stuck behind
    | the old, wrong payload's hash.
    */
    await query(
      `UPDATE pl_partner_idempotency_records
       SET
         processing_status = 'PROCESSING',
         request_hash = ?,
         response_status = NULL,
         response_body = NULL,
         updated_at = NOW(3)
       WHERE id = ?`,
      [requestHash, existing.id],
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


module.exports = {
  executeIdempotent,
};
