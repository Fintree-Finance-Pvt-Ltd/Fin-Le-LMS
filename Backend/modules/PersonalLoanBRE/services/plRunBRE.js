const db = require("../../../config/db");

const { runBureau } = require("./bureauService");

const {
    parseBureauReport,
    calculateAge,
    validateLoanAmount
} = require("../policies/personalLoanPolicy");


// =====================================================
// TRACKWIZZ
// =====================================================

const {
    screenLoanBooking
} = require("../../../services/trackwizz/screeningService");


const AML_SCREENING_PRODUCT = "fintreepl";

const AML_REJECT_REASON = "AML_REJECT";


const TRACKWIZZ_AML_STATUSES = new Set([
    "PROCEED",
    "REVIEW",
    "STOP"
]);


// =====================================================
// HELPERS
// =====================================================

const toNumberOrNull = (value) => {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : null;
};


// =====================================================
// TRACKWIZZ AML RUNNER
// =====================================================

const runTrackwizzAml = async (loan) => {

    try {

        if (!loan?.lan) {

            return {
                status: "ERROR",
                score: null,
                totalMatches: null,
                reason: "LAN_MISSING",
                source: "TRACKWIZZ",
                technicalReason: "LAN_MISSING"
            };
        }


        console.log(
            "🔍 TrackWizz AML Started:",
            loan.lan
        );


        // -------------------------------------------------
        // Call TrackWizz screening service
        // -------------------------------------------------

        const screening =
            await screenLoanBooking(
                AML_SCREENING_PRODUCT,
                loan.lan
            );


        // -------------------------------------------------
        // Reload AML result from PL table
        //
        // screeningService writes:
        //
        // aml_status
        // aml_score
        // aml_total_matches
        // aml_reason
        // aml_api_response
        // aml_checked_at
        // -------------------------------------------------

        const [amlRows] =
            await db.query(
                `
                SELECT
                    aml_status,
                    aml_score,
                    aml_total_matches,
                    aml_reason

                FROM pl_partner_applications

                WHERE id = ?

                LIMIT 1
                `,
                [
                    loan.id
                ]
            );


        const amlRow =
            amlRows[0] || {};


        const status =
            String(
                amlRow.aml_status ||
                screening?.amlStatus ||
                screening?.decision ||
                ""
            )
                .trim()
                .toUpperCase();


        const score =
            toNumberOrNull(
                amlRow.aml_score ??
                screening?.amlScore
            );


        const totalMatches =
            toNumberOrNull(
                amlRow.aml_total_matches ??
                screening?.amlTotalMatches ??
                screening?.hitsCount
            );


        const reason =
            String(
                amlRow.aml_reason ||
                screening?.amlReason ||
                screening?.reason ||
                ""
            ).trim() || null;


        // -------------------------------------------------
        // TrackWizz service/API failed
        // -------------------------------------------------

        if (
            screening?.degraded ||
            status === "ERROR"
        ) {

            console.error(
                "❌ TrackWizz AML Technical Failure:",
                {
                    lan: loan.lan,
                    status,
                    reason
                }
            );


            return {
                status: "ERROR",
                score,
                totalMatches,
                reason:
                    reason ||
                    "AML_TECHNICAL_FAILURE",
                source: "TRACKWIZZ",
                technicalReason:
                    "AML_TECHNICAL_FAILURE"
            };
        }


        // -------------------------------------------------
        // Only these statuses are valid for BRE
        // -------------------------------------------------

        if (
            !TRACKWIZZ_AML_STATUSES.has(
                status
            )
        ) {

            console.error(
                "❌ Invalid TrackWizz AML Status:",
                {
                    lan: loan.lan,
                    status
                }
            );


            return {
                status:
                    status ||
                    "ERROR",

                score,

                totalMatches,

                reason,

                source:
                    "TRACKWIZZ",

                technicalReason:
                    "AML_STATUS_INVALID"
            };
        }


        console.log(
            "✅ TrackWizz AML Completed:",
            {
                lan: loan.lan,
                status,
                score,
                totalMatches
            }
        );


        return {
            status,
            score,
            totalMatches,
            reason,
            source: "TRACKWIZZ",
            technicalReason: null
        };

    }
    catch (error) {

        console.error(
            "❌ TrackWizz AML Error:",
            {
                lan: loan?.lan,
                code: error?.code,
                message: error?.message
            }
        );


        return {
            status: "ERROR",
            score: null,
            totalMatches: null,
            reason:
                error?.message ||
                "AML_TECHNICAL_FAILURE",
            source: "TRACKWIZZ",
            technicalReason:
                "AML_TECHNICAL_FAILURE"
        };
    }
};


// =====================================================
// PERSONAL LOAN BRE RUNNER
// =====================================================

const runPLBRE = async (lan) => {

    try {

        console.log(
            "🚀 PL BRE Started:",
            lan
        );


        // -----------------------------------------------
        // 1. Fetch Personal Loan Application
        // -----------------------------------------------

        const [loanRows] =
            await db.query(
                `
                SELECT *
                FROM pl_partner_applications
                WHERE lan = ?
                LIMIT 1
                `,
                [
                    lan
                ]
            );


        if (!loanRows.length) {

            throw new Error(
                `Loan application not found for LAN ${lan}`
            );
        }


        const loan =
            loanRows[0];


        // =================================================
        // 2. TRACKWIZZ AML SCREENING
        // =================================================

        const aml =
            await runTrackwizzAml(
                loan
            );


        // -------------------------------------------------
        // TrackWizz technical/API error
        // -------------------------------------------------

        if (
            aml.technicalReason
        ) {

            await db.query(
                `
                UPDATE pl_partner_applications

                SET
                    bre_policy_version = ?,

                    bre_status = ?,

                    bre_reason = ?,

                    bre_checked_at = NOW(),

                    bre_details_json = ?,

                    bre_final_status = ?,

                    bre_final_reason = ?

                WHERE id = ?
                `,
                [
                    "PL_BRE_V1",

                    "FAILED",

                    aml.technicalReason,

                    JSON.stringify({
                        aml
                    }),

                    "FAILED",

                    aml.technicalReason,

                    loan.id
                ]
            );


            console.error(
                "❌ PL BRE stopped because AML failed:",
                {
                    lan,
                    reason:
                        aml.technicalReason
                }
            );


            return {
                success: false,

                lan,

                status:
                    "FAILED",

                reason:
                    aml.technicalReason,

                aml
            };
        }


        // -------------------------------------------------
        // AML HIT CHECK
        // -------------------------------------------------

        const hasAmlHit =
            Number.isFinite(
                Number(
                    aml.totalMatches
                )
            ) &&
            Number(
                aml.totalMatches
            ) > 0;


        /*
         * Same AML rule as LMS:
         *
         * Any hit      -> REJECT
         * REVIEW       -> REJECT
         * STOP         -> REJECT
         *
         * Only:
         *
         * PROCEED + zero hits
         *
         * continues to Bureau.
         */
        const amlRejected =
            hasAmlHit ||
            aml.status === "REVIEW" ||
            aml.status === "STOP";


        if (
            amlRejected
        ) {

            await db.query(
                `
                UPDATE pl_partner_applications

                SET
                    bre_policy_version = ?,

                    bre_status = ?,

                    bre_reason = ?,

                    bre_checked_at = NOW(),

                    bre_details_json = ?,

                    bre_final_status = ?,

                    bre_final_reason = ?

                WHERE id = ?
                `,
                [
                    "PL_BRE_V1",

                    "REJECTED",

                    AML_REJECT_REASON,

                    JSON.stringify({
                        aml
                    }),

                    "REJECTED",

                    AML_REJECT_REASON,

                    loan.id
                ]
            );


            console.log(
                "⛔ PL Rejected by TrackWizz AML:",
                {
                    lan,
                    status:
                        aml.status,
                    totalMatches:
                        aml.totalMatches
                }
            );


            return {
                success: true,

                lan,

                status:
                    "REJECTED",

                reason:
                    AML_REJECT_REASON,

                aml
            };
        }


        // -------------------------------------------------
        // Only PROCEED can continue
        // -------------------------------------------------

        if (
            aml.status !== "PROCEED"
        ) {

            throw new Error(
                "AML_STATUS_INVALID"
            );
        }


        console.log(
            "✅ AML Passed. Continuing to Bureau:",
            lan
        );


        // =================================================
        // 3. CHECK EXISTING BUREAU
        // =================================================

        const [bureauRows] =
            await db.query(
                `
                SELECT *
                FROM personal_loan_bureau_verification_status
                WHERE lan = ?
                LIMIT 1
                `,
                [
                    lan
                ]
            );


        let bureauResponse;


        if (
            bureauRows.length &&
            bureauRows[0].bureau_status ===
                "VERIFIED"
        ) {

            console.log(
                "Existing bureau response found"
            );


            bureauResponse =
                bureauRows[0]
                    .bureau_api_response;

        } else {


            // ---------------------------------------------
            // Create bureau initiated record
            // ---------------------------------------------

            await db.query(
                `
                INSERT INTO
                personal_loan_bureau_verification_status
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


            // ---------------------------------------------
            // Call Experian Bureau API
            // ---------------------------------------------

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


            /*
             * Temporary mock if required:
             *
             * const bureauResult = {
             *     success: true,
             *     response: JSON.stringify({
             *         score: 720,
             *         enquiries: 2,
             *         overdue: 0
             *     })
             * };
             */


            if (
                !bureauResult.success
            ) {

                await db.query(
                    `
                    UPDATE
                    personal_loan_bureau_verification_status

                    SET
                        bureau_status = 'FAILED',

                        bureau_api_response = ?

                    WHERE lan = ?
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
                UPDATE
                personal_loan_bureau_verification_status

                SET
                    bureau_status = 'VERIFIED',

                    bureau_api_response = ?

                WHERE lan = ?
                `,
                [
                    bureauResponse,

                    lan
                ]
            );
        }


        // =================================================
        // 4. PARSE BUREAU REPORT
        // =================================================

        const bureauData =
            parseBureauReport(
                bureauResponse
            );


        // =================================================
        // 5. APPLY PERSONAL LOAN RULES
        // =================================================

        const age =
            calculateAge(
                loan.date_of_birth
            );


        let breStatus =
            "APPROVED";


        let breReason =
            "ALL_RULES_PASSED";


        // -----------------------------------------------
        // AGE RULE
        // -----------------------------------------------

        if (
            age < 21
        ) {

            breStatus =
                "REJECTED";

            breReason =
                "AGE_BELOW_LIMIT";
        }


        // -----------------------------------------------
        // LOAN AMOUNT RULE
        // -----------------------------------------------

        if (
            !validateLoanAmount(
                loan.requested_amount
            )
        ) {

            breStatus =
                "REJECTED";

            breReason =
                "INVALID_LOAN_AMOUNT";
        }


        // -----------------------------------------------
        // BUREAU SCORE RULE
        // -----------------------------------------------

        if (
            bureauData.score &&
            bureauData.score < 650
        ) {

            breStatus =
                "REJECTED";

            breReason =
                "LOW_BUREAU_SCORE";
        }


        // =================================================
        // 6. SAVE FINAL BRE DECISION
        // =================================================

        await db.query(
            `
            UPDATE pl_partner_applications

            SET
                bre_policy_version = ?,

                bre_status = ?,

                bre_reason = ?,

                bre_checked_at = NOW(),

                bre_details_json = ?,

                bre_final_status = ?,

                bre_final_reason = ?

            WHERE id = ?
            `,
            [
                "PL_BRE_V1",

                breStatus,

                breReason,


                JSON.stringify({

                    age,

                    aml,

                    bureauData
                }),


                breStatus,

                breReason,

                loan.id
            ]
        );


        console.log(
            "✅ PL BRE Completed:",
            {
                lan,
                amlStatus:
                    aml.status,
                breStatus,
                breReason
            }
        );


        return {

            success: true,

            lan,

            status:
                breStatus,

            reason:
                breReason,

            aml: {
                status:
                    aml.status,

                score:
                    aml.score,

                totalMatches:
                    aml.totalMatches,

                reason:
                    aml.reason
            },

            bureau:
                bureauData
        };

    }
    catch (error) {

        console.error(
            "❌ PL BRE Error:",
            {
                lan,
                code:
                    error?.code,
                message:
                    error.message
            }
        );


        /*
         * Do not let secondary DB error
         * hide original BRE error.
         */
        try {

            await db.query(
                `
                UPDATE pl_partner_applications

                SET
                    bre_status = 'FAILED',

                    bre_reason = ?,

                    bre_checked_at = NOW(),

                    bre_final_status = 'FAILED',

                    bre_final_reason = ?

                WHERE lan = ?
                `,
                [
                    String(
                        error.message
                    ).slice(
                        0,
                        100
                    ),

                    String(
                        error.message
                    ).slice(
                        0,
                        100
                    ),

                    lan
                ]
            );

        }
        catch (
            updateError
        ) {

            console.error(
                "❌ Unable to save PL BRE failure:",
                updateError.message
            );
        }


        return {

            success: false,

            lan,

            status:
                "FAILED",

            error:
                error.message
        };
    }
};


module.exports = {
    runPLBRE
};