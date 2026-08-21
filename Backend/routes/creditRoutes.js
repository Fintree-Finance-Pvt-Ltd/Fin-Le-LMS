const express = require("express");

const requireAuth = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const requirePermission =
  require("../middleware/permissionMiddleware");
const ROLES = require("../constants/roles");

const {
  getCreditDashboard,
} = require("../controllers/creditController");

const router = express.Router();

router.get(
  "/dashboard",
  requireAuth,
  requirePermission(
    "credit.dashboard"
  ),
  getCreditDashboard
);
module.exports = router;