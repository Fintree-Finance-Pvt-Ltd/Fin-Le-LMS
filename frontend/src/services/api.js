const API_URL = import.meta.env.VITE_API_URL;

export const apiFetch = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,

    headers: {
      ...(options.body && {
        "Content-Type": "application/json",
      }),
      ...options.headers,
    },

    // Required for your express-session connect.sid cookie
    credentials: "include",
  });

  let data = {};

  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    data = await response.json();
  }

  if (!response.ok) {
    const error = new Error(
      data.message || "Something went wrong"
    );

    error.status = response.status;

    throw error;
  }

  return data;
};