const crypto = require("crypto");

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
};