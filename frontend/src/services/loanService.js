import { apiFetch } from "./api";


// ======================================================
// PORTFOLIO SUMMARY
// ======================================================

export const getPortfolioSummary = async () => {

  const result =
    await apiFetch(
      "/loans/portfolio-summary"
    );


  return result.data;

};



// ======================================================
// ALL LOANS
// ======================================================

export const getAllLoans = async ({
  page = 1,
  pageSize = 25,
  search = "",
  sortBy = "created_at",
  sortDir = "desc",
} = {}) => {


  const params =
    new URLSearchParams({

      page: String(page),

      pageSize: String(pageSize),

      search,

      sortBy,

      sortDir,

    });



  const result =
    await apiFetch(
      `/loans/all-loans?${params.toString()}`
    );


  return result.data;

};



// ======================================================
// LOAN DETAILS BY LAN
// ======================================================

export const getLoanByLan = async (
  lan
) => {


  if (!lan) {

    throw new Error(
      "LAN is required"
    );

  }


  const result =
    await apiFetch(
      `/loans/${lan}`
    );


  return result.data;

};



// ======================================================
// DISBURSEMENT DETAILS
// ======================================================

export const getDisbursementDetails = async (
  lan
) => {


  if (!lan) {

    throw new Error(
      "LAN is required"
    );

  }


  return await apiFetch(
    `/disbursal/${lan}`
  );

};



// ======================================================
// REPAYMENT SCHEDULE
// ======================================================

export const getScheduleByLan = async (
  lan
) => {


  const result =
    await apiFetch(
      `/schedule/${lan}`
    );


  return result.data;

};



// ======================================================
// EXTRA CHARGES
// ======================================================

export const getExtraCharges = async (
  lan
) => {


  if (!lan) {

    throw new Error(
      "LAN required"
    );

  }



  const result =
    await apiFetch(
      `/extra-charges/${lan}`
    );


  return result.data;

};



// ======================================================
// APPROVED LOANS
// ======================================================

export const getApprovedLoans = async ({
  page = 1,
  pageSize = 25,
  search = "",
  sortBy = "created_at",
  sortDir = "desc",
} = {}) => {


  const params =
    new URLSearchParams({

      page: String(page),

      pageSize: String(pageSize),

      search,

      sortBy,

      sortDir,

    });



  const result =
    await apiFetch(
      `/loans/approved-loans?${params.toString()}`
    );



  return result.data;

};



// ======================================================
// DISBURSED LOANS
// ======================================================

export const getDisbursedLoans = async ({
  page = 1,
  pageSize = 25,
  search = "",
  sortBy = "created_at",
  sortDir = "desc",
} = {}) => {


  const params =
    new URLSearchParams({

      page: String(page),

      pageSize: String(pageSize),

      search,

      sortBy,

      sortDir,

    });



  const result =
    await apiFetch(
      `/loans/disbursed-loans?${params.toString()}`
    );


  return result.data;

};