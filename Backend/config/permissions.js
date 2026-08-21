const PERMISSIONS = Object.freeze([
  {
    code: "admin.dashboard",
    name: "Admin Dashboard",
    description: "Access Admin Dashboard",
    route: "/admin/dashboard",
  },

  {
    code: "operations.dashboard",
    name: "Operations Dashboard",
    description: "Access Operations Dashboard",
    route: "/operations/dashboard",
  },

  {
    code: "credit.dashboard",
    name: "Credit Dashboard",
    description: "Access Credit Dashboard",
    route: "/credit/dashboard",
  },

  {
    code: "user.dashboard",
    name: "User Dashboard",
    description: "Access User Dashboard",
    route: "/user/dashboard",
  },
]);

module.exports = PERMISSIONS;