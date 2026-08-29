const express = require("express");
const router = express.Router();

const { getDisbursementByLan } = require("../modules/Partners/services/plPartnerService");

router.get("/:lan", async(req,res)=>{
 try{
    const data =
      await getDisbursementByLan(
        req.params.lan
      );
    return res.status(200).json({
      success:true,
      data
    });
 }catch(error){
    console.error(
      "Disbursement error:",
      error
    );
    return res.status(500).json({
      success:false,
      message:error.message
    });
 }
});
module.exports = router;