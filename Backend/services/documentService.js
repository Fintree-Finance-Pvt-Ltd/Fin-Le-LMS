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
            ORDER BY uploaded_at DESC, id DESC
            `,
            [lan]
        );


    return rows;

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

        throw new Error(
            "Document not found"
        );

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

    replaceDocument

};
