import { apiFetch } from "./api";

export const adminService = {
  // ====================================================
  // USERS
  // ====================================================

  getUsers: () => {
    return apiFetch("/admin/users");
  },

  createUser: (data) => {
    return apiFetch("/admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateUser: (userId, data) => {
    return apiFetch(
      `/admin/users/${userId}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
  },

  // ====================================================
  // ROLES
  // ====================================================

  getRoles: () => {
    return apiFetch("/admin/roles");
  },

  // ====================================================
  // PERMISSIONS
  // ====================================================

  getPermissions: () => {
    return apiFetch(
      "/admin/permissions"
    );
  },

  getUserPermissions: (userId) => {
    return apiFetch(
      `/admin/users/${userId}/permissions`
    );
  },

  updateUserPermissions: (
    userId,
    permissionIds
  ) => {
    return apiFetch(
      `/admin/users/${userId}/permissions`,
      {
        method: "PUT",

        body: JSON.stringify({
          permission_ids:
            permissionIds,
        }),
      }
    );
  },
};