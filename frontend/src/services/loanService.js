const API_URL = import.meta.env.VITE_API_URL;


export const getAllLoans = async ({
  page = 1,
  pageSize = 25,
  search = "",
  sortBy = "created_at",
  sortDir = "desc",
} = {}) => {

  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    search,
    sortBy,
    sortDir,
  });

  const response = await fetch(
    `${API_URL}/loans/all-loans?${params.toString()}`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    }
  );

  const result = await response.json();

  if (!response.ok || !result.success) {

    throw new Error(
      result?.error?.message ||
      result?.message ||
      "Failed to fetch loans"
    );

  }

  return result.data;
};


export const getLoanByLan = async (lan) => {

  if (!lan) {
    throw new Error("LAN is required");
  }

  const response = await fetch(
    `${API_URL}/loans/${lan}`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    }
  );

  const result = await response.json();

  if (!response.ok || !result.success) {

    throw new Error(
      result?.message ||
      "Failed to fetch loan details"
    );

  }

  return result.data;
};


export const getDisbursementDetails = async (lan) => {

  if (!lan) {
    throw new Error("LAN is required");
  }

  const response = await fetch(
    `${API_URL}/disbursal/${lan}`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    }
  );

  const result = await response.json();

  if (!response.ok || !result.success) {

    throw new Error(
      result?.message ||
      "Failed to fetch disbursement details"
    );

  }

  return result;
};


export const getScheduleByLan = async (lan) => {

  const response = await fetch(
    `${API_URL}/schedule/${lan}`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    }
  );

  const result = await response.json();

  if (
    !response.ok ||
    !result.success
  ) {

    throw new Error(
      result.message ||
      "Failed to fetch schedule"
    );

  }

  return result.data;
};


export const getExtraCharges = async (lan) => {

  if (!lan) {
    throw new Error("LAN required");
  }

  const response = await fetch(
    `${API_URL}/extra-charges/${lan}`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    }
  );

  const result = await response.json();

  if (!response.ok || !result.success) {

    throw new Error(
      result.message ||
      "Failed to fetch extra charges"
    );

  }

  return result.data;
};


export const getApprovedLoans = async ({
  page = 1,
  pageSize = 25,
  search = "",
  sortBy = "created_at",
  sortDir = "desc",
} = {}) => {

  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    search,
    sortBy,
    sortDir,
  });

  const response = await fetch(
    `${API_URL}/loans/approved-loans?${params.toString()}`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    }
  );

  const result = await response.json();

  if (!response.ok || !result.success) {

    throw new Error(
      result?.error?.message ||
      result?.message ||
      "Failed to fetch approved loans"
    );

  }

  return result.data;
};

export const getDisbursedLoans = async ({
  page = 1,
  pageSize = 25,
  search = "",
  sortBy = "created_at",
  sortDir = "desc",
} = {}) => {

  const params =
    new URLSearchParams({

      page:
        String(page),

      pageSize:
        String(pageSize),

      search,

      sortBy,

      sortDir,

    });


  const response =
    await fetch(
      `${API_URL}/loans/disbursed-loans?${params.toString()}`,
      {
        method: "GET",

        credentials: "include",

        headers: {
          Accept: "application/json",
        },
      }
    );


  const result =
    await response.json();


  if (
    !response.ok ||
    !result.success
  ) {

    throw new Error(
      result?.error?.message ||
      result?.message ||
      "Failed to fetch disbursed loans"
    );

  }


  return result.data;

};