const express = require("express");

const requireAuth =
  require("../middleware/authMiddleware");

const service =
  require("../modules/Partners/services/plPartnerService");

const router = express.Router();

console.log("✅ loanRoutes.js loaded");

router.get("/customer-details/:lan", requireAuth, async (req, res) => {
  try {
    const data =
      await service.getCustomerDetailsByLan(
        req.params.lan
      );
    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Customer details not found"
      });
    }
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {

    console.error(
      "Customer details error:",
      error
    );
    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch customer details"
    });

  }

}
);

router.get(
  "/portfolio-summary",
  requireAuth,
  async (req, res) => {
    try {
      const data =
        await service.getPortfolioSummary();

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error(
        "Portfolio summary error:",
        error,
      );

      return res.status(500).json({
        success: false,
        error: {
          message:
            error.message ||
            "Failed to load portfolio summary",
        },
      });
    }
  },
);

router.get("/all-loans", requireAuth, async (req, res) => {
  try {
    console.log("✅ ALL LOANS ROUTE REACHED");
    console.log("Logged in user:", req.session.userId);
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

router.get("/approved-loans", requireAuth, async (req, res) => {

  try {

    const data =
      await service.getApprovedLoans({
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
      "Approved loans error:",
      error
    );


    return res.status(500).json({
      success: false,
      message: error.message
    });

  }

}
);

router.get("/disbursed-loans", requireAuth, async (req, res) => {

  try {

    const data =
      await service.getDisbursedLoans({
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
      "Disbursed loans error:",
      error
    );


    return res.status(500).json({
      success: false,
      error: {
        message:
          error.message ||
          "Failed to fetch disbursed loans",
      },
    });

  }

}
);

router.get("/:lan", requireAuth, async (req, res) => {
  try {
    const data =
      await service.getPersonalLoanByLan(
        req.params.lan
      );
    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Loan not found"
      });
    }
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {

    console.error(
      "Loan details error:",
      error
    );
    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
}
);

/*
|--------------------------------------------------------------------------
| REJECT LOAN & NOTIFY LOS
|--------------------------------------------------------------------------
| Allows LMS (Credit / Ops / Admin) to reject an application and trigger
| the outbound rejection webhook to LOS so LOS updates on their end.
|--------------------------------------------------------------------------
*/
router.post("/:lan/reject", requireAuth, async (req, res) => {
  try {
    const lan = req.params.lan;
    const { rejectReason, reason, stage } = req.body || {};
    const effectiveReason =
      rejectReason || reason || "Rejected by LMS Credit/Operations Team";
    const rejectedBy =
      req.session?.user?.email || req.session?.userId || "LMS User";

    const result = await service.rejectLoanByLan({
      lan,
      rejectReason: effectiveReason,
      stage: stage || "LMS_REJECTED",
      rejectedBy,
      correlationId: req.headers["x-correlation-id"],
    });

    return res.status(200).json({
      success: true,
      message: "Loan application rejected and LOS notified successfully",
      data: result,
    });
  } catch (error) {
    console.error("Reject loan error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to reject loan application",
    });
  }
});

router.post("/reject", requireAuth, async (req, res) => {
  try {
    const { lan, rejectReason, reason, stage } = req.body || {};
    if (!lan) {
      return res.status(400).json({
        success: false,
        message: "lan is required",
      });
    }

    const effectiveReason =
      rejectReason || reason || "Rejected by LMS Credit/Operations Team";
    const rejectedBy =
      req.session?.user?.email || req.session?.userId || "LMS User";

    const result = await service.rejectLoanByLan({
      lan,
      rejectReason: effectiveReason,
      stage: stage || "LMS_REJECTED",
      rejectedBy,
      correlationId: req.headers["x-correlation-id"],
    });

    return res.status(200).json({
      success: true,
      message: "Loan application rejected and LOS notified successfully",
      data: result,
    });
  } catch (error) {
    console.error("Reject loan error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to reject loan application",
    });
  }
});

module.exports = router;