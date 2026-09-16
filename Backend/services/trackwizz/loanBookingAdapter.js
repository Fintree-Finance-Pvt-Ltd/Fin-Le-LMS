/**
 * Backend/services/trackwizz/loanBookingAdapter.js
 *
 * Personal Loan DB row -> canonical TrackWizz lead.
 *
 * Source table:
 *   pl_partner_applications
 */

const db = require("../../config/db");

/* =====================================================
   NORMALIZATION HELPERS
===================================================== */

const GENDER_MAP = {
  male: "01",
  m: "01",

  female: "02",
  f: "02",

  transgender: "03",
  trans: "03",
  t: "03",
};


const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];


function normalizeText(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}


function mapGender(value) {
  const normalized =
    normalizeText(value)
      .toLowerCase();

  if (!normalized) {
    return "";
  }

  return (
    GENDER_MAP[normalized] ||
    ""
  );
}


function normalizeMobile(raw) {
  if (!raw) {
    return "";
  }

  /*
   * Handles:
   *
   * +91 9876543210
   * 919876543210
   * 98765-43210
   *
   * and keeps last 10 digits.
   */
  const digits =
    String(raw)
      .replace(/\D/g, "")
      .slice(-10);

  return /^[6-9]\d{9}$/.test(
    digits
  )
    ? digits
    : "";
}


function normalizePan(raw) {
  if (!raw) {
    return "";
  }

  const pan =
    String(raw)
      .toUpperCase()
      .trim();

  return /^[A-Z]{5}\d{4}[A-Z]$/.test(
    pan
  )
    ? pan
    : "";
}


/**
 * Convert dates to TrackWizz:
 *
 * DD-MMM-YYYY
 *
 * Example:
 * 1995-08-21
 * ->
 * 21-Aug-1995
 */
function toTwDate(value) {
  if (!value) {
    return "";
  }

  const raw =
    String(value).trim();


  /*
   * Already TrackWizz format.
   */
  if (
    /^(0[1-9]|[12]\d|3[01])-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{4}$/.test(
      raw
    )
  ) {
    return raw;
  }


  /*
   * MySQL DATE:
   *
   * YYYY-MM-DD
   */
  const mysqlDate =
    raw.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (mysqlDate) {
    const [
      ,
      yyyy,
      mm,
      dd,
    ] = mysqlDate;

    const month =
      Number(mm);

    const day =
      Number(dd);

    if (
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      return (
        `${dd}-` +
        `${MONTHS[month - 1]}-` +
        `${yyyy}`
      );
    }

    return "";
  }


  /*
   * DD-MM-YYYY
   * or
   * DD/MM/YYYY
   */
  const indianDate =
    raw.match(
      /^(\d{2})[-/](\d{2})[-/](\d{4})$/
    );

  if (indianDate) {
    const [
      ,
      dd,
      mm,
      yyyy,
    ] = indianDate;

    const month =
      Number(mm);

    const day =
      Number(dd);

    if (
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      return (
        `${dd}-` +
        `${MONTHS[month - 1]}-` +
        `${yyyy}`
      );
    }

    return "";
  }


  /*
   * MySQL DATETIME such as:
   *
   * 2026-09-11 12:30:44
   *
   * We only need the date portion.
   */
  const mysqlDateTime =
    raw.match(
      /^(\d{4})-(\d{2})-(\d{2})[ T]/
    );

  if (mysqlDateTime) {
    const [
      ,
      yyyy,
      mm,
      dd,
    ] = mysqlDateTime;

    const month =
      Number(mm);

    if (
      month >= 1 &&
      month <= 12
    ) {
      return (
        `${dd}-` +
        `${MONTHS[month - 1]}-` +
        `${yyyy}`
      );
    }
  }


  /*
   * Date object fallback.
   */
  const date =
    value instanceof Date
      ? value
      : new Date(raw);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return (
    `${day}-` +
    `${MONTHS[date.getMonth()]}-` +
    `${date.getFullYear()}`
  );
}


/* =====================================================
   PERSONAL LOAN PARTNER REGISTRY
===================================================== */

/**
 * Mapping:
 *
 * canonical field
 *       ↓
 * actual DB column
 */

const PARTNERS = {

  fintreepl: {

    /*
     * Your PL main application table.
     */
    table:
      "pl_partner_applications",


    primaryKey:
      "id",


    /*
     * TrackWizz sourceSystemCustomerCode
     * uses the first available value.
     *
     * partner_application_id is UNIQUE
     * in your PL table, so prefer it.
     */
    codeFields: [
      "partner_application_id",
      "lan",
    ],


    columns: {

      /*
       * Main business identifier.
       */
      lan:
        "lan",


      /*
       * Needed for loan_documents.
       */
      clientId:
        "client_id",


      /*
       * Customer identity.
       */
      name:
        "customer_full_name",


      fatherName:
        "customer_father_name",


      pan:
        "pan_number",


      mobile:
        "mobile_number",


      email:
        "email",


      dob:
        "date_of_birth",


      gender:
        "gender",


      /*
       * TrackWizz customer creation date.
       */
      createdAt:
        "created_at",


      /*
       * TrackWizz applicationRefNumber.
       */
      applicationRefNumber:
        "partner_application_id",
    },


    /*
     * These columns must exist in
     * pl_partner_applications.
     */
    amlColumns: {

      status:
        "aml_status",

      score:
        "aml_score",

      totalMatches:
        "aml_total_matches",

      reason:
        "aml_reason",

      apiResponse:
        "aml_api_response",

      checkedAt:
        "aml_checked_at",
    },
  },

};


/* =====================================================
   CONFIG HELPERS
===================================================== */

function getPartnerConfig(
  partnerKey
) {
  const cfg =
    PARTNERS[partnerKey];

  if (!cfg) {
    const err =
      new Error(
        `Unknown partner "${partnerKey}". ` +
        `Registered: ${
          Object.keys(
            PARTNERS
          ).join(", ") ||
          "none"
        }`
      );

    err.code =
      "UNKNOWN_PARTNER";

    throw err;
  }

  return cfg;
}


/**
 * SQL table / column names cannot use ? placeholders.
 *
 * Only allow safe identifiers coming
 * from our own PARTNERS registry.
 */
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


/**
 * Determine all DB columns required
 * to construct the canonical lead.
 */
function getSelectColumns(
  cfg
) {
  const wanted = [

    cfg.primaryKey ||
      "id",

    ...cfg.codeFields,

    ...Object.values(
      cfg.columns
    ),

  ];

  /*
   * Remove duplicates.
   */
  return [
    ...new Set(
      wanted
    ),
  ]
    .map(
      quoteIdentifier
    )
    .join(", ");
}


/* =====================================================
   DB ROW -> TRACKWIZZ LEAD
===================================================== */

function mapRowToLead(
  row,
  partnerKey
) {
  if (
    !row ||
    typeof row !==
      "object"
  ) {
    const err =
      new Error(
        `[${partnerKey}] valid database row is required`
      );

    err.code =
      "INVALID_DB_ROW";

    throw err;
  }


  const cfg =
    getPartnerConfig(
      partnerKey
    );


  const col = (
    canonicalField
  ) => {
    const databaseColumn =
      cfg.columns[
        canonicalField
      ];

    return databaseColumn
      ? row[
          databaseColumn
        ]
      : undefined;
  };


  /* ===================================================
     TRACKWIZZ CUSTOMER CODE
  =================================================== */

  const rawCode =
    cfg.codeFields

      .map(
        (
          databaseColumn
        ) =>
          normalizeText(
            row[
              databaseColumn
            ]
          )
      )

      .find(Boolean);


  const fallbackCode =
    row.id
      ? `LEAD${row.id}`
      : "LEAD-UNKNOWN";


  const customerCode =
    `${partnerKey.toUpperCase()}-${
      rawCode ||
      fallbackCode
    }`;


  /* ===================================================
     CANONICAL LEAD
  =================================================== */

  const lead = {

    /*
     * fintreepl
     */
    partner:
      partnerKey,


    /*
     * pl_partner_applications.id
     */
    leadId:
      row[
        cfg.primaryKey ||
          "id"
      ],


    /*
     * IMPORTANT FOR loan_documents.
     *
     * Keep the DB value as-is.
     * Do not convert BIGINT to Number
     * unnecessarily.
     */
    clientId:
      col("clientId") ??
      null,


    /*
     * pl_partner_applications.lan
     */
    lan:
      normalizeText(
        col("lan")
      ),


    /*
     * Example:
     *
     * FINTREEPL-<partner_application_id>
     */
    customerCode,


    /*
     * partner_application_id
     */
    applicationRefNumber:
      normalizeText(
        col(
          "applicationRefNumber"
        )
      ),


    /*
     * customer_full_name
     */
    fullName:
      normalizeText(
        col("name")
      ),


    /*
     * customer_father_name
     */
    fatherName:
      normalizeText(
        col(
          "fatherName"
        )
      ),


    /*
     * pan_number
     */
    pan:
      normalizePan(
        col("pan")
      ),


    /*
     * mobile_number
     */
    mobile:
      normalizeMobile(
        col("mobile")
      ),


    /*
     * email
     */
    email:
      normalizeText(
        col("email")
      ).toLowerCase(),


    /*
     * date_of_birth
     *
     * Converted to DD-MMM-YYYY.
     */
    dob:
      toTwDate(
        col("dob")
      ),


    /*
     * Male   -> 01
     * Female -> 02
     */
    gender:
      mapGender(
        col("gender")
      ),


    /*
     * created_at
     *
     * Keep original value.
     * payloadBuilder will convert it.
     */
    createdAt:
      col("createdAt") ||
      null,
  };


  /* ===================================================
     REQUIRED BUSINESS DATA
  =================================================== */

  if (!lead.lan) {
    const err =
      new Error(
        `[${partnerKey}] LAN is missing`
      );

    err.code =
      "INVALID_LAN";

    err.leadId =
      lead.leadId;

    throw err;
  }


  /*
   * Your PL table makes client_id NOT NULL,
   * and we need it to save AML_REPORT into
   * loan_documents.
   */
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
        `[${partnerKey}] client_id is missing for LAN "${lead.lan}"`
      );

    err.code =
      "CLIENT_ID_MISSING";

    err.leadId =
      lead.leadId;

    err.lan =
      lead.lan;

    throw err;
  }


  /*
   * Don't spend an API call if there is
   * absolutely nothing TrackWizz can screen.
   */
  if (
    !lead.fullName &&
    !lead.pan &&
    !lead.mobile &&
    !lead.email
  ) {
    const err =
      new Error(
        `[${partnerKey}] lead ${lead.leadId}: ` +
        "no screenable identity field after normalization"
      );

    err.code =
      "NO_IDENTITY_FIELD";

    err.leadId =
      lead.leadId;

    err.lan =
      lead.lan;

    throw err;
  }


  return lead;
}


/* =====================================================
   FETCH BY APPLICATION ID
===================================================== */

async function getLeadById(
  partnerKey,
  loanId
) {
  const cfg =
    getPartnerConfig(
      partnerKey
    );


  const selectCols =
    getSelectColumns(
      cfg
    );


  const table =
    quoteIdentifier(
      cfg.table
    );


  const primaryKey =
    quoteIdentifier(
      cfg.primaryKey ||
        "id"
    );


  if (
    loanId === null ||
    loanId === undefined ||
    !/^\d+$/.test(
      String(
        loanId
      )
    )
  ) {
    const err =
      new Error(
        `[${partnerKey}] valid numeric loan ID is required`
      );

    err.code =
      "INVALID_LOAN_ID";

    throw err;
  }


  const [rows] =
    await db.query(
      `
      SELECT
        ${selectCols}

      FROM ${table}

      WHERE ${primaryKey} = ?

      LIMIT 1
      `,
      [
        loanId,
      ]
    );


  if (
    !rows.length
  ) {
    const err =
      new Error(
        `[${partnerKey}] booking ID "${loanId}" not found in ${cfg.table}`
      );

    err.code =
      "LEAD_NOT_FOUND";

    err.loanId =
      loanId;

    throw err;
  }


  return mapRowToLead(
    rows[0],
    partnerKey
  );
}


/* =====================================================
   FETCH BY LAN
===================================================== */

/**
 * This is the main function used by
 * screeningService.js.
 *
 * Example:
 *
 * getLeadByLan(
 *   "fintreepl",
 *   "PL000123"
 * );
 */
async function getLeadByLan(
  partnerKey,
  lan
) {
  const cfg =
    getPartnerConfig(
      partnerKey
    );


  const normalizedLan =
    normalizeText(
      lan
    );


  if (!normalizedLan) {
    const err =
      new Error(
        "LAN is required"
      );

    err.code =
      "INVALID_LAN";

    throw err;
  }


  const lanColumn =
    cfg.columns.lan;


  if (!lanColumn) {
    const err =
      new Error(
        `[${partnerKey}] LAN column is not configured`
      );

    err.code =
      "LAN_COLUMN_NOT_CONFIGURED";

    throw err;
  }


  const selectCols =
    getSelectColumns(
      cfg
    );


  const table =
    quoteIdentifier(
      cfg.table
    );


  const quotedLanColumn =
    quoteIdentifier(
      lanColumn
    );


  /*
   * LIMIT 2 intentionally.
   *
   * If two applications have the same LAN,
   * we should NOT guess which person to screen.
   */
  const [rows] =
    await db.query(
      `
      SELECT
        ${selectCols}

      FROM ${table}

      WHERE ${quotedLanColumn} = ?

      LIMIT 2
      `,
      [
        normalizedLan,
      ]
    );


  if (
    !rows.length
  ) {
    const err =
      new Error(
        `[${partnerKey}] LAN "${normalizedLan}" not found in ${cfg.table}`
      );

    err.code =
      "LEAD_NOT_FOUND";

    err.lan =
      normalizedLan;

    throw err;
  }


  if (
    rows.length > 1
  ) {
    const err =
      new Error(
        `[${partnerKey}] multiple records found for LAN "${normalizedLan}"`
      );

    err.code =
      "DUPLICATE_LAN";

    err.lan =
      normalizedLan;

    throw err;
  }


  return mapRowToLead(
    rows[0],
    partnerKey
  );
}


/* =====================================================
   EXPORTS
===================================================== */

module.exports = {

  getLeadByLan,

  getLeadById,

  mapRowToLead,

  getPartnerConfig,

  getSelectColumns,

  PARTNERS,


  /*
   * Helpers exported for testing.
   */
  mapGender,

  normalizeMobile,

  normalizePan,

  normalizeText,

  toTwDate,
};