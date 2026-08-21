import { apiFetch } from "./api";

export const authService = {
  login: (credentials) => {
    return apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify(
        credentials
      ),
    });
  },

  getMe: () => {
    return apiFetch("/auth/me");
  },

  logout: () => {
    return apiFetch("/auth/logout", {
      method: "POST",
    });
  },
};