const db = require("../../../config/db");
const { runBureau } = require("./bureauService");
const {
    parseBureauReport,
    calculateAge,
    validateLoanAmount
} = require("../policies/personalLoanPolicy");

// =====================================================
// PERSONAL LOAN BRE RUNNER
// =====================================================
const runPLBRE = async (lan) => {
    try {
        console.log("🚀 PL BRE Started:", lan);
        // -----------------------------------------------
        // 1. Fetch Personal Loan Application
        // -----------------------------------------------

        const [loanRows] = await db.query(
            `
            SELECT *
            FROM pl_partner_applications
            WHERE lan = ?
            LIMIT 1
            `,
            [lan]
        );
        if (!loanRows.length) {
            throw new Error(
                `Loan application not found for LAN ${lan}`
            );
        }
        const loan = loanRows[0];

        // -----------------------------------------------
        // 2. Check Existing Bureau
        // -----------------------------------------------
        const [bureauRows] = await db.query(
            `
            SELECT *
            FROM personal_loan_bureau_verification_status
            WHERE lan = ?
            LIMIT 1
            `,
            [lan]
        );


        let bureauResponse;


        if (
            bureauRows.length &&
            bureauRows[0].bureau_status === "VERIFIED"
        ) {

            console.log(
                "Existing bureau response found"
            );
            bureauResponse =
                bureauRows[0].bureau_api_response;

        } else {


            // Create bureau initiated record

            await db.query(
                `
                INSERT INTO personal_loan_bureau_verification_status
                (
                    lan,
                    bureau_status,
                    applicant_name,
                    mobile_number,
                    pan_number
                )
                VALUES (?,?,?,?,?)
                `,
                [

                    lan,

                    "INITIATED",

                    loan.customer_full_name,

                    loan.mobile_number,

                    loan.pan_number

                ]
            );



            // Call Experian Bureau API

            const bureauResult =
                await runBureau({

                    first_name:
                        loan.customer_first_name,

                    middle_name:
                        loan.customer_middle_name,

                    last_name:
                        loan.customer_last_name,


                    dob:
                        loan.date_of_birth,


                    gender:
                        loan.gender,


                    pan_number:
                        loan.pan_number,


                    mobile_number:
                        loan.mobile_number,


                    current_address:
                        loan.curr_address_line1,


                    current_village_city:
                        loan.curr_city,


                    current_state:
                        loan.curr_state,


                    current_pincode:
                        loan.curr_pincode,


                    loan_amount:
                        loan.requested_amount,


                    loan_tenure:
                        loan.requested_tenure

                });

//             const bureauResult = {
//     success: true,
//     response: JSON.stringify({
//         score: 720,
//         enquiries: 2,
//         overdue: 0
//     })
// };



            if (!bureauResult.success) {


                await db.query(
                    `
                    UPDATE personal_loan_bureau_verification_status
                    SET

                    bureau_status='FAILED',

                    bureau_api_response=?

                    WHERE lan=?

                    `,
                    [

                        bureauResult.response,

                        lan

                    ]
                );


                throw new Error(
                    "Bureau API Failed"
                );

            }



            bureauResponse =
                bureauResult.response;



            await db.query(
                `
                UPDATE personal_loan_bureau_verification_status
                SET

                bureau_status='VERIFIED',

                bureau_api_response=?

                WHERE lan=?

                `,
                [

                    bureauResponse,

                    lan

                ]
            );


        }



        // -----------------------------------------------
        // 3. Parse Bureau Report
        // -----------------------------------------------

        const bureauData =
            parseBureauReport(
                bureauResponse
            );



        // -----------------------------------------------
        // 4. Apply Personal Loan Rules
        // -----------------------------------------------


        const age =
            calculateAge(
                loan.date_of_birth
            );



        let breStatus = "APPROVED";

        let breReason =
            "ALL_RULES_PASSED";



        if (age < 21) {


            breStatus = "REJECTED";

            breReason =
                "AGE_BELOW_LIMIT";

        }



        if (
            !validateLoanAmount(
                loan.requested_amount
            )
        ) {


            breStatus = "REJECTED";

            breReason =
                "INVALID_LOAN_AMOUNT";

        }



        if (
            bureauData.score &&
            bureauData.score < 650
        ) {


            breStatus = "REJECTED";

            breReason =
                "LOW_BUREAU_SCORE";

        }



        // -----------------------------------------------
        // 5. Save BRE Decision
        // -----------------------------------------------


        await db.query(
            `
            UPDATE pl_partner_applications
            SET

            bre_policy_version=?,

            bre_status=?,

            bre_reason=?,

            bre_checked_at=NOW(),

            bre_details_json=?,

            bre_final_status=?,

            bre_final_reason=?

            WHERE lan=?

            `,
            [

                "PL_BRE_V1",

                breStatus,

                breReason,


                JSON.stringify({

                    age,

                    bureauData

                }),


                breStatus,

                breReason,

                lan

            ]
        );



        console.log(
            "✅ PL BRE Completed:",
            lan
        );



        return {

            success: true,

            lan,

            status: breStatus,

            reason: breReason

        };



    }
    catch (error) {


        console.error(
            "❌ PL BRE Error:",
            error.message
        );

        await db.query(
            `
            UPDATE pl_partner_applications
            SET

            bre_status='FAILED',

            bre_reason=?,

            bre_checked_at=NOW()

            WHERE lan=?

            `,
            [

                error.message,

                lan

            ]
        );



        return {
            success: false,
            error: error.message
        };
    }
};
module.exports = {

    runPLBRE

};