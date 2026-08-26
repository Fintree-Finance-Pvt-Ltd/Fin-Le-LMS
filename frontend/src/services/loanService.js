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