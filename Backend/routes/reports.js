const express = require("express");
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");

const db = require("../config/db");
const authenticateUser = require("../middleware/authMiddleware");

const router = express.Router();


// ======================================================
// REPORT FILE DIRECTORY
// ======================================================

const reportsDir = path.join(
  __dirname,
  "../reports"
);


if (!fs.existsSync(reportsDir)) {

  fs.mkdirSync(
    reportsDir,
    {
      recursive: true
    }
  );

}



// ======================================================
// REPORT CONFIG
// ======================================================

const REPORTS = {


  "consolidated-mis": {

    name:
      "Consolidated MIS",

    procedure:
      "sp_consolidated_mis_report_personal_loan",

    product:
      "PERSONAL_LOAN"

  },


  "due-demand-vs-collection-all-products": {

    name:
      "Due Demand vs Collection Report(All products)",

    procedure:
      "sp_due_demand_report_personal_loan",

    product:
      "PERSONAL_LOAN"

  },


  "due-demand-vs-collection-personal-loan": {

    name:
      "Due Demand vs Collection Report",

    procedure:
      "sp_due_demand_report_personal_loan",

    product:
      "PERSONAL_LOAN"

  },


  "cashflow-report": {

    name:
      "CashFlow Report",

    procedure:
      "cashflow_report_personal_loan",

    product:
      "PERSONAL_LOAN"

  },


  "rps-generate-report": {

    name:
      "RPS Generate Report",

    procedure:
      "rps_generate_report_personal_loan",

    product:
      "PERSONAL_LOAN"

  },


"cashflow-report-bank-date": {

  name:
    "CashFlow Report Bank Date",

  procedure:
    "cashflow_report_bank_date_personal_loan",

  product:
    "PERSONAL_LOAN"

}
};



// ======================================================
// NORMALIZE REPORT ID
// ======================================================

function normalizeReportId(value) {

  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");

}



// ======================================================
// NORMALIZE PRODUCT
// ======================================================

function normalizeProduct(value) {


  const normalized =
    String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, "_");


  const aliases = {

    PL:
      "PERSONAL_LOAN",

    PERSONAL_LOAN:
      "PERSONAL_LOAN",

    PERSONALLOAN:
      "PERSONAL_LOAN"

  };


  return aliases[normalized] || null;

}



// ======================================================
// RESOLVE REPORT
// ======================================================

function resolveReport(value) {


  const normalized =
    normalizeReportId(value);


  const aliases = {


    "consolidated-mis":
      "consolidated-mis",


    "due-demand-vs-collection-all-products":
      "due-demand-vs-collection-all-products",


    "due-demand-vs-collection-report(all-products)":
      "due-demand-vs-collection-all-products",


    "due-demand-vs-collection-personal-loan":
      "due-demand-vs-collection-personal-loan",


    "cashflow-report":
      "cashflow-report",


    "rps-generate-report":
      "rps-generate-report",


    "cashflow-report-bank-date":
      "cashflow-report-bank-date"


  };


  const key =
    aliases[normalized] ||
    normalized;


  const report =
    REPORTS[key];


  if (!report) {

    return null;

  }


  return {

    slug: key,

    ...report

  };

}



// ======================================================
// FORMAT TIME
// ======================================================

function formatTimeTaken(startTime) {


  const seconds =
    Math.floor(
      (Date.now() - startTime) / 1000
    );


  return `${seconds} seconds`;

}



// ======================================================
// AUTOFIT EXCEL
// ======================================================

function autoFitColumns(sheet) {


  sheet.columns.forEach(
    column => {


      let max = 15;


      column.eachCell(
        cell => {


          const value =
            cell.value
              ?
              String(cell.value)
              :
              "";


          max =
            Math.max(
              max,
              value.length + 2
            );


        }
      );


      column.width =
        Math.min(
          max,
          50
        );


    }
  );

}



// ======================================================
// DATE VALIDATION
// ======================================================

function isValidDateString(value) {

  return /^\d{4}-\d{2}-\d{2}$/
    .test(value);

}



// ======================================================
// TRIGGER REPORT
// ======================================================

router.post(
  "/trigger",
  authenticateUser,
  async (req, res) => {


    const startTime =
      Date.now();


    const {

      reportId,

      startDate,

      endDate,

      product,

      description

    } = req.body;


    try {


      if (!reportId) {

        return res.status(400).json({

          success: false,

          message:
            "reportId required"

        });

      }


      const report =
        resolveReport(reportId);


      if (!report) {

        return res.status(400).json({

          success: false,

          message:
            `Invalid report: ${reportId}`

        });

      }


      if (
        !startDate ||
        !endDate
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Dates required"

        });

      }


      const normalizedProduct =
        normalizeProduct(product);


      const finalProduct =
        normalizedProduct ||
        report.product;


      const createdBy =
        req.user?.name ||
        "system";


      const fileName =
        `${report.slug}_${Date.now()}.xlsx`;


      const filePath =
        path.join(
          reportsDir,
          fileName
        );


      const [insert] =
        await db.query(

          `

          INSERT INTO reports_download

          (
            report_id,
            file_name,
            file_path,
            description,
            product,
            created_by,
            time_taken,
            generated_at,
            status
          )

          VALUES(?,?,?,?,?,?,?,NOW(),'Running')

          `,

          [

            report.name,

            fileName,

            filePath,

            description ||
            "No description",

            finalProduct,

            createdBy,

            "In progress"

          ]

        );


      const reportRowId =
        insert.insertId;


      res.status(202).json({

        success: true,

        message:
          "Report generation started"

      });



      // ======================================================
      // BACKGROUND PROCESS
      // ======================================================

      setImmediate(async () => {


        try {


          // ==================================================
          // PROCEDURE CALL
          //
          // 2 PARAMETER REPORTS:
          // CashFlow Report
          // RPS Generate Report
          // CashFlow Report Bank Date
          //
          // Parameters:
          // startDate + endDate
          //
          // Existing reports take:
          // startDate + endDate + product
          // ==================================================

          let procedureSql;
          let procedureParams;


          if (
            report.slug === "cashflow-report" ||
            report.slug === "rps-generate-report" ||
            report.slug === "cashflow-report-bank-date"
          ) {

            procedureSql = `

              CALL ${report.procedure}(?,?)

            `;


            procedureParams = [

              startDate,

              endDate

            ];

          } else {

            procedureSql = `

              CALL ${report.procedure}(?,?,?)

            `;


            procedureParams = [

              startDate,

              endDate,

              finalProduct

            ];

          }


          const [result] =
            await db.query(

              procedureSql,

              procedureParams

            );


          const rows =
            result.find(
              r => Array.isArray(r)
            )
            || [];


          if (!rows.length) {


            await db.query(

              `

              UPDATE reports_download

              SET
                status='Failed',
                time_taken='No records found'

              WHERE id=?

              `,

              [
                reportRowId
              ]

            );


            return;

          }


          const workbook =
            new ExcelJS.Workbook();


          const sheet =
            workbook.addWorksheet(
              "Report"
            );


          const headers =
            Object.keys(
              rows[0]
            );


          sheet.columns =
            headers.map(
              h => ({

                header: h,

                key: h

              })
            );


          rows.forEach(
            row => {

              sheet.addRow(row);

            }
          );


          sheet.getRow(1).font = {

            bold: true

          };


          sheet.views = [

            {

              state: "frozen",

              ySplit: 1

            }

          ];


          autoFitColumns(sheet);


          await workbook.xlsx.writeFile(
            filePath
          );


          await db.query(

            `

            UPDATE reports_download

            SET
              status='Completed',
              time_taken=?,
              generated_at=NOW()

            WHERE id=?

            `,

            [

              formatTimeTaken(
                startTime
              ),

              reportRowId

            ]

          );


        }

        catch (error) {


          console.error(
            "REPORT ERROR",
            error
          );


          await db.query(

            `

            UPDATE reports_download

            SET
              status='Failed',
              time_taken=?

            WHERE id=?

            `,

            [

              error.message,

              reportRowId

            ]

          );


        }


      });


    }

    catch (error) {


      console.error(error);


      res.status(500).json({

        success: false,

        message:
          "Failed to trigger report"

      });


    }


  }
);



// ======================================================
// DOWNLOAD LIST
// ======================================================

router.get(
  "/downloads",
  authenticateUser,
  async (req, res) => {


    try {


      const report =
        resolveReport(
          req.query.reportId
        );


      let sql =

        `

        SELECT *

        FROM reports_download

        `;


      let params = [];


      if (report) {


        sql +=

          `

          WHERE report_id=?

          `;


        params.push(
          report.name
        );


      }


      sql +=

        `

        ORDER BY id DESC

        `;


      const [rows] =
        await db.query(
          sql,
          params
        );


      res.json(

        rows.map(
          row => ({

            ...row,


            downloadUrl:

              row.status ===
                "Completed"

                ?

                `/api/reports/download/${row.file_name}`

                :

                null


          })
        )

      );


    }

    catch (error) {


      console.error(error);


      res.status(500).json({

        message:
          "Failed to fetch reports"

      });


    }


  }
);



// ======================================================
// DOWNLOAD FILE
// ======================================================

router.get(
  "/download/:fileName",
  authenticateUser,
  (req, res) => {


    const file =
      path.basename(
        req.params.fileName
      );


    const filePath =
      path.join(
        reportsDir,
        file
      );


    if (!fs.existsSync(filePath)) {


      return res.status(404).json({

        message:
          "File not found"

      });


    }


    res.download(
      filePath,
      file
    );


  }
);


module.exports = router;
