import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock,
  Gauge,
  Landmark,
  RefreshCw,
  Search,
  Wallet,
} from "lucide-react";

import { getPortfolioSummary } from "../../services/loanService";


const STAGE_LABEL = {
  CREATED: "Created",
  CONSENT_RECORDED: "Consent recorded",
  DETAILS_ACCEPTED: "Details accepted",
  DOCUMENTS_PARTIALLY_RECEIVED: "Documents partial",
  DOCUMENTS_RECEIVED: "Documents received",
  DISBURSE_INITIATED: "Disburse initiated",
  DISBURSED: "Disbursed",
};

const BUCKET_STYLE = {
  current: { bar: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700" },
  b1_30: { bar: "bg-amber-500", chip: "bg-amber-50 text-amber-700" },
  b31_60: { bar: "bg-orange-500", chip: "bg-orange-50 text-orange-700" },
  b61_90: { bar: "bg-orange-600", chip: "bg-orange-50 text-orange-700" },
  b90_plus: { bar: "bg-red-500", chip: "bg-red-50 text-red-700" },
};

const inr = (value, decimals = 0) => {
  if (value === null || value === undefined) return "—";

  return "₹" + Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const dateFmt = (iso) => {
  if (!iso) return "—";

  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};


function StatCard({ icon: Icon, label, value, sub, tone = "slate" }) {
  const toneMap = {
    slate: "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneMap[tone]}`}>
        <Icon size={19} />
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold text-slate-900">
        {value}
      </p>

      {sub && (
        <p className="mt-1 text-xs text-slate-500">
          {sub}
        </p>
      )}
    </div>
  );
}


function PortfolioDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [decisionFilter, setDecisionFilter] = useState("");


  const load = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const result = await getPortfolioSummary();

      setData(result);
    } catch (err) {
      setError(err.message || "Failed to load portfolio summary");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);


  const stageOptions = useMemo(() => {
    if (!data) return [];

    return data.stageBreakdown.map((s) => s.status);
  }, [data]);

  const maxStage = useMemo(() => {
    if (!data || !data.stageBreakdown.length) return 1;

    return Math.max(...data.stageBreakdown.map((s) => s.count));
  }, [data]);

  const maxBucket = useMemo(() => {
    if (!data) return 1;

    return Math.max(1, ...data.dpdBuckets.map((b) => b.count));
  }, [data]);

  const filteredCases = useMemo(() => {
    if (!data) return [];

    const q = search.trim().toLowerCase();

    return data.cases.filter((c) => {
      if (stageFilter && c.status !== stageFilter) return false;

      if (decisionFilter === "APPROVED" && c.breFinalStatus !== "APPROVED") return false;
      if (decisionFilter === "PENDING" && c.breFinalStatus === "APPROVED") return false;

      if (q) {
        const haystack = `${c.lan} ${c.customerName} ${c.applicationNumber || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [data, search, stageFilter, decisionFilter]);


  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500">
        Loading portfolio summary&hellip;
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  const t = data.totals;
  const atRiskLoans = data.dpdBuckets
    .filter((b) => b.key !== "current")
    .reduce((s, b) => s + b.count, 0);


  return (
    <div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-600">
            Loan Management
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            Portfolio Overview
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Applications, disbursals, collections and DPD buckets across the personal-loan book.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            As of {new Date(data.generatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          </span>

          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>


      {/* KPI row */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={Landmark} label="Total cases" value={t.totalCases} sub="across the book" />
        <StatCard icon={CheckCircle2} label="Approved" value={t.approvedCases} sub={`${t.totalCases ? Math.round((t.approvedCases / t.totalCases) * 100) : 0}% of book`} tone="emerald" />
        <StatCard icon={Banknote} label="Disbursed" value={t.disbursedCases} sub={`${inr(t.disbursedNetAmount)} net paid out`} tone="violet" />
        <StatCard icon={Clock} label="Awaiting disbursal" value={t.awaitingDisbursal} sub="approved, not yet paid" tone="amber" />
        <StatCard icon={Wallet} label="Collected" value={inr(t.collectedAmount)} sub="principal + interest" />
        <StatCard icon={Gauge} label="Outstanding" value={inr(t.outstandingAmount, 2)} sub={`${t.loansInRepayment} loan(s) in repayment`} />
      </div>


      {/* Funnel + DPD buckets */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Applications by stage
          </h2>

          <div className="mt-4 space-y-3">
            {data.stageBreakdown.map((s) => (
              <div key={s.status} className="grid grid-cols-[150px_1fr_40px] items-center gap-3">
                <span className="truncate text-sm text-slate-600">
                  {STAGE_LABEL[s.status] || s.status}
                </span>

                <div className="h-3.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${(s.count / maxStage) * 100}%` }}
                  />
                </div>

                <span className="text-right text-sm font-semibold text-slate-700">
                  {s.count}
                </span>
              </div>
            ))}
          </div>
        </div>


        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            DPD buckets
          </h2>

          <div className="mt-4 space-y-3">
            {data.dpdBuckets.map((b) => {
              const style = BUCKET_STYLE[b.key];

              return (
                <div key={b.key} className="grid grid-cols-[100px_1fr_28px_90px] items-center gap-3">
                  <span className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <span className={`h-2 w-2 rounded-sm ${style.bar}`} />
                    {b.label}
                  </span>

                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${style.bar} transition-all`}
                      style={{ width: `${(b.count / maxBucket) * 100}%` }}
                    />
                  </div>

                  <span className="text-right text-sm font-semibold text-slate-700">
                    {b.count}
                  </span>

                  <span className="text-right text-xs text-slate-500">
                    {b.count ? inr(b.amount) : "—"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-dashed border-slate-200 pt-4">
            <span className="flex items-center gap-2 text-sm text-slate-600">
              <AlertTriangle size={15} className={atRiskLoans ? "text-amber-500" : "text-slate-300"} />
              Portfolio at risk (30+ DPD)
            </span>

            <span className={`text-xl font-bold ${t.portfolioAtRiskPct === 0 ? "text-emerald-600" : "text-amber-600"}`}>
              {t.portfolioAtRiskPct}%
            </span>
          </div>
        </div>

      </div>


      {/* Disbursement pipeline */}
      {data.disbursementPipeline.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {data.disbursementPipeline.map((p) => {
            const statusKey = String(p.status || "").toLowerCase();

            const border =
              statusKey === "failed" ? "border-l-red-500"
              : statusKey === "success" ? "border-l-emerald-500"
              : "border-l-amber-500";

            return (
              <div key={p.status} className={`rounded-xl border border-slate-200 border-l-4 ${border} bg-white p-4 shadow-sm`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {p.status}
                </p>

                <p className="mt-1 text-xl font-bold text-slate-900">
                  {p.count}
                </p>

                <p className="text-xs text-slate-500">
                  {inr(p.amount)}
                </p>
              </div>
            );
          })}
        </div>
      )}


      {/* Case register */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Case register
          </h2>

          <span className="text-xs text-slate-400">
            {filteredCases.length} of {data.cases.length} cases
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search LAN, customer or application number…"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">All stages</option>
            {stageOptions.map((s) => (
              <option key={s} value={s}>{STAGE_LABEL[s] || s}</option>
            ))}
          </select>

          <select
            value={decisionFilter}
            onChange={(e) => setDecisionFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">All BRE decisions</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2">LAN</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Stage</th>
                <th className="px-3 py-2">BRE decision</th>
                <th className="px-3 py-2 text-right">Requested</th>
                <th className="px-3 py-2 text-right">Approved (net)</th>
                <th className="px-3 py-2 text-right">DPD</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>

            <tbody>
              {filteredCases.map((c) => (
                <tr key={c.lan} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-slate-500">
                    {c.lan}
                  </td>

                  <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-800">
                    {c.customerName}
                  </td>

                  <td className="whitespace-nowrap px-3 py-2.5">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {STAGE_LABEL[c.status] || c.status}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-3 py-2.5">
                    {c.breFinalStatus === "APPROVED" ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                        Pending
                      </span>
                    )}
                  </td>

                  <td className="whitespace-nowrap px-3 py-2.5 text-right text-slate-700">
                    {inr(c.requestedAmount)}
                  </td>

                  <td className="whitespace-nowrap px-3 py-2.5 text-right text-slate-700">
                    {c.approvedNetAmount !== null ? inr(c.approvedNetAmount) : "—"}
                  </td>

                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    {c.dpd === null ? (
                      <span className="text-slate-400">—</span>
                    ) : c.dpd === 0 ? (
                      <span className="font-semibold text-emerald-600">0</span>
                    ) : (
                      <span className="font-semibold text-red-600">{c.dpd}</span>
                    )}
                  </td>

                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">
                    {dateFmt(c.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredCases.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">
              No cases match this filter.
            </p>
          )}
        </div>
      </div>

    </div>
  );
}


export default PortfolioDashboard;
