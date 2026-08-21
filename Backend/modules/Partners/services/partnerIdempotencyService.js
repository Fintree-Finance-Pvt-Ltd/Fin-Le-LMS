const crypto = require("crypto");
const db = require("../../../config/db");
const PartnerApiError = require("../errors/PartnerApiError");

const {
  getInternalClientId,
  hashRequestBody,
} = require("../utils/partnerUtils");

async function reserveIdempotency({
  idempotencyKey,
  method,
  endpoint,
  payload,
}) {
  const clientId = getInternalClientId();
  const requestHash =
    hashRequestBody(payload);

  const lockToken = crypto.randomUUID();

  try {
    const [result] = await db
      .promise()
      .query(
        `INSERT INTO pl_partner_idempotency_records
         (
           client_id,
           idempotency_key,
           request_method,
           endpoint,
           request_hash,
           processing_status,
           lock_token,
           locked_until,
           created_at,
           updated_at
         )
         VALUES (
           ?, ?, ?, ?, ?,
           'PROCESSING',
           ?,
           DATE_ADD(NOW(3), INTERVAL 30 SECOND),
           NOW(3),
           NOW(3)
         )`,
        [
          clientId,
          idempotencyKey,
          method,
          endpoint,
          requestHash,
          lockToken,
        ],
      );

    return {
      replay: false,
      recordId: result.insertId,
      lockToken,
    };
  } catch (error) {
    if (error.code !== "ER_DUP_ENTRY") {
      throw error;
    }
  }

  const [rows] = await db
    .promise()
    .query(
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

  if (!rows.length) {
    throw new PartnerApiError(
      500,
      "IDEMPOTENCY_LOOKUP_FAILED",
      "Unable to process idempotency key.",
    );
  }

  const existing = rows[0];

  if (
    existing.request_hash !== requestHash ||
    existing.request_method !== method ||
    existing.endpoint !== endpoint
  ) {
    throw new PartnerApiError(
      409,
      "IDEMPOTENCY_CONFLICT",
      "The Idempotency-Key has already been used with a different request.",
    );
  }

  if (
    existing.processing_status ===
      "COMPLETED" &&
    existing.response_body
  ) {
    return {
      replay: true,
      responseStatus:
        existing.response_status,
      responseBody: JSON.parse(
        existing.response_body,
      ),
    };
  }

  if (
    existing.processing_status ===
      "PROCESSING" &&
    existing.locked_until &&
    new Date(existing.locked_until) >
      new Date()
  ) {
    throw new PartnerApiError(
      409,
      "REQUEST_IN_PROGRESS",
      "The same request is already being processed.",
    );
  }

  const newLockToken =
    crypto.randomUUID();

  const [updateResult] = await db
    .promise()
    .query(
      `UPDATE pl_partner_idempotency_records
       SET processing_status = 'PROCESSING',
           lock_token = ?,
           locked_until =
             DATE_ADD(NOW(3), INTERVAL 30 SECOND),
           updated_at = NOW(3)
       WHERE id = ?
         AND (
           processing_status <> 'PROCESSING'
           OR locked_until IS NULL
           OR locked_until <= NOW(3)
         )`,
      [
        newLockToken,
        existing.id,
      ],
    );

  if (!updateResult.affectedRows) {
    throw new PartnerApiError(
      409,
      "REQUEST_IN_PROGRESS",
      "The same request is already being processed.",
    );
  }

  return {
    replay: false,
    recordId: existing.id,
    lockToken: newLockToken,
  };
}

async function completeIdempotency({
  recordId,
  lockToken,
  responseStatus,
  responseBody,
}) {
  await db.promise().query(
    `UPDATE pl_partner_idempotency_records
     SET processing_status = 'COMPLETED',
         response_status = ?,
         response_body = ?,
         completed_at = NOW(3),
         lock_token = NULL,
         locked_until = NULL,
         updated_at = NOW(3)
     WHERE id = ?
       AND lock_token = ?`,
    [
      responseStatus,
      JSON.stringify(responseBody),
      recordId,
      lockToken,
    ],
  );
}

async function failIdempotency({
  recordId,
  lockToken,
}) {
  if (!recordId || !lockToken) {
    return;
  }

  await db.promise().query(
    `UPDATE pl_partner_idempotency_records
     SET processing_status = 'FAILED',
         lock_token = NULL,
         locked_until = NULL,
         updated_at = NOW(3)
     WHERE id = ?
       AND lock_token = ?`,
    [
      recordId,
      lockToken,
    ],
  );
}

async function executeIdempotent({
  req,
  endpoint,
  handler,
}) {
  const idempotencyKey =
    req.get("Idempotency-Key");

  const reservation =
    await reserveIdempotency({
      idempotencyKey,
      method: req.method,
      endpoint,
      payload: req.body,
    });

  if (reservation.replay) {
    return {
      statusCode:
        reservation.responseStatus,
      body: {
        ...reservation.responseBody,

        /*
         * New correlationId for this retry attempt.
         */
        correlationId:
          req.correlationId,
      },
    };
  }

  try {
    const result = await handler();

    const body = {
      success: true,
      data: result.data,
      correlationId:
        req.correlationId,
    };

    await completeIdempotency({
      recordId:
        reservation.recordId,
      lockToken:
        reservation.lockToken,
      responseStatus:
        result.statusCode,
      responseBody: body,
    });

    return {
      statusCode:
        result.statusCode,
      body,
    };
  } catch (error) {
    try {
      await failIdempotency({
        recordId:
          reservation.recordId,
        lockToken:
          reservation.lockToken,
      });
    } catch (idempotencyError) {
      console.error(
        "[Idempotency Failure]",
        idempotencyError,
      );
    }

    throw error;
  }
}

module.exports = {
  executeIdempotent,
};