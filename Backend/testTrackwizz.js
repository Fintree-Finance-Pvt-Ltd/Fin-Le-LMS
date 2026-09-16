const {
    screenLoanBooking
} = require("./services/trackwizz/screeningService");

const run = async () => {
    try {
        const lan = "FTPL00000026";

        console.log("Starting TrackWizz test for:", lan);

        const result = await screenLoanBooking(
            "fintreepl",
            lan,
            {
                force: true
            }
        );

        console.log(
            "TrackWizz Result:",
            JSON.stringify(result, null, 2)
        );

        process.exit(0);

    } catch (error) {

        console.error(
            "TrackWizz Test Failed:",
            {
                code: error.code,
                message: error.message,
                stack: error.stack
            }
        );

        process.exit(1);
    }
};

run();