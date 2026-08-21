import { useState } from "react";
import { useNavigate } from "react-router";

import {
  Eye,
  EyeOff,
  Landmark,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

function Login() {
  const navigate = useNavigate();

  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  setError("");
  setLoading(true);

  try {
    await login({
  email: formData.email
    .trim()
    .toLowerCase(),

  password: formData.password,
});

    navigate("/", {
      replace: true,
    });
  } catch (error) {
    setError(
      error.message ||
        "Unable to login. Please try again."
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* LEFT BRANDING */}
        <section className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
          {/* Background decoration */}
          <div className="absolute -left-32 top-20 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />

          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl" />

          {/* Logo */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-950/20">
                <Landmark size={24} />
              </div>

              <div>
                <h1 className="text-xl font-bold text-white">
                  LoanLMS
                </h1>

                <p className="text-sm text-slate-400">
                  Personal Loan Management
                </p>
              </div>
            </div>
          </div>

          {/* Main text */}
          <div className="relative z-10 max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
              <ShieldCheck size={14} />

              Secure Financial Workspace
            </div>

            <h2 className="text-4xl font-bold leading-tight text-white xl:text-5xl">
              Manage personal loan operations{" "}
              <span className="text-emerald-400">
                efficiently.
              </span>
            </h2>

            <p className="mt-5 max-w-lg text-base leading-7 text-slate-400">
              Access loan applications,
              customer information, credit
              processing and repayments from one
              secure management system.
            </p>
          </div>

          <div className="relative z-10">
            <p className="text-xs text-slate-600">
              Personal Loan Management System
            </p>
          </div>
        </section>

        {/* RIGHT LOGIN */}
        <section className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 sm:px-6 lg:px-10">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white">
                <Landmark size={21} />
              </div>

              <div>
                <h1 className="font-bold text-slate-900">
                  LoanLMS
                </h1>

                <p className="text-xs text-slate-500">
                  Personal Loan Management
                </p>
              </div>
            </div>

            {/* Login card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
              {/* Header */}
              <div className="mb-7">
                <p className="mb-2 text-sm font-semibold text-emerald-600">
                  Welcome back
                </p>

                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Login to your account
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Enter your registered email
                  and password to continue.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                {/* EMAIL */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Email address
                  </label>

                  <div className="relative">
                    <Mail
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                      disabled={loading}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* PASSWORD */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="text-sm font-semibold text-slate-700"
                    >
                      Password
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          "/forgot-password"
                        )
                      }
                      className="text-xs font-semibold text-emerald-600 transition hover:text-emerald-700"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <div className="relative">
                    <LockKeyhole
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="password"
                      name="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      disabled={loading}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (previous) =>
                            !previous
                        )
                      }
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                {/* LOGIN BUTTON */}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Signing in..."
                    : "Login"}
                </button>
              </form>

              {/* Security */}
              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                <ShieldCheck size={14} />

                Secure session-based
                authentication
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-slate-400">
              Personal Loan Management System
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Login;