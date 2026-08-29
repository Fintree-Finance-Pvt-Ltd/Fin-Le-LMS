import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  FilePlus2,
  FileText,
  Mail,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";

import AppSidebar from "../components/layout/AppSidebar";
import Topbar from "../components/layout/Topbar";
import { apiFetch } from "../services/api";

const quickActions = [
  {
    title: "New Loan Application",
    description: "Create and submit a personal loan application.",
    icon: FilePlus2,
  },
  {
    title: "View Applications",
    description: "Review and manage existing loan applications.",
    icon: FileText,
  },
  {
    title: "Repayments",
    description: "Track payments and repayment schedules.",
    icon: WalletCards,
  },
  {
    title: "Reports",
    description: "View financial and operational reports.",
    icon: BarChart3,
  },
];

function Home() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const data = await apiFetch("/me");

        setUser(data.user);
      } catch (error) {
        console.error(
          "Get current user error:",
          error
        );

        if (
          error.message === "Not authenticated"
        ) {
          navigate("/login", {
            replace: true,
          });

          return;
        }

        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, [navigate]);

  useEffect(() => {
  if (
    !loading &&
    user &&
    location.state?.showWelcome
  ) {
    setShowWelcomeToast(true);

    // Remove the state so refreshing doesn't
    // display the toast again.
    window.history.replaceState(
      {},
      document.title
    );

    const timer = setTimeout(() => {
      setShowWelcomeToast(false);
    }, 3500);

    return () => clearTimeout(timer);
  }
}, [loading, user, location.state]);

  const handleLogout = async () => {
    try {
      await apiFetch("/logout", {
        method: "POST",
      });

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error("Logout error:", error);
      setError(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />

          <p className="mt-4 text-sm font-medium text-slate-500">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  const firstName =
    user?.name?.split(" ")[0] || "User";

  return (
    <div className="min-h-screen bg-slate-50">
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="min-h-screen lg:pl-72">
        <Topbar
          user={user}
          onMenuClick={() =>
            setSidebarOpen(true)
          }
          onLogout={handleLogout}
        />

        {showWelcomeToast && (
  <div className="fixed right-3 top-20 z-[100] w-[calc(100%-24px)] max-w-sm sm:right-6 sm:w-auto sm:min-w-[320px]">
    <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-xl shadow-slate-300/30">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
        <ShieldCheck size={20} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
          Login Successful
        </p>

        <p className="mt-0.5 truncate text-sm font-bold text-slate-900">
          Welcome, {user?.name || "User"}
        </p>
      </div>

      <button
        type="button"
        onClick={() =>
          setShowWelcomeToast(false)
        }
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  </div>
)}

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">
            {/* Error */}
            {error && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {/* Welcome */}
            <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-8 text-white shadow-xl shadow-slate-200/70 sm:px-8 sm:py-10 lg:px-10">
              {/* Decoration */}
              <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />

              <div className="absolute -bottom-24 right-32 h-52 w-52 rounded-full bg-teal-400/10 blur-3xl" />

              <div className="relative z-10 max-w-3xl">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                  <ShieldCheck size={14} />
                  Secure Loan Management
                </div>

                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                  Welcome back,{" "}
                  <span className="text-emerald-400">
                    {firstName}
                  </span>
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  Manage personal loan
                  applications, repayments and
                  customer information from one
                  secure workspace.
                </p>
              </div>
            </section>

            {/* Section title */}
            <div className="mb-4 mt-8 flex items-end justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                  Quick Actions
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Common loan management tasks
                </p>
              </div>
            </div>

            {/* Quick actions */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {quickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <div
                    key={action.title}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg hover:shadow-slate-200/70"
                  >
                    <div className="mb-5 flex items-start justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition group-hover:bg-emerald-500 group-hover:text-white">
                        <Icon size={21} />
                      </div>

                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Coming soon
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900">
                      {action.title}
                    </h3>

                    <p className="mt-2 min-h-10 text-sm leading-5 text-slate-500">
                      {action.description}
                    </p>

                    <div className="mt-5 flex items-center gap-1 text-xs font-bold text-emerald-600">
                      View module
                      <ArrowRight size={14} />
                    </div>
                  </div>
                );
              })}
            </section>

            {/* Lower section */}
            <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
              {/* Profile */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
                  <div>
                    <h2 className="font-bold text-slate-900">
                      Account Information
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Your authenticated account
                      details
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <UserRound size={20} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-x-8 gap-y-6 p-5 sm:grid-cols-2 sm:p-6">
                  {/* Name */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Full Name
                    </p>

                    <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <UserRound
                        size={16}
                        className="text-emerald-500"
                      />

                      {user?.name || "—"}
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Email Address
                    </p>

                    <div className="mt-2 flex items-center gap-2 break-all text-sm font-semibold text-slate-800">
                      <Mail
                        size={16}
                        className="shrink-0 text-emerald-500"
                      />

                      {user?.email || "—"}
                    </div>
                  </div>

                  {/* Role */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Account Role
                    </p>

                    <div className="mt-2 flex items-center gap-2 text-sm font-semibold capitalize text-slate-800">
                      <ShieldCheck
                        size={16}
                        className="text-emerald-500"
                      />

                      {user?.role || "—"}
                    </div>
                  </div>

                  {/* Created */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Member Since
                    </p>

                    <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <CalendarDays
                        size={16}
                        className="text-emerald-500"
                      />

                      {user?.created_at
                        ? new Date(
                            user.created_at
                          ).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }
                          )
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Account status */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  Account Status
                </p>

                <div className="mt-5 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <ShieldCheck size={24} />
                  </div>

                  <div>
                    <p className="font-bold text-slate-900">
                      {user?.is_active
                        ? "Active Account"
                        : "Inactive Account"}
                    </p>

                    <p className="mt-0.5 text-sm text-slate-500">
                      User ID #{user?.id || "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        user?.is_active
                          ? "bg-emerald-500"
                          : "bg-red-500"
                      }`}
                    />

                    <p className="text-sm font-semibold text-emerald-800">
                      {user?.is_active
                        ? "Your account is currently active."
                        : "Your account is currently inactive."}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Home;