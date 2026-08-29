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
  getDisbursedLoans
} from "../services/loanService";

import "../styles/DisbursedLoans.css";


function DisbursedLoans() {

  const navigate =
    useNavigate();


  const [loans, setLoans] =
    useState([]);


  const [loading, setLoading] =
    useState(true);


  const [error, setError] =
    useState("");


  const [page, setPage] =
    useState(1);


  const [search, setSearch] =
    useState("");


  const [pagination, setPagination] =
    useState({
      page: 1,
      pageSize: 25,
      total: 0,
      totalPages: 0,
    });



  const fetchLoans = async (
    targetPage = page,
    targetSearch = search
  ) => {

    try {

      setLoading(true);

      setError("");


      const data =
        await getDisbursedLoans({

          page:
            targetPage,

          pageSize:
            25,

          search:
            targetSearch,

          sortBy:
            "created_at",

          sortDir:
            "desc",

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

      console.error(err);

      setError(
        err.message ||
        "Failed to load disbursed loans"
      );

    } finally {

      setLoading(false);

    }

  };



  useEffect(() => {

    fetchLoans(
      page,
      search
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);



  const handleSearch = () => {

    if (page !== 1) {

      setPage(1);

    } else {

      fetchLoans(
        1,
        search
      );

    }

  };



  const formatMoney = (value) => {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {

      return "—";

    }


    const number =
      Number(value);


    if (
      Number.isNaN(number)
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
    ).format(number);

  };



  const openLoan = (loan) => {

    if (!loan?.lan) {
      return;
    }

    navigate(
      `/loan-details/${loan.lan}`
    );

  };



  return (

    <div className="disbursed-page">


      <div className="disbursed-main-card">


        {/* HEADER */}

        <div className="disbursed-header">


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



          <div className="disbursed-toolbar">


            <button
              type="button"
              className="disbursed-export-btn"
            >
              <Download size={15} />
              Export CSV
            </button>



            <div className="disbursed-search">

              <Search
                size={16}
                className="disbursed-search-icon"
              />


              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                onKeyDown={(e) => {

                  if (e.key === "Enter") {
                    handleSearch();
                  }

                }}
                placeholder="Search LAN, name, mobile..."
              />

            </div>



            <div className="disbursed-count">

              <strong>
                {pagination.total || 0}
              </strong>

              {" "}Disbursed Records

            </div>


          </div>


        </div>



        {/* ERROR */}

        {
          error && (

            <div className="disbursed-error">
              {error}
            </div>

          )
        }



        {/* TABLE */}

        <div className="disbursed-table-wrapper">


          <table className="disbursed-table">


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



            <tbody>


              {
                loading ? (

                  <tr>

                    <td
                      colSpan="5"
                      className="disbursed-empty"
                    >
                      Loading disbursed loans...
                    </td>

                  </tr>

                ) : loans.length === 0 ? (

                  <tr>

                    <td
                      colSpan="5"
                      className="disbursed-empty"
                    >
                      No disbursed loans found.
                    </td>

                  </tr>

                ) : (

                  loans.map((loan) => (

                    <tr
                      key={
                        loan.id ||
                        loan.lan
                      }
                    >


                      {/* CUSTOMER */}

                      <td>

                        <button
                          type="button"
                          className="disbursed-customer"
                          onClick={() =>
                            openLoan(loan)
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



                      {/* LAN */}

                      <td>

                        <button
                          type="button"
                          className="disbursed-lan"
                          onClick={() =>
                            openLoan(loan)
                          }
                        >
                          {loan.lan || "—"}
                        </button>


                        <div className="disbursed-subtext uppercase">
                          Loan Account No.
                        </div>

                      </td>



                      {/* PARTNER ID */}

                      <td className="disbursed-partner-id">

                        {
                          loan.external_application_reference ||
                          "—"
                        }

                      </td>



                      {/* DISBURSEMENT */}

                      <td className="disbursed-amount">

                        {
                          formatMoney(
                            loan.bre_approved_loan_amount
                          )
                        }

                      </td>



                      {/* STATUS */}

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

                )
              }


            </tbody>


          </table>


        </div>



        {/* PAGINATION */}

        <div className="disbursed-pagination">


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
            <ChevronLeft size={16} />
          </button>


          <div className="disbursed-current-page">
            {page}
          </div>


          <button
            type="button"
            disabled={
              page >=
              (pagination.totalPages || 1)
            }
            onClick={() =>
              setPage(
                page + 1
              )
            }
          >
            <ChevronRight size={16} />
          </button>


        </div>


      </div>


    </div>

  );

}


export default DisbursedLoans;