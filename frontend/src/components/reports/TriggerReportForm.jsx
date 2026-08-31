import { useState } from "react";
import { useOutletContext } from "react-router-dom";

import { apiFetch } from "../../services/api";

import "../../styles/TriggerReportForm.css";


function TriggerReportForm() {

  const { report } =
    useOutletContext();


  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState("");


  /* ========================================================
     REPORT TYPE CHECK
  ======================================================== */

  const isRpsReport =
    report.slug ===
    "rps-generate-report";


  const isBankDateCashflow =
    report.slug ===
    "cashflow-report-bank-date";


  /* ========================================================
     DYNAMIC DATE LABELS
  ======================================================== */

  const startDateLabel =
    isRpsReport
      ? "EMI Due Date Start Date"
      : isBankDateCashflow
        ? "Bank Date Start Date"
        : "Start Date";


  const endDateLabel =
    isRpsReport
      ? "EMI Due Date End Date"
      : isBankDateCashflow
        ? "Bank Date End Date"
        : "End Date";


  /* ========================================================
     SUBMIT
  ======================================================== */

  const handleSubmit = async (event) => {

    event.preventDefault();


    setMessage("");
    setMessageType("");


    /* ======================================================
       VALIDATION
    ====================================================== */

    if (
      !startDate ||
      !endDate
    ) {

      setMessage(
        `${startDateLabel} and ${endDateLabel} are required.`
      );

      setMessageType(
        "error"
      );

      return;

    }


    if (
      endDate < startDate
    ) {

      setMessage(
        `${endDateLabel} cannot be earlier than ${startDateLabel}.`
      );

      setMessageType(
        "error"
      );

      return;

    }


    /* ======================================================
       REQUEST PAYLOAD
    ====================================================== */

    const payload = {

      reportId:
        report.slug,

      startDate,

      endDate,

      product:
        "PERSONAL_LOAN",

      description:
        description.trim(),

      outputFormat:
        "excel",

    };


    try {

      setIsSubmitting(
        true
      );


      /* ====================================================
         API CALL
      ==================================================== */

      const response =
        await apiFetch(
          "/reports/trigger",
          {

            method:
              "POST",

            body:
              JSON.stringify(
                payload
              ),

          }
        );


      /* ====================================================
         SUCCESS
      ==================================================== */

      setMessage(
        response?.message ||
          "Report generation started."
      );


      setMessageType(
        "success"
      );


      /* ====================================================
         RESET FORM
      ==================================================== */

      setStartDate("");
      setEndDate("");
      setDescription("");


    } catch (error) {


      console.error(
        "Report trigger error:",
        error
      );


      setMessage(
        error?.message ||
          "Failed to trigger report."
      );


      setMessageType(
        "error"
      );


    } finally {


      setIsSubmitting(
        false
      );


    }

  };


  return (

    <div className="mis-trigger-wrapper">

      <form
        className="mis-trigger-form"
        onSubmit={handleSubmit}
      >


        {/* =====================================================
            DATE RANGE
        ===================================================== */}

        <div className="mis-form-grid">


          {/* START DATE */}

          <div className="mis-form-group">

            <label htmlFor="report-start-date">

              {startDateLabel}

              <span>*</span>

            </label>


            <input
              id="report-start-date"
              type="date"
              value={startDate}
              onChange={(event) =>
                setStartDate(
                  event.target.value
                )
              }
              required
            />

          </div>


          {/* END DATE */}

          <div className="mis-form-group">

            <label htmlFor="report-end-date">

              {endDateLabel}

              <span>*</span>

            </label>


            <input
              id="report-end-date"
              type="date"
              value={endDate}
              min={
                startDate ||
                undefined
              }
              onChange={(event) =>
                setEndDate(
                  event.target.value
                )
              }
              required
            />

          </div>


        </div>


        {/* =====================================================
            PRODUCT
        ===================================================== */}

        <div className="mis-form-group">

          <label htmlFor="report-product">

            Product

          </label>


          <input
            id="report-product"
            type="text"
            value="Personal Loan"
            disabled
          />

        </div>


        {/* =====================================================
            DESCRIPTION
        ===================================================== */}

        <div className="mis-form-group">

          <label htmlFor="report-description">

            Description

          </label>


          <textarea
            id="report-description"
            rows="4"
            placeholder="Add description for your report"
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value
              )
            }
          />

        </div>


        {/* =====================================================
            MESSAGE
        ===================================================== */}

        {message && (

          <div
            className={
              `mis-form-message ${messageType}`
            }
            role={
              messageType === "error"
                ? "alert"
                : "status"
            }
          >

            {message}

          </div>

        )}


        {/* =====================================================
            SUBMIT BUTTON
        ===================================================== */}

        <button
          type="submit"
          className="mis-trigger-button"
          disabled={isSubmitting}
        >

          {
            isSubmitting
              ? "Triggering..."
              : "Trigger Report"
          }

        </button>


      </form>

    </div>

  );

}


export default TriggerReportForm;