import { useEffect, useState } from "react";

import {
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Banknote,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import {
  getDisbursedLoans,
} from "../services/loanService";

import "../styles/DisbursedLoans.css";


function DisbursedLoans() {

  const navigate = useNavigate();


  // ======================================================
  // STATE
  // ======================================================

  const [loans, setLoans] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 0,
  });


  // ======================================================
  // FETCH DISBURSED LOANS
  // ======================================================

  const fetchLoans = async (
    targetPage = page,
    targetSearch = search
  ) => {

    try {

      setLoading(true);

      setError("");


      const data = await getDisbursedLoans({

        page: targetPage,

        pageSize: 25,

        search: targetSearch,

        sortBy: "created_at",

        sortDir: "desc",

      });


      setLoans(
        data?.rows || []
      );


      setPagination(
        data?.pagination || {
          page: 1,
          pageSize: 25,
          total: 0,
          totalPages: 0,
        }
      );


    } catch (err) {

      console.error(
        "Disbursed loans error:",
        err
      );


      setError(
        err.message ||
        "Failed to load disbursed loans"
      );


    } finally {

      setLoading(false);

    }

  };


  // ======================================================
  // PAGE CHANGE
  // ======================================================

  useEffect(() => {

    fetchLoans(
      page,
      search
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [page]);


  // ======================================================
  // SEARCH
  // ======================================================

  const handleSearch = () => {

    if (page !== 1) {

      setPage(1);

      return;

    }


    fetchLoans(
      1,
      search
    );

  };


  // ======================================================
  // FORMAT MONEY
  // ======================================================

  const formatMoney = (value) => {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {

      return "—";

    }


    const numberValue =
      Number(value);


    if (
      Number.isNaN(numberValue)
    ) {

      return "—";

    }


    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      }
    ).format(numberValue);

  };


  // ======================================================
  // OPEN CUSTOMER DETAILS
  // ======================================================

  const openCustomerDetails = (lan) => {

    if (!lan) {
      return;
    }


    navigate(
      `/customer-details/${lan}`
    );

  };


  // ======================================================
  // UI
  // ======================================================

  return (

    <div className="disbursed-page">


      {/* ==================================================
          MAIN CARD
      ================================================== */}

      <div className="disbursed-main-card">


        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="disbursed-header">


          {/* TITLE */}

          <div className="disbursed-title-wrapper">

            <div className="disbursed-title-icon">

              <Banknote size={20} />

            </div>


            <div>

              <h1>
                Personal Loan Disbursed Loans
              </h1>

              <p>
                View and manage all disbursed loan records
              </p>

            </div>

          </div>


          {/* =================================================
              TOOLBAR
          ================================================= */}

          <div className="disbursed-toolbar">


            {/* EXPORT */}

            <button
              type="button"
              className="disbursed-export-btn"
            >

              <Download size={15} />

              Export CSV

            </button>


            {/* SEARCH */}

            <div className="disbursed-search">

              <Search
                size={16}
                className="disbursed-search-icon"
              />


              <input
                type="text"

                value={search}

                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }

                onKeyDown={(e) => {

                  if (
                    e.key === "Enter"
                  ) {

                    handleSearch();

                  }

                }}

                placeholder="
                  Search LAN, name, mobile...
                "
              />

            </div>


            {/* COUNT */}

            <div className="disbursed-count">

              <strong>
                {pagination.total || 0}
              </strong>

              {" "}Disbursed Records

            </div>


          </div>

        </div>


        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (

          <div className="disbursed-error">

            {error}

          </div>

        )}


        {/* ==================================================
            TABLE
        ================================================== */}

        <div className="disbursed-table-wrapper">


          <table className="disbursed-table">


            {/* TABLE HEADER */}

            <thead>

              <tr>

                <th>
                  Customer Details
                </th>

                <th>
                  LAN
                </th>

                <th>
                  Partner ID
                </th>

                <th>
                  Disbursement
                </th>

                <th>
                  Status
                </th>

              </tr>

            </thead>


            {/* TABLE BODY */}

            <tbody>


              {/* LOADING */}

              {loading ? (

                <tr>

                  <td
                    colSpan="5"
                    className="disbursed-empty"
                  >

                    Loading disbursed loans...

                  </td>

                </tr>

              ) : loans.length === 0 ? (

                /* EMPTY */

                <tr>

                  <td
                    colSpan="5"
                    className="disbursed-empty"
                  >

                    No disbursed loans found.

                  </td>

                </tr>

              ) : (

                /* DATA */

                loans.map((loan) => (

                  <tr
                    key={
                      loan.id ||
                      loan.lan
                    }
                  >


                    {/* =================================================
                        CUSTOMER
                    ================================================= */}

                    <td>

                      <button
                        type="button"

                        className="
                          disbursed-customer
                          transition
                          duration-200
                          hover:text-emerald-600
                        "

                        onClick={() =>
                          openCustomerDetails(
                            loan.lan
                          )
                        }
                      >

                        {
                          loan.customer_full_name ||
                          "—"
                        }

                      </button>


                      <div className="disbursed-subtext">

                        {
                          loan.mobile_number ||
                          "No Mobile"
                        }

                      </div>

                    </td>


                    {/* =================================================
                        LAN
                    ================================================= */}

                    <td>

                      <button
                        type="button"

                        className="
                          disbursed-lan
                          transition-all
                          duration-200
                          hover:border-emerald-400
                          hover:bg-emerald-50
                          hover:text-emerald-700
                          hover:shadow-sm
                        "

                        onClick={() =>
                          openCustomerDetails(
                            loan.lan
                          )
                        }

                        title="
                          View customer details
                        "
                      >

                        {loan.lan || "—"}

                      </button>


                      <div className="disbursed-subtext uppercase">

                        Loan Account No.

                      </div>

                    </td>


                    {/* =================================================
                        PARTNER ID
                    ================================================= */}

                    <td className="disbursed-partner-id">

                      {
                        loan.external_application_reference ||
                        "—"
                      }

                    </td>


                    {/* =================================================
                        DISBURSEMENT
                    ================================================= */}

                    <td className="disbursed-amount">

                      {
                        formatMoney(
                          loan.bre_approved_loan_amount
                        )
                      }

                    </td>


                    {/* =================================================
                        STATUS
                    ================================================= */}

                    <td>

                      <span className="disbursed-status">

                        {
                          loan.status ||
                          "—"
                        }

                      </span>

                    </td>


                  </tr>

                ))

              )}


            </tbody>

          </table>

        </div>


        {/* ==================================================
            PAGINATION
        ================================================== */}

        <div className="disbursed-pagination">


          {/* PREVIOUS */}

          <button
            type="button"

            disabled={
              page <= 1
            }

            onClick={() =>
              setPage(
                page - 1
              )
            }
          >

            <ChevronLeft
              size={16}
            />

          </button>


          {/* CURRENT PAGE */}

          <div className="disbursed-current-page">

            {page}

          </div>


          {/* NEXT */}

          <button
            type="button"

            disabled={
              page >=
              (
                pagination.totalPages ||
                1
              )
            }

            onClick={() =>
              setPage(
                page + 1
              )
            }
          >

            <ChevronRight
              size={16}
            />

          </button>


        </div>


      </div>

    </div>

  );

}


export default DisbursedLoans;