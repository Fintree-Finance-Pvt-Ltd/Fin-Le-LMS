const express = require("express");

const requireAuth = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const requirePermission = require("../middleware/permissionMiddleware");

const ROLES = require("../constants/roles");

const {
  getAdminDashboard,
  createUser,
  getRoles,
  getUsers,
  getPermissions,
  getUserPermissions,
  updateUserPermissions,
} = require("../controllers/adminController");

const router = express.Router();


// ======================================================
// ADMIN DASHBOARD
// ======================================================

router.get(
  "/dashboard",
  requireAuth,
  requirePermission("admin.dashboard"),
  getAdminDashboard
);


// ======================================================
// USERS
// ======================================================

// Get all users
router.get(
  "/users",
  requireAuth,
  allowRoles(ROLES.ADMIN),
  getUsers
);


// Create new user
router.post(
  "/users",
  requireAuth,
  allowRoles(ROLES.ADMIN),
  createUser
);


// ======================================================
// ROLES
// ======================================================

// Get active roles
router.get(
  "/roles",
  requireAuth,
  allowRoles(ROLES.ADMIN),
  getRoles
);


// ======================================================
// PERMISSIONS
// ======================================================

// Get all permissions
router.get(
  "/permissions",
  requireAuth,
  allowRoles(ROLES.ADMIN),
  getPermissions
);


// Get permissions for one user
router.get(
  "/users/:id/permissions",
  requireAuth,
  allowRoles(ROLES.ADMIN),
  getUserPermissions
);


// Update permissions for one user
router.put(
  "/users/:id/permissions",
  requireAuth,
  allowRoles(ROLES.ADMIN),
  updateUserPermissions
);


module.exports = router;