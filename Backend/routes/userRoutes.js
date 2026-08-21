const express = require("express");

const requireAuth = require("../middleware/authMiddleware");
const requirePermission = require("../middleware/permissionMiddleware");

const {
  getUserDashboard,
} = require("../controllers/userController");

const router = express.Router();


// ======================================================
// USER DASHBOARD
// ======================================================

router.get(
  "/dashboard",
  requireAuth,
  requirePermission("user.dashboard"),
  getUserDashboard
);


module.exports = router;