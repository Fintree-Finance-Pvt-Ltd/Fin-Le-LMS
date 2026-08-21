export const ROLES = Object.freeze({
  ADMIN: "admin",
  USER: "user",
  OPERATIONS: "operations",
  CREDIT: "credit",
});

export const ROLE_HOME = Object.freeze({
  [ROLES.ADMIN]: "/admin/dashboard",
  [ROLES.USER]: "/user/dashboard",
  [ROLES.OPERATIONS]: "/operations/dashboard",
  [ROLES.CREDIT]: "/credit/dashboard",
});