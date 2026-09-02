const { runPLBRE } = require("../services/plRunBRE");

const runPLBREController = async (req, res) => {
    try {
        const { lan } = req.params;
        if (!lan) {
            return res.status(400).json({
                success: false,
                message: "LAN is required"
            });
        }
        const result =
            await runPLBRE(lan);
        return res.json(result);
    }
    catch (error) {
        console.error(
            "PL BRE Controller Error",
            error
        );
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
module.exports = { 
    runPLBREController
};