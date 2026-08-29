/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import { BadgeCheck, ChevronLeft, ChevronRight, FileText, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getApprovedLoans } from "../services/loanService";

const emptyPagination = { page: 1, pageSize: 25, total: 0, totalPages: 0 };

function ApprovedLoans() {
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState(emptyPagination);

  const fetchLoans = async (targetPage = page, targetSearch = search) => {
    try {
      setLoading(true); setError("");
      const data = await getApprovedLoans({ page: targetPage, pageSize: 25, search: targetSearch });
      setLoans(data?.rows || []); setPagination(data?.pagination || emptyPagination);
    } catch (err) { setError(err.message || "Failed to load approved loans"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLoans(page, search); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps
  const money = (value) => value === null || value === undefined || value === "" ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value));
  const openDetails = (lan) => { navigate(`/approved-loan-details/${lan}`);};

  return <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white"><BadgeCheck size={20} /></div><div><h1 className="text-xl font-bold text-slate-950">Approved Loans</h1><p className="text-xs text-slate-500">View and manage approved loan applications</p></div></div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (page === 1 ? fetchLoans(1, search) : setPage(1))} placeholder="Search LAN, name, mobile..." className="h-10 rounded-xl border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-emerald-500" /></div><div className="text-sm text-slate-600"><span className="font-bold">{pagination.total || 0}</span> Records</div></div>
    </div>
    {error && <div className="mx-5 mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="m-5 overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[1050px] border-collapse"><thead><tr className="bg-slate-50">{["Customer Name", "LAN", "Partner Application Number", "Mobile Number", "Requested Amount", "Approved Loan Amount", "Status", "Actions"].map((head) => <th key={head} className="px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">{head}</th>)}</tr></thead><tbody>
      {loading ? <tr><td colSpan="8" className="py-20 text-center text-slate-500">Loading approved loans...</td></tr> : loans.length === 0 ? <tr><td colSpan="8" className="py-20 text-center text-slate-500">No approved loans found.</td></tr> : loans.map((loan) => <tr key={loan.id || loan.lan} className="transition duration-200 hover:bg-emerald-50/40">
        <td className="px-4 py-4"><button onClick={() => openDetails(loan.lan)} className="font-semibold uppercase text-slate-900 hover:text-emerald-600">{loan.customer_full_name || loan.customer_name || "—"}</button></td>
        <td className="px-4 py-4"><button onClick={() => openDetails(loan.lan)} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-xs hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700">{loan.lan || "—"}</button></td>
        <td className="px-4 py-4 text-xs">{loan.partner_application_number || "—"}</td><td className="px-4 py-4 text-sm">{loan.mobile_number || loan.mobile || "—"}</td><td className="px-4 py-4 font-semibold">{money(loan.requested_amount)}</td><td className="px-4 py-4 font-bold">{money(loan.bre_approved_loan_amount || loan.approved_loan_amount)}</td>
        <td className="px-4 py-4"><span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">{loan.bre_final_status || loan.status || "APPROVED"}</span></td><td className="px-4 py-4"><button onClick={() => navigate(`/documents/${loan.lan}`)} className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"><FileText size={14} />Docs</button></td>
      </tr>)}
    </tbody></table></div>
    <div className="flex justify-center gap-3 p-4"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40"><ChevronLeft size={16} /></button><div className="rounded-lg bg-emerald-500 px-4 py-2 text-white">{page}</div><button disabled={page >= (pagination.totalPages || 1)} onClick={() => setPage(page + 1)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40"><ChevronRight size={16} /></button></div>
  </div>;
}
export default ApprovedLoans;
