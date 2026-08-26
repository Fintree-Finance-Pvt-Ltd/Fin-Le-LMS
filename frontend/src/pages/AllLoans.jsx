import { useEffect, useState } from "react";
import {
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Download,
  WalletCards,
} from "lucide-react";

import { getAllLoans } from "../services/loanService";

function AllLoans() {
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

  const fetchLoans = async (
    targetPage = page,
    targetSearch = search
  ) => {
    try {
      setLoading(true);
      setError("");

      const data = await getAllLoans({
        page: targetPage,
        pageSize: 25,
        search: targetSearch,
        sortBy: "created_at",
        sortDir: "desc",
      });

      setLoans(data.rows || []);

      setPagination(
        data.pagination || {
          page: 1,
          pageSize: 25,
          total: 0,
          totalPages: 0,
        }
      );
    } catch (err) {
      console.error("Failed to fetch loans:", err);

      setError(
        err.message || "Failed to load loans"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans(page, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = () => {
    if (page !== 1) {
      setPage(1);
    } else {
      fetchLoans(1, search);
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

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(value));
  };

  const formatDate = (value) => {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString("en-IN");
  };

  const getStatusStyle = (status = "") => {
    const value = status.toLowerCase();

    if (
      value.includes("completed") ||
      value.includes("approved") ||
      value.includes("accepted") ||
      value.includes("disbursed")
    ) {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (
      value.includes("rejected") ||
      value.includes("failed")
    ) {
      return "border-red-200 bg-red-50 text-red-700";
    }

    if (
      value.includes("pending") ||
      value.includes("processing")
    ) {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    return "border-slate-300 bg-slate-100 text-slate-700";
  };

  const handleExport = () => {
    console.log("Export CSV");
  };

  const handleView = (loan) => {
    console.log(
      "View loan:",
      loan.partner_loan_id || loan.id
    );
  };

  return (
    <div className="w-full">
      {/* Main card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
              <WalletCards size={20} />
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-950 md:text-2xl">
                Personal Loan All Loans
              </h1>

              <p className="mt-0.5 text-xs text-slate-500">
                View all Personal Loan applications
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Export */}
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Download size={15} />

              Export CSV
            </button>

            {/* Search */}
            <div className="relative w-full sm:w-[290px]">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                placeholder="Search LAN, name, mobile..."
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
              />
            </div>

            {/* Total */}
            <div className="whitespace-nowrap text-sm text-slate-600">
              <span className="font-bold text-slate-950">
                {Number(
                  pagination.total || 0
                ).toLocaleString("en-IN")}
              </span>{" "}
              Records
            </div>
          </div>
        </div>

        {/* Error */}
        {!loading && error && (
          <div className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table wrapper */}
        <div className="m-4 overflow-hidden rounded-xl border border-slate-200 md:m-5">
          <div className="overflow-x-auto">
            <table className="min-w-[1150px] w-full border-collapse">
              {/* Head */}
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                    Customer Name
                  </th>

                  <th className="px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                    LAN
                  </th>

                  <th className="px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                    Partner ID
                  </th>

                  <th className="px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                    Loan Amount
                  </th>

                  <th className="px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                    Disbursement Amount
                  </th>

                  <th className="px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                    Disbursement Date
                  </th>

                  <th className="px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                    Status
                  </th>

                  <th className="px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              {/* Body */}
              <tbody className="divide-y divide-slate-200 bg-white">
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="h-56 px-5 text-center"
                    >
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />

                        <p className="text-sm font-medium text-slate-500">
                          Loading loans...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : loans.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="h-56 px-5 text-center text-sm text-slate-500"
                    >
                      No Personal Loans found.
                    </td>
                  </tr>
                ) : (
                  loans.map((loan, index) => (
                    <tr
                      key={
                        loan.id ||
                        loan.partner_loan_id ||
                        loan.lan ||
                        index
                      }
                      className="transition hover:bg-emerald-50/30"
                    >
                      {/* Customer */}
                      <td className="px-4 py-4">
                        <div className="max-w-[210px]">
                          <p className="font-semibold uppercase text-slate-950">
                            {loan.customer_name || "—"}
                          </p>

                          {loan.mobile && (
                            <p className="mt-1 text-xs text-slate-400">
                              {loan.mobile}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* LAN */}
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs font-medium text-slate-600">
                          {loan.lan || "—"}
                        </span>
                      </td>

                      {/* Partner ID */}
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs font-medium text-slate-600">
                          {loan.partner_application_number ||
                            "—"}
                        </span>
                      </td>

                      {/* Loan amount */}
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-950">
                        {formatMoney(
                          loan.loan_amount
                        )}
                      </td>

                      {/* Disbursed amount */}
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-bold text-slate-950">
                        {formatMoney(
                          loan.disbursal_amount
                        )}
                      </td>

                      {/* Date */}
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                        {formatDate(
                          loan.disbursement_date
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex max-w-[190px] rounded-lg border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide ${getStatusStyle(
                            loan.status
                          )}`}
                        >
                          {loan.status || "—"}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            handleView(loan)
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <Eye size={14} />

                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading &&
            !error &&
            pagination.total > 0 && (
              <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-500">
                  Showing page{" "}
                  <span className="font-semibold text-slate-800">
                    {pagination.page || page}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-800">
                    {pagination.totalPages || 1}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Previous */}
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() =>
                      setPage((current) =>
                        Math.max(
                          1,
                          current - 1
                        )
                      )
                    }
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />

                    Previous
                  </button>

                  {/* Current page */}
                  <div className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white shadow-sm">
                    {page}
                  </div>

                  {/* Next */}
                  <button
                    type="button"
                    disabled={
                      page >=
                      (pagination.totalPages || 1)
                    }
                    onClick={() =>
                      setPage((current) =>
                        current + 1
                      )
                    }
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next

                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default AllLoans;