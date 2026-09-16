const crypto = require("crypto");
const db = require("../../../config/db");

/*
 * IMPORTANT:
 * This is NOT X-Client-Id.
 *
 * Your existing tables have client_id NOT NULL,
 * therefore the DB needs a value internally.
 *
 * Nothing is accepted from the API request/header.
 */
const INTERNAL_DB_CLIENT_ID = 1;

function getInternalClientId() {
  return INTERNAL_DB_CLIENT_ID;
}

function hasValue(value) {
  if (value === undefined || value === null) {
    return false;
  }

  if (
    typeof value === "string" &&
    value.trim() === ""
  ) {
    return false;
  }

  return true;
}

/*
 * Our agreed update rule:
 *
 * missing     -> keep existing
 * null        -> keep existing
 * ""          -> keep existing
 * valid value -> update
 * 0           -> update
 * false       -> update
 */
function mergeValue(incoming, existing, transform = (value) => value) {
  if (!hasValue(incoming)) {
    return existing;
  }

  return transform(incoming);
}

function normalizeString(value) {
  if (!hasValue(value)) {
    return value;
  }

  return String(value).trim();
}

function normalizeDate(value) {
  if (!hasValue(value)) {
    return value;
  }

  return new Date(value);
}

function normalizeNumber(value) {
  if (!hasValue(value)) {
    return value;
  }

  return Number(value);
}

function normalizeBoolean(value) {
  return value ? 1 : 0;
}

function stableSortObject(value) {
  if (Array.isArray(value)) {
    return value.map(stableSortObject);
  }

  if (
    value !== null &&
    typeof value === "object" &&
    !(value instanceof Date)
  ) {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = stableSortObject(value[key]);
        return result;
      }, {});
  }

  return value;
}

function stableStringify(value) {
  return JSON.stringify(stableSortObject(value));
}

function hashRequestBody(payload) {
  return crypto
    .createHash("sha256")
    .update(stableStringify(payload))
    .digest("hex");
}

function hashApiKey(apiKey) {
  return crypto
    .createHash("sha256")
    .update(String(apiKey))
    .digest("hex");
}

function query(sql, values = []) {
  return db.query(sql, values);
}

async function queryDB(sql, params = []) {
  const [rows] = await db.query(sql, params);
  return rows;
}

function apiError(statusCode, code, message) {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;

  return error;
}

function assertApplicationIdentity(application, payload) {
  if (!application) {
    throw apiError(404, "APPLICATION_NOT_FOUND", "Application not found");
  }

  const dbLan = String(application.lan || "").trim().toUpperCase();
  const requestLan = String(payload.lan || "").trim().toUpperCase();

  if (dbLan !== requestLan) {
    throw apiError(409, "APPLICATION_IDENTITY_MISMATCH", "lan does not match the application");
  }

  const dbReference = String(application.external_application_reference || "").trim();
  const requestReference = String(payload.externalApplicationReference || "").trim();

  if (dbReference !== requestReference) {
    throw apiError(
      409,
      "APPLICATION_IDENTITY_MISMATCH",
      "externalApplicationReference does not match the application",
    );
  }
}

function makeHash(data) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(data || {}))
    .digest("hex");
}

function getClientId() {
  return Number(process.env.PARTNER_INTERNAL_CLIENT_ID || 1);
}

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

function isUuidV4(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
}

function dateToIso(value) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

function hasMeaningfulObjectData(obj) {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  return Object.values(obj).some((value) => {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      return hasMeaningfulObjectData(value);
    }

    return hasValue(value);
  });
}

module.exports = {
  getInternalClientId,
  hasValue,
  mergeValue,
  normalizeString,
  normalizeDate,
  normalizeNumber,
  normalizeBoolean,
  stableStringify,
  hashRequestBody,
  isUuidV4,
  dateToIso,
  hashApiKey,
  hasMeaningfulObjectData,
  query,
  queryDB,
  apiError,
  assertApplicationIdentity,
  makeHash,
  getClientId,
  getApplication,
};
