const fs = require("fs");
const path = require("path");

const db = require("../config/db");

const pdfService = require("./welcomeLetterPdfService");

async function generatePLWelcomeLetter(lan) {

    try {

        /*
        |--------------------------------------------------------------------------
        | Duplicate Check
        |--------------------------------------------------------------------------
        */
        const [existing] = await db.promise().query(
            `
            SELECT id, pdf_path
            FROM pl_welcome_letters
            WHERE lan = ?
            LIMIT 1
            `,
            [lan]
        );
        if (existing.length) {
            console.log(
                "[PL] Welcome letter already generated",
                lan
            );
            return {
                success: true,
                alreadyGenerated: true,
                pdfPath: existing[0].pdf_path
            };

        }
        /*
        |--------------------------------------------------------------------------
        | Fetch Loan Data
        |--------------------------------------------------------------------------
        */
        const [rows] = await db.promise().query(
            `
SELECT
pla.partner_application_id AS CUSTOMER_ID,
pla.lan AS LOAN_ACCOUNT_NUMBER,
pla.customer_full_name AS BORROWER_NAME,

CONCAT_WS(', ',
pla.curr_address_line1,
pla.curr_address_line2,
pla.curr_locality,
pla.curr_city,
pla.curr_state,
pla.curr_pincode
) AS BORROWER_ADDRESS,

pla.mobile_number AS MOBILE_NUMBER,
pla.email AS EMAIL_ID,
pla.product_code AS LOAN_PRODUCT_NAME,

COALESCE(
pla.bre_approved_loan_amount,
pla.selected_offer_amount,
pla.requested_amount
) AS SANCTIONED_AMOUNT,

pla.selected_offer_amount AS DISBURSED_AMOUNT,
pla.interest_rate AS RATE_OF_INTEREST,
pla.selected_offer_tenure AS LOAN_TENURE,
rps.emi AS EMI_AMOUNT,
rps.due_date AS EMI_DUE_DATE,
pla.mandate_type AS REPAYMENT_MODE
FROM pl_partner_applications pla
LEFT JOIN manual_rps_fintree_personal_loan rps
ON rps.lan = pla.lan
WHERE pla.lan = ?
ORDER BY rps.due_date ASC
LIMIT 1
`,
            [lan]
        );
        if (!rows.length) {
            throw new Error(
                `Loan details not found for ${lan}`
            );

        }
        const loanData = rows[0];
        /*
        |--------------------------------------------------------------------------
        | Load HTML Template
        |--------------------------------------------------------------------------
        */
        const templatePath = path.join(
            __dirname,
            "../templates/pl_welcome_letter.html"
        );
        let html = fs.readFileSync(
            templatePath,
            "utf8"
        );

        /*
        |--------------------------------------------------------------------------
        | Replace Template Variables
        |--------------------------------------------------------------------------
        */
        Object.keys(loanData).forEach(key => {

            const value =
                loanData[key] !== null &&
                    loanData[key] !== undefined
                    ?
                    loanData[key]
                    :
                    "";

            html =
                html.replace(

                    new RegExp(
                        `{{${key}}}`,
                        "g"
                    ),
                    value
                );
        });

        /*
        |--------------------------------------------------------------------------
        | Generate PDF
        |--------------------------------------------------------------------------
        */

        const pdfPath =
            await pdfService.generatePDF(
                html,
                lan
            );
        /*
        |--------------------------------------------------------------------------
        | Save Tracking
        |--------------------------------------------------------------------------
        */
        await db.promise().query(
            `
INSERT INTO pl_welcome_letters
(
lan,
pdf_path,
status
)
VALUES
(
?,
?,
'GENERATED'
)
`,
            [lan, pdfPath]
        );
        console.log("[PL] Welcome Letter generated successfully",
            {
                lan,
                pdfPath
            }

        );
        return {
            success: true,
            lan,
            pdfPath
        };
    }
    catch (error) {
        console.error("[PL] Welcome Letter Failed",
            {
                lan,
                error: error.message
            }
        );
        throw error;
    }
}

module.exports = { generatePLWelcomeLetter };