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

  {
    code: "loans.all",
    name: "All Loans",
    description: "Access All Loans",
    route: "/all-loans",
  },

  {
    code: "loans.approved",
    name: "Approved Loans",
    description: "Access Approved Loans",
    route: "/approved-loans",
  },

  {
    code: "loans.disbursed",
    name: "Disbursed Loans",
    description: "Access Disbursed Loans",
    route: "/disbursed-loans",
  },

  {
    code: "reports.mis",
    name: "MIS Reports",
    description: "Access MIS Reports",
    route: "/mis-reports/listing",
  },
]);

module.exports = PERMISSIONS;