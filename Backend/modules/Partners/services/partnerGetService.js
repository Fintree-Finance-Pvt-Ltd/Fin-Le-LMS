const db = require("../../../config/db");
const {
  queryDB,
} = require("../utils/partnerUtils");

async function getAllPersonalLoans({
  page = 1,
  pageSize = 25,
  search = "",
  sortBy = "created_at",
  sortDir = "desc",
} = {}) {

  /*
  |--------------------------------------------------------------------------
  | PAGINATION
  |--------------------------------------------------------------------------
  */

  page = Number.parseInt(page, 10);
  pageSize = Number.parseInt(pageSize, 10);

  if (!Number.isInteger(page) || page < 1) {
    page = 1;
  }

  if (!Number.isInteger(pageSize) || pageSize < 1) {
    pageSize = 25;
  }

  pageSize = Math.min(pageSize, 100);

  const offset =
    (page - 1) * pageSize;


  /*
  |--------------------------------------------------------------------------
  | SAFE SORTING
  |--------------------------------------------------------------------------
  */

  const SORT_COLUMNS = {
    created_at: "pa.created_at",
    updated_at: "pa.updated_at",
    customer_name: "pa.customer_full_name",
    lan: "pa.lan",
    partner_loan_id: "pa.partner_application_id",
    loan_amount: "pa.requested_amount",
    disbursal_amount: "pa.bre_approved_loan_amount",
    disbursement_date: "d.Disbursement_Date",
    status: "pa.status",
    bre_status: "pa.bre_status",
  };

  const sortColumn =
    SORT_COLUMNS[sortBy] ||
    SORT_COLUMNS.created_at;

  const direction =
    String(sortDir).toLowerCase() === "asc"
      ? "ASC"
      : "DESC";


  /*
  |--------------------------------------------------------------------------
  | FILTERS
  |--------------------------------------------------------------------------
  */

  let whereSql = `
    WHERE pa.product_code = ?
  `;

  const filterParams = [
    "FFPL10011",
  ];

  const cleanSearch =
    String(search || "").trim();

  if (cleanSearch) {
    const likeSearch =
      `%${cleanSearch}%`;

    whereSql += `
      AND (
        pa.lan LIKE ?
        OR pa.partner_application_id LIKE ?
        OR pa.partner_application_number LIKE ?
        OR pa.customer_full_name LIKE ?
        OR pa.mobile_number LIKE ?
        OR pa.status LIKE ?
        OR pa.bre_status LIKE ?
      )
    `;

    filterParams.push(
      likeSearch,
      likeSearch,
      likeSearch,
      likeSearch,
      likeSearch,
      likeSearch,
      likeSearch,
    );
  }


  /*
  |--------------------------------------------------------------------------
  | TOTAL COUNT
  |--------------------------------------------------------------------------
  */

  const countSql = `
    SELECT
      COUNT(*) AS total

    FROM pl_partner_applications pa

    LEFT JOIN ev_disbursement_utr d
      ON d.lan = pa.lan

    ${whereSql}
  `;

  const countRows =
    await queryDB(
      countSql,
      filterParams
    );

  const total =
    Number(
      countRows[0]?.total || 0
    );


  /*
  |--------------------------------------------------------------------------
  | FETCH LOANS
  |--------------------------------------------------------------------------
  */

  const loansSql = `
    SELECT

      pa.id,

      pa.partner_application_id,
      pa.partner_application_number,
      pa.external_application_reference,

      pa.lan,

      pa.customer_full_name,
      pa.mobile_number,
      pa.email,

      pa.requested_amount,
      pa.bre_approved_loan_amount,

      d.Disbursement_Date
        AS disbursement_date,

      pa.requested_tenure,
      pa.tenure_type,
      pa.interest_rate,
      pa.processing_fee,

      pa.status,

      pa.employment_employment_type,
      pa.employment_company_name,
      pa.employment_monthly_income,

      pa.bre_status,
      pa.bre_reason,
      pa.bre_final_status,

      pa.created_at,
      pa.updated_at

    FROM pl_partner_applications pa

    LEFT JOIN ev_disbursement_utr d
      ON d.lan = pa.lan

    ${whereSql}

    ORDER BY ${sortColumn} ${direction}

    LIMIT ?
    OFFSET ?
  `;

  const rows =
    await queryDB(
      loansSql,
      [
        ...filterParams,
        pageSize,
        offset,
      ]
    );


  /*
  |--------------------------------------------------------------------------
  | FRONTEND RESPONSE MAPPING
  |--------------------------------------------------------------------------
  */

  const loans =
    rows.map((row) => ({
      id: row.id,

      lan:
        row.lan,

      partner_loan_id:
        row.partner_application_id,

      partner_application_number:
        row.partner_application_number,

      external_application_reference:
        row.external_application_reference,

      product:
        "Personal Loan",

      customer_name:
        row.customer_full_name,

      mobile:
        row.mobile_number,

      email:
        row.email,

      loan_amount:
        row.requested_amount,

      disbursal_amount:
        row.bre_approved_loan_amount,

      disbursement_date:
        row.disbursement_date,

      tenure:
        row.requested_tenure,

      tenure_type:
        row.tenure_type,

      interest_rate:
        row.interest_rate,

      processing_fee:
        row.processing_fee,

      status:
        row.status,

      employment_type:
        row.employment_employment_type,

      company_name:
        row.employment_company_name,

      monthly_income:
        row.employment_monthly_income,

      bre_status:
        row.bre_status,

      bre_reason:
        row.bre_reason,

      bre_approved_loan_amount:
        row.bre_approved_loan_amount,

      bre_final_status:
        row.bre_final_status,

      created_at:
        row.created_at,

      updated_at:
        row.updated_at,
    }));


  return {
    rows: loans,

    pagination: {
      page,
      pageSize,
      total,

      totalPages:
        Math.ceil(
          total / pageSize
        ),
    },
  };
}

async function getPersonalLoanByLan(lan) {

  const sql = `
    SELECT
      pa.*,
      d.Disbursement_UTR,
      d.Disbursement_Date,
      d.utr
    FROM pl_partner_applications pa
    LEFT JOIN ev_disbursement_utr d
      ON d.lan = pa.lan
    WHERE pa.lan = ?
    LIMIT 1
  `;

  const rows = await queryDB(
    sql,
    [lan]
  );

  return rows[0] || null;
}

async function getDisbursementByLan(lan) {
  const sql = `

 SELECT

 pa.lan,

 pa.partner_application_id,

 pa.customer_full_name,

 pa.requested_amount,

 pa.bre_approved_loan_amount,

 pa.interest_rate,

 pa.processing_fee,

 pa.requested_tenure,

 d.Disbursement_UTR,

 d.Disbursement_Date


 FROM pl_partner_applications pa


 LEFT JOIN ev_disbursement_utr d

 ON d.lan = pa.lan


 WHERE pa.lan = ?

 `;


  const rows =
    await queryDB(
      sql,
      [lan]
    );


  if (!rows.length) {

    throw new Error(
      "Disbursement details not found"
    );

  }


  return rows[0];

}

async function getPersonalLoanSchedule(lan) {

  const sql = `
SELECT
id,
lan,
due_date,
status,
emi,
principal,
interest,
opening,
closing,
remaining_emi,
remaining_interest,
remaining_principal,
payment_date,
dpd,
remaining_amount,
extra_paid
FROM manual_rps_fintree_personal_loan
WHERE lan = ?

ORDER BY due_date ASC
`;

  const rows =
    await queryDB(
      sql,
      [lan]
    );

  if (!rows.length) {

    throw new Error(
      "Repayment schedule not found"
    );

  }

  return rows;

}

async function getExtraChargesByLan(lan) {

  const sql = `
SELECT
id,
emi_id,
lan,
charge_date,
due_date,
amount,
paid_amount,
waived_amount,
waived_off,
paid_status,
payment_time,
charge_type,
created_at,
remarks

FROM loan_charges

WHERE lan = ?

ORDER BY created_at ASC

`;



  const rows =
    await queryDB(
      sql,
      [lan]
    );

  return rows;

}

async function getApprovedLoans({
  page = 1,
  pageSize = 25,
  search = "",
  sortBy = "created_at",
  sortDir = "desc",
}) {

  const limit = Math.min(
    100,
    Math.max(1, Number(pageSize))
  );

  const offset =
    (Number(page) - 1) * limit;


  const allowedSort = [
    "created_at",
    "lan",
    "customer_full_name",
    "requested_amount",
    "bre_approved_loan_amount"
  ];


  const sortColumn =
    allowedSort.includes(sortBy)
      ? sortBy
      : "created_at";


  const direction =
    sortDir.toLowerCase() === "asc"
      ? "ASC"
      : "DESC";


  const searchCondition = search
    ? `
      AND (
        lan LIKE ?
        OR customer_full_name LIKE ?
        OR mobile_number LIKE ?
      )
    `
    : "";


  const searchParams = search
    ? [
      `%${search}%`,
      `%${search}%`,
      `%${search}%`
    ]
    : [];


  const dataQuery = `
    SELECT
      id,
      lan,
      customer_full_name,
      partner_application_number,
      mobile_number,
      email,
      requested_amount,
      bre_approved_loan_amount,
      bre_final_status,
      created_at

    FROM pl_partner_applications

    WHERE bre_final_status = 'APPROVED'

    ${searchCondition}

    ORDER BY ${sortColumn} ${direction}

    LIMIT ?
    OFFSET ?
  `;


  const countQuery = `
    SELECT COUNT(*) AS total

    FROM pl_partner_applications

    WHERE bre_final_status = 'APPROVED'

    ${searchCondition}
  `;



  const [rows] =
    await db.query(
      dataQuery,
      [
        ...searchParams,
        limit,
        offset
      ]
    );


  const [[countResult]] =
    await db.query(
      countQuery,
      searchParams
    );


  return {

    rows,

    pagination: {
      page: Number(page),
      pageSize: limit,
      total: Number(
        countResult.total || 0
      ),
      totalPages: Math.ceil(
        countResult.total / limit
      )
    }

  };

}

const getDisbursedLoans = async ({
  page = 1,
  pageSize = 25,
  search = "",
  sortBy = "created_at",
  sortDir = "desc",
} = {}) => {

  const pg =
    Math.max(
      1,
      parseInt(page, 10) || 1
    );


  const limit =
    Math.min(
      100,
      Math.max(
        1,
        parseInt(pageSize, 10) || 25
      )
    );


  const offset =
    (pg - 1) * limit;


  const safeSortDir =
    String(sortDir).toLowerCase() === "asc"
      ? "ASC"
      : "DESC";


  const allowedSort = [
    "created_at",
    "updated_at",
    "lan",
    "customer_full_name",
    "mobile_number",
    "external_application_reference",
    "bre_approved_loan_amount",
    "status",
  ];


  const sortColumn =
    allowedSort.includes(sortBy)
      ? sortBy
      : "created_at";


  const cleanSearch =
    String(search || "").trim();


  const searchClause =
    cleanSearch
      ? `
        AND (
          pa.lan LIKE ?
          OR pa.customer_full_name LIKE ?
          OR pa.mobile_number LIKE ?
          OR pa.external_application_reference LIKE ?
        )
      `
      : "";


  const searchParams =
    cleanSearch
      ? [
        `%${cleanSearch}%`,
        `%${cleanSearch}%`,
        `%${cleanSearch}%`,
        `%${cleanSearch}%`,
      ]
      : [];


  const countSql = `
    SELECT
      COUNT(*) AS total

    FROM pl_partner_applications pa

    WHERE pa.status = 'DISBURSED'

    ${searchClause}
  `;


  const dataSql = `
    SELECT

      pa.id,
      pa.partner_application_id,
      pa.partner_application_number,
      pa.external_application_reference,

      pa.lan,

      pa.customer_full_name,
      pa.mobile_number,

      pa.bre_approved_loan_amount,

      pa.status,

      pa.created_at,
      pa.updated_at

    FROM pl_partner_applications pa

    WHERE pa.status = 'DISBURSED'

    ${searchClause}

    ORDER BY pa.${sortColumn} ${safeSortDir}

    LIMIT ? OFFSET ?
  `;


  const [
    [countRows],
    [rows],
  ] = await Promise.all([

    db.query(
      countSql,
      searchParams
    ),

    db.query(
      dataSql,
      [
        ...searchParams,
        limit,
        offset,
      ]
    ),

  ]);


  const total =
    Number(
      countRows[0]?.total || 0
    );


  return {

    rows,

    pagination: {

      page: pg,

      pageSize: limit,

      total,

      totalPages:
        Math.max(
          1,
          Math.ceil(total / limit)
        ),

    },

  };

};

/*
|--------------------------------------------------------------------------
| CUSTOMER DETAILS
|--------------------------------------------------------------------------
*/

async function getCustomerDetailsByLan(lan) {

  lan = String(lan || "")
    .trim()
    .toUpperCase();

  const [rows] = await db.query(
    `
    SELECT
      p.lan,

      p.partner_application_id,
      p.partner_application_number,

      p.customer_full_name,
      p.customer_first_name,
      p.customer_middle_name,
      p.customer_last_name,
      p.customer_father_name,

      p.pan_number,
      p.date_of_birth,
      p.gender,
      p.mobile_number,
      p.email,

      p.employment_employment_type,
      p.employment_company_name,
      p.employment_designation,
      p.employment_monthly_income,

      p.requested_amount,
      p.requested_tenure,
      p.tenure_type,
      p.interest_rate,
      p.processing_fee,

      p.selected_offer_amount,
      p.selected_offer_tenure,

      p.perm_address_line1,
      p.perm_address_line2,
      p.perm_city,
      p.perm_district,
      p.perm_state,
      p.perm_pincode,

      p.bank_account_holder_name,
      p.bank_account_number,
      p.bank_ifsc_code,
      p.bank_name,
      p.bank_account_type,

      p.status,

      p.bre_policy_version,
      p.bre_decision_stage,
      p.bre_status,
      p.bre_reason,
      p.bre_credit_limit,
      p.bre_approved_loan_amount,
      p.bre_gross_approved_amount,
      p.bre_checked_at,
      p.bre_final_status,
      p.bre_final_reason,

      b.bureau_status,
      b.bureau_api_response,
      b.updated_at AS bureau_checked_at

    FROM pl_partner_applications p

    LEFT JOIN personal_loan_bureau_verification_status b
      ON b.id = (
        SELECT b2.id
        FROM personal_loan_bureau_verification_status b2
        WHERE UPPER(b2.lan) = UPPER(p.lan)
        ORDER BY b2.id DESC
        LIMIT 1
      )

    WHERE UPPER(p.lan) = ?

    LIMIT 1
    `,
    [lan]
  );


  if (!rows.length) {
    return null;
  }


  const row = rows[0];


  // =====================================================
  // EXTRACT BUREAU / CIBIL SCORE
  // =====================================================

  let bureauScore = null;

  if (row.bureau_api_response) {

    const bureauResponse =
      String(row.bureau_api_response).trim();


    // ---------------------------------------------
    // 1. Dummy / JSON response
    // ---------------------------------------------

    try {

      const parsed =
        JSON.parse(bureauResponse);

      bureauScore =
        parsed.score ??
        parsed.cibilScore ??
        parsed.bureauScore ??
        null;

    } catch (error) {

      // ---------------------------------------------
      // 2. Actual Experian XML response
      // ---------------------------------------------

      const scoreMatch =
        bureauResponse.match(
          /<BureauScore>\s*(\d+)\s*<\/BureauScore>/i
        );

      if (scoreMatch) {

        bureauScore =
          Number(scoreMatch[1]);

      }

    }

  }


  // =====================================================
  // RESPONSE
  // =====================================================

  return {

    applicant: {

      lan:
        row.lan,

      partnerApplicationId:
        row.partner_application_id,

      partnerApplicationNumber:
        row.partner_application_number,

      fullName:
        row.customer_full_name,

      firstName:
        row.customer_first_name,

      middleName:
        row.customer_middle_name,

      lastName:
        row.customer_last_name,

      fatherName:
        row.customer_father_name,

      pan:
        row.pan_number,

      dob:
        row.date_of_birth,

      gender:
        row.gender,

      mobile:
        row.mobile_number,

      email:
        row.email

    },


    employment: {

      type:
        row.employment_employment_type,

      company:
        row.employment_company_name,

      designation:
        row.employment_designation,

      monthlyIncome:
        row.employment_monthly_income

    },


    loanFinancial: {

      requestedAmount:
        row.requested_amount,

      requestedTenure:
        row.requested_tenure,

      tenureType:
        row.tenure_type,

      interestRate:
        row.interest_rate,

      processingFee:
        row.processing_fee,

      selectedOfferAmount:
        row.selected_offer_amount,

      selectedOfferTenure:
        row.selected_offer_tenure

    },


    address: {

      line1:
        row.perm_address_line1,

      line2:
        row.perm_address_line2,

      city:
        row.perm_city,

      district:
        row.perm_district,

      state:
        row.perm_state,

      pincode:
        row.perm_pincode

    },


    bank: {

      accountHolder:
        row.bank_account_holder_name,

      accountNumber:
        row.bank_account_number,

      ifsc:
        row.bank_ifsc_code,

      bankName:
        row.bank_name,

      accountType:
        row.bank_account_type

    },


    // =====================================================
    // BRE
    // =====================================================

    bre: {

      policyVersion:
        row.bre_policy_version,

      decisionStage:
        row.bre_decision_stage,

      status:
        row.bre_status,

      reason:
        row.bre_reason,

      creditLimit:
        row.bre_credit_limit,

      approvedAmount:
        row.bre_approved_loan_amount,

      grossApprovedAmount:
        row.bre_gross_approved_amount,

      checkedAt:
        row.bre_checked_at,

      finalStatus:
        row.bre_final_status,

      finalReason:
        row.bre_final_reason

    },


    // =====================================================
    // BUREAU / CIBIL
    // =====================================================

    bureau: {

      status:
        row.bureau_status,

      score:
        bureauScore,

      checkedAt:
        row.bureau_checked_at

    },


    loanStatus:
      row.status

  };

}

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = {
  getAllPersonalLoans,
  getPersonalLoanByLan,
  getDisbursementByLan,
  getPersonalLoanSchedule,
  getExtraChargesByLan,
  getApprovedLoans,
  getDisbursedLoans,
  getCustomerDetailsByLan,
};

