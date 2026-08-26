const express = require("express");

const requireAuth =
  require("../middleware/authMiddleware");

const service =
  require("../modules/Partners/services/plPartnerService");

const router = express.Router();


router.get(
  "/all-loans",
  requireAuth,
  async (req, res) => {
    try {
      const data =
        await service.getAllPersonalLoans({
          page: req.query.page,
          pageSize: req.query.pageSize,
          search: req.query.search,
          sortBy: req.query.sortBy,
          sortDir: req.query.sortDir,
        });

      return res.status(200).json({
        success: true,
        data,
      });

    } catch (error) {
      console.error(
        "All loans error:",
        error
      );

      return res.status(500).json({
        success: false,
        error: {
          message:
            error.message ||
            "Failed to fetch loans",
        },
      });
    }
  }
);


module.exports = router;