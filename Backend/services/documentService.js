const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const db = require("../config/db");


async function getApplicationByLan(lan) {

    const [rows] =
        await db.query(
            `
            SELECT
                id,
                client_id,
                lan
            FROM pl_partner_applications
            WHERE lan = ?
            LIMIT 1
            `,
            [lan]
        );


    return rows[0] || null;

}



/*
|--------------------------------------------------------------------------
| GET DOCUMENTS
|--------------------------------------------------------------------------
*/

async function getDocuments(lan) {

    const [rows] =
        await db.query(
            `
            SELECT
                id,
                document_id,
                client_id,
                lan,
                document_type,
                file_name,
                original_name,
                file_size,
                mime_type,
                file_sha256,
                source_url,
                source,
                doc_name,
                sub_type,
                uploaded_at
            FROM loan_documents
            WHERE lan = ?

            UNION ALL

            SELECT
                p.id,
                COALESCE(p.partner_document_id, UUID()) AS document_id,
                p.client_id,
                a.lan,
                p.document_type,
                p.stored_file_name AS file_name,
                p.original_file_name AS original_name,
                p.file_size,
                p.mime_type,
                p.file_sha256,
                p.file_path AS source_url,
                COALESCE(p.source, 'PARTNER') AS source,
                p.document_type AS doc_name,
                p.document_type AS sub_type,
                COALESCE(p.received_at, p.created_at) AS uploaded_at
            FROM pl_partner_documents p
            JOIN pl_partner_applications a ON a.id = p.application_id
            WHERE a.lan = ?

            UNION ALL

            SELECT
                b.id,
                UUID() AS document_id,
                1 AS client_id,
                b.lan,
                'CIBIL_REPORT' AS document_type,
                CONCAT('CIBIL_Report_', b.lan, '.pdf') AS file_name,
                CONCAT('CIBIL Report - ', b.lan, '.pdf') AS original_name,
                LENGTH(b.bureau_api_response) AS file_size,
                'application/pdf' AS mime_type,
                NULL AS file_sha256,
                CONCAT('/api/documents/bureau/', b.lan) AS source_url,
                'EXPERIAN' AS source,
                'CIBIL_REPORT' AS doc_name,
                'EXPERIAN' AS sub_type,
                b.created_at AS uploaded_at
            FROM personal_loan_bureau_verification_status b
            WHERE UPPER(b.lan) = UPPER(?) AND b.bureau_api_response IS NOT NULL
              AND NOT EXISTS (
                SELECT 1 FROM loan_documents ld
                WHERE UPPER(ld.lan) = UPPER(b.lan) AND (ld.doc_name = 'CIBIL_REPORT' OR ld.document_type = 'CIBIL_REPORT')
              )

            UNION ALL

            SELECT
                w.id,
                UUID() AS document_id,
                1 AS client_id,
                w.lan,
                'WELCOME_LETTER' AS document_type,
                SUBSTRING_INDEX(w.pdf_path, '/', -1) AS file_name,
                'welcome-letter.pdf' AS original_name,
                NULL AS file_size,
                'application/pdf' AS mime_type,
                NULL AS file_sha256,
                w.pdf_path AS source_url,
                'SYSTEM' AS source,
                'WELCOME_LETTER' AS doc_name,
                'WELCOME_LETTER' AS sub_type,
                w.created_at AS uploaded_at
            FROM pl_welcome_letters w
            WHERE w.lan = ?

            ORDER BY uploaded_at DESC, id DESC
            `,
            [lan, lan, lan, lan]
        );


    return rows;

}


async function getBureauReport(lan) {
    const [rows] = await db.query(
        `
        SELECT bureau_api_response
        FROM personal_loan_bureau_verification_status
        WHERE UPPER(lan) = UPPER(?) AND bureau_api_response IS NOT NULL
        ORDER BY id DESC
        LIMIT 1
        `,
        [lan]
    );

    return rows[0]?.bureau_api_response || null;
}



/*
|--------------------------------------------------------------------------
| UPLOAD DOCUMENT
|--------------------------------------------------------------------------
*/

async function uploadDocument({
    lan,
    documentName,
    file
}) {


    const application =
        await getApplicationByLan(lan);


    if (!application) {

        const error =
            new Error(
                "Loan application not found for this LAN"
            );

        error.statusCode = 404;

        throw error;

    }


    const fileBuffer =
        fs.readFileSync(file.path);


    const fileSha256 =
        crypto
            .createHash("sha256")
            .update(fileBuffer)
            .digest("hex");


    const documentId =
        crypto.randomUUID();


    const sourceUrl =
        `/uploads/documents/${file.filename}`;


    const [result] =
        await db.query(
            `
            INSERT INTO loan_documents
            (
                document_id,
                client_id,
                lan,

                document_type,

                file_name,
                original_name,

                file_size,
                mime_type,
                file_sha256,

                source_url,
                source,

                doc_name,
                sub_type,

                uploaded_at,
                created_at,
                updated_at
            )

            VALUES
            (
                ?, ?, ?,
                ?,
                ?, ?,
                ?, ?, ?,
                ?, ?,
                ?, ?,
                NOW(3),
                NOW(3),
                NOW(3)
            )
            `,
            [

                documentId,

                application.client_id,

                application.lan,

                documentName,

                file.filename,

                file.originalname,

                file.size,

                file.mimetype,

                fileSha256,

                sourceUrl,

                "PL_LMS",

                documentName,

                "CUSTOMER_DOCUMENT"

            ]
        );


    return {

        id: result.insertId,

        documentId,

        lan:
            application.lan,

        fileName:
            file.originalname,

        documentName,

        sourceUrl,

        status:
            "UPLOADED"

    };

}



/*
|--------------------------------------------------------------------------
| DELETE DOCUMENT
|--------------------------------------------------------------------------
*/

async function deleteDocument(id) {


    const [rows] =
        await db.query(
            `
            SELECT
                id,
                file_name
            FROM loan_documents
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );


    const document =
        rows[0];


    if (!document) {
        const [partnerRows] = await db.query(
            `
            SELECT id, stored_file_name AS file_name
            FROM pl_partner_documents
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );

        const partnerDoc = partnerRows[0];
        if (!partnerDoc) {
            throw new Error(
                "Document not found"
            );
        }

        const pFilePath = path.join(
            __dirname,
            "../uploads/partner-documents",
            partnerDoc.file_name
        );
        if (fs.existsSync(pFilePath)) {
            fs.unlinkSync(pFilePath);
        }

        await db.query(
            `DELETE FROM pl_partner_documents WHERE id = ?`,
            [id]
        );

        return {
            status: "DELETED"
        };
    }


    const filePath =
        path.join(
            __dirname,
            "../uploads/documents",
            document.file_name
        );


    if (fs.existsSync(filePath)) {

        fs.unlinkSync(filePath);

    }


    await db.query(
        `
        DELETE FROM loan_documents
        WHERE id = ?
        `,
        [id]
    );


    return {

        status:
            "DELETED"

    };

}



/*
|--------------------------------------------------------------------------
| REPLACE DOCUMENT
|--------------------------------------------------------------------------
*/

async function replaceDocument(
    id,
    file
) {


    const [rows] =
        await db.query(
            `
            SELECT *
            FROM loan_documents
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );


    const oldDocument =
        rows[0];


    if (!oldDocument) {

        throw new Error(
            "Document not found"
        );

    }


    const fileBuffer =
        fs.readFileSync(
            file.path
        );


    const fileSha256 =
        crypto
            .createHash("sha256")
            .update(fileBuffer)
            .digest("hex");


    const sourceUrl =
        `/uploads/documents/${file.filename}`;


    await db.query(
        `
        UPDATE loan_documents
        SET
            file_name = ?,
            original_name = ?,
            file_size = ?,
            mime_type = ?,
            file_sha256 = ?,
            source_url = ?,
            uploaded_at = NOW(3),
            updated_at = NOW(3)
        WHERE id = ?
        `,
        [

            file.filename,

            file.originalname,

            file.size,

            file.mimetype,

            fileSha256,

            sourceUrl,

            id

        ]
    );


    const oldPath =
        path.join(
            __dirname,
            "../uploads/documents",
            oldDocument.file_name
        );


    if (
        oldDocument.file_name &&
        fs.existsSync(oldPath)
    ) {

        fs.unlinkSync(oldPath);

    }


    return {

        status:
            "REPLACED"

    };

}



module.exports = {

    getDocuments,

    uploadDocument,

    deleteDocument,

    replaceDocument,

    getBureauReport

};
