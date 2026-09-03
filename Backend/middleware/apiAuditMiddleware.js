const crypto = require("crypto");

const db = require("../config/db");
function getPartnerApplicationId(req) {

    const match =
        req.originalUrl.match(
            /applications\/([^\/]+)/
        );

    return match
        ? match[1]
        : null;
}
function safeJson(data) {

    try {
        return JSON.stringify(data || {});
    }
    catch (error) {
        return JSON.stringify({});
    }

}



function apiAuditMiddleware(req, res, next) {

    const startedAt = Date.now();

    const requestId =
        crypto.randomUUID();

    let responseBody = null;



    res.setHeader(
        "x-request-id",
        requestId
    );



    const originalJson =
        res.json.bind(res);


    res.json = function (body) {

        responseBody = body;

        return originalJson(body);

    };



    const originalSend =
        res.send.bind(res);


    res.send = function (body) {

        responseBody = body;

        return originalSend(body);

    };




    res.on("finish", async () => {


        try {


            let applicationId = null;

            let partnerLoanId = null;

            let lan = null;



            const partnerApplicationId =
                getPartnerApplicationId(req);


            if (partnerApplicationId) {


                const [rows] =
                    await db.query(
                        `
                        SELECT
                            id,
                            lan,
                            external_application_reference
                        FROM pl_partner_applications
                        WHERE partner_application_id = ?
                        LIMIT 1
                        `,
                        [
                            partnerApplicationId
                        ]
                    );

                console.log(
                    "AUDIT DB ROWS ===>",
                    rows
                );



                if (rows.length) {

                    applicationId =
                        rows[0].id;

                    partnerLoanId =
                        rows[0].external_application_reference;

                    lan =
                        rows[0].lan;

                }

            }



            await db.query(

                `
                INSERT INTO api_audit_logs
                (
                    application_id,
                    partner_loan_id,
                    lan,

                    request_id,
                    user_id,

                    http_method,
                    route_path,
                    request_url,

                    request_headers,
                    request_query,
                    request_body,

                    response_status,
                    response_body,

                    duration_ms,

                    ip_address,
                    user_agent
                )

                VALUES
                (
                    ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
                )
                `,


                [

                    applicationId,

                    partnerLoanId,

                    lan,


                    requestId,

                    req.session?.userId || null,


                    req.method,

                    req.originalUrl,

                    req.originalUrl,


                    safeJson(req.headers),

                    safeJson(req.query),

                    safeJson(req.body),


                    res.statusCode,


                    safeJson(responseBody),


                    Date.now() - startedAt,


                    req.ip ||
                    req.socket?.remoteAddress,


                    req.headers["user-agent"]

                ]

            );


        }

        catch (error) {

            console.error(
                "Audit log error:",
                error.message
            );

        }


    });



    next();

}



module.exports =
    apiAuditMiddleware;