import { apiFetch } from "./api";

export const dashboardService = {
  getAdminDashboard: () => {
    return apiFetch("/admin/dashboard");
  },

  getOperationsDashboard: () => {
    return apiFetch("/operations/dashboard");
  },

  getCreditDashboard: () => {
    return apiFetch("/credit/dashboard");
  },

  getUserDashboard: () => {
    return apiFetch("/user/dashboard");
  },
};