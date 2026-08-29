const express=require("express");

const router=express.Router();

const service=require("../modules/Partners/services/plPartnerService");


router.get("/:lan",async(req,res)=>{
try{
const data =
await service.getExtraChargesByLan(
req.params.lan
);

return res.json({

success:true,
data

});


}
catch(error){

console.log(error);


return res.status(500).json({

success:false,
message:error.message

});

}

});

module.exports=router;