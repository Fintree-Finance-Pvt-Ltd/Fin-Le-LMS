const express = require("express");

const requireAuth =
  require("../middleware/authMiddleware");

const requirePermission =
  require("../middleware/permissionMiddleware");

const {
  getOperationsDashboard,
} = require("../controllers/operationsController");

const router = express.Router();

router.get(
  "/dashboard",
  requireAuth,
  requirePermission(
    "operations.dashboard"
  ),
  getOperationsDashboard
);

module.exports = router;