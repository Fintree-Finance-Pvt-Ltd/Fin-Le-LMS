const express = require("express");

const requireAuth =
  require("../middleware/authMiddleware");

const service =
  require("../modules/Partners/services/plPartnerService");

const router = express.Router();


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

router.get(
  "/approved-loans",
  requireAuth,
  async (req, res) => {

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
        success:true,
        data,
      });


    } catch(error){

      console.error(
        "Approved loans error:",
        error
      );


      return res.status(500).json({
        success:false,
        message:error.message
      });

    }

  }
);

router.get(
  "/disbursed-loans",
  requireAuth,
  async (req, res) => {

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

router.get("/:lan",requireAuth,async (req,res)=>{
    try {
      const data =
        await service.getPersonalLoanByLan(
          req.params.lan
        );
      if(!data){
        return res.status(404).json({
          success:false,
          message:"Loan not found"
        });
      }
      return res.status(200).json({
        success:true,
        data,
      });
    } catch(error){

      console.error(
        "Loan details error:",
        error
      );
      return res.status(500).json({
        success:false,
        message:error.message
      });

    }
  }
);



module.exports = router;