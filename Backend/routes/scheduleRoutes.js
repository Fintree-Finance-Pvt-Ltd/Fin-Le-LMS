const express = require("express");

const router = express.Router();

const {
    getPersonalLoanSchedule
} = require("../modules/Partners/services/plPartnerService");



router.get("/:lan", async (req, res) => {


    try {


        const data =
            await getPersonalLoanSchedule(
                req.params.lan
            );



        return res.status(200).json({

            success: true,

            data

        });


    }
    catch (error) {


        console.error(
            "Schedule error:",
            error
        );


        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
module.exports = router;