const express = require("express");

const router = express.Router();

const { generatePLWelcomeLetter } = require("../services/plWelcomeLetterService");

router.get("/generate/:lan", async (req, res) => {

    try {

        const lan = req.params.lan;

        const pdf = await generatePLWelcomeLetter(lan);

        res.setHeader("Content-Type", "application/pdf");

        res.setHeader("Content-Disposition", `attachment; filename=welcome_letter_${lan}.pdf`);

        res.send(pdf);

    }
    catch (error) {

        console.log("Welcome Letter Error:", error);

        res.status(500).json({

            success: false,

            message: error.message

        });


    }


}

);



module.exports = router;