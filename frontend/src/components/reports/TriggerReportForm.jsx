import { useState } from "react";
import { useOutletContext } from "react-router-dom";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { apiFetch } from "../../services/api";

import "../../styles/TriggerReportForm.css";


function TriggerReportForm() {

  const { report } =
    useOutletContext();


  /* ========================================================
     FORM STATE
  ======================================================== */

  const [startDate, setStartDate] =
    useState(null);

  const [endDate, setEndDate] =
    useState(null);

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
     FORMAT DATE FOR API
     UI     -> MM/DD/YYYY
     API    -> YYYY-MM-DD
  ======================================================== */

  const formatDateForApi = (date) => {

    if (!date) {
      return "";
    }


    const year =
      date.getFullYear();


    const month =
      String(
        date.getMonth() + 1
      ).padStart(
        2,
        "0"
      );


    const day =
      String(
        date.getDate()
      ).padStart(
        2,
        "0"
      );


    return `${year}-${month}-${day}`;

  };


  /* ========================================================
     START DATE CHANGE
  ======================================================== */

  const handleStartDateChange = (date) => {

    setStartDate(date);


    /*
      If user changes start date to a date
      later than the already selected end date,
      clear the end date.
    */

    if (
      date &&
      endDate &&
      endDate < date
    ) {

      setEndDate(null);

    }

  };


  /* ========================================================
     END DATE CHANGE
  ======================================================== */

  const handleEndDateChange = (date) => {

    setEndDate(date);

  };


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

      startDate:
        formatDateForApi(
          startDate
        ),

      endDate:
        formatDateForApi(
          endDate
        ),

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

      setStartDate(null);

      setEndDate(null);

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


  /* ========================================================
     UI
  ======================================================== */

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


          {/* =========================
              START DATE
          ========================= */}

          <div className="mis-form-group">

            <label htmlFor="report-start-date">

              {startDateLabel}

              <span>*</span>

            </label>


            <DatePicker

              id="report-start-date"

              selected={
                startDate
              }

              onChange={
                handleStartDateChange
              }

              selectsStart

              startDate={
                startDate
              }

              endDate={
                endDate
              }

              maxDate={
                endDate ||
                undefined
              }

              dateFormat="MM/dd/yyyy"

              placeholderText="Select date"

              showMonthDropdown

              showYearDropdown

              dropdownMode="select"

              scrollableYearDropdown

              yearDropdownItemNumber={
                50
              }

              className="mis-date-input"

              calendarClassName="mis-datepicker-calendar"

              autoComplete="off"

              required

            />

          </div>


          {/* =========================
              END DATE
          ========================= */}

          <div className="mis-form-group">

            <label htmlFor="report-end-date">

              {endDateLabel}

              <span>*</span>

            </label>


            <DatePicker

              id="report-end-date"

              selected={
                endDate
              }

              onChange={
                handleEndDateChange
              }

              selectsEnd

              startDate={
                startDate
              }

              endDate={
                endDate
              }

              minDate={
                startDate ||
                undefined
              }

              dateFormat="MM/dd/yyyy"

              placeholderText="Select date"

              showMonthDropdown

              showYearDropdown

              dropdownMode="select"

              scrollableYearDropdown

              yearDropdownItemNumber={
                50
              }

              className="mis-date-input"

              calendarClassName="mis-datepicker-calendar"

              autoComplete="off"

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

            value={
              description
            }

            onChange={
              (event) =>
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

          disabled={
            isSubmitting
          }

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