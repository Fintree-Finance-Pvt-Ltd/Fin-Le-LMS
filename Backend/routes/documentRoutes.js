const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const documentService = require("../services/documentService");


const uploadDirectory = path.join(
    __dirname,
    "../uploads/documents"
);


if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, {
        recursive: true
    });
}


const storage = multer.diskStorage({

    destination: (req, file, callback) => {

        callback(
            null,
            uploadDirectory
        );

    },


    filename: (req, file, callback) => {

        const safeName =
            file.originalname
                .replace(/\s+/g, "_")
                .replace(/[^a-zA-Z0-9._-]/g, "");

        const fileName =
            `${Date.now()}_${safeName}`;

        callback(
            null,
            fileName
        );

    }

});


const upload = multer({

    storage,

    limits: {
        fileSize: 15 * 1024 * 1024
    }

});



/*
|--------------------------------------------------------------------------
| GET DOCUMENTS
|--------------------------------------------------------------------------
*/

router.get("/:lan", async (req, res) => {

    try {

        const data =
            await documentService.getDocuments(
                req.params.lan
            );

        return res.json({
            success: true,
            data
        });

    }
    catch (error) {

        console.error(
            "GET DOCUMENTS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

});



/*
|--------------------------------------------------------------------------
| UPLOAD DOCUMENT
|--------------------------------------------------------------------------
*/

router.post(
    "/upload",
    upload.single("document"),
    async (req, res) => {

        try {

            if (!req.file) {

                return res.status(400).json({
                    success: false,
                    message: "Document file is required"
                });

            }


            if (!req.body.lan) {

                return res.status(400).json({
                    success: false,
                    message: "LAN is required"
                });

            }


            if (!req.body.documentName) {

                return res.status(400).json({
                    success: false,
                    message: "Document name is required"
                });

            }


            const data =
                await documentService.uploadDocument({

                    lan: req.body.lan,

                    documentName:
                        req.body.documentName,

                    file: req.file

                });


            return res.status(201).json({

                success: true,

                data

            });

        }
        catch (error) {

            console.error(
                "DOCUMENT UPLOAD ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    error.sqlMessage ||
                    error.message ||
                    "Document upload failed"

            });

        }

    }
);



/*
|--------------------------------------------------------------------------
| DELETE DOCUMENT
|--------------------------------------------------------------------------
*/

router.delete("/:id", async (req, res) => {

    try {

        const data =
            await documentService.deleteDocument(
                req.params.id
            );


        return res.json({

            success: true,

            data

        });

    }
    catch (error) {

        console.error(
            "DELETE DOCUMENT ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.sqlMessage ||
                error.message

        });

    }

});



/*
|--------------------------------------------------------------------------
| REPLACE DOCUMENT
|--------------------------------------------------------------------------
*/

router.put(
    "/:id/replace",
    upload.single("document"),
    async (req, res) => {

        try {

            if (!req.file) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Replacement file is required"

                });

            }


            const data =
                await documentService.replaceDocument(

                    req.params.id,

                    req.file

                );


            return res.json({

                success: true,

                data

            });

        }
        catch (error) {

            console.error(
                "REPLACE DOCUMENT ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    error.sqlMessage ||
                    error.message

            });

        }

    }
);


module.exports = router;