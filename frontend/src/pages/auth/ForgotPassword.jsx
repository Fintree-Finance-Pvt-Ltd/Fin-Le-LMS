import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Landmark,
  LockKeyhole,
} from "lucide-react";

function ForgotPassword() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    setError("");

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (
      formData.password !==
      formData.confirmPassword
    ) {
      setError("Passwords do not match");
      return;
    }

    // FRONTEND ONLY FOR NOW
    // Later we'll call backend reset-password API here.

    setSuccess(true);
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/60">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={32} />
          </div>

          <h1 className="mt-6 text-2xl font-bold text-slate-900">
            Password updated
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Your password reset form was completed successfully.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/login", {
                replace: true,
              })
            }
            className="mt-7 w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-600"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Branding */}
        <section className="relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -left-32 top-20 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />

          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white">
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

          <div className="relative z-10 max-w-lg">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
              <KeyRound size={24} />
            </div>

            <h2 className="text-4xl font-bold leading-tight text-white">
              Create a new secure password.
            </h2>

            <p className="mt-5 leading-7 text-slate-400">
              Choose a strong password to protect your
              Personal Loan LMS account.
            </p>
          </div>

          <p className="relative z-10 text-xs text-slate-600">
            Personal Loan LMS
          </p>
        </section>

        {/* Form */}
        <section className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 sm:px-6">
          <div className="w-full max-w-md">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft size={17} />
              Back to login
            </button>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
              <div className="mb-7">
                <p className="text-sm font-semibold text-emerald-600">
                  Reset password
                </p>

                <h1 className="mt-2 text-2xl font-bold text-slate-900">
                  Create new password
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Enter your new password and confirm it
                  below.
                </p>
              </div>

              {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                {/* New password */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    New password
                  </label>

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
                      placeholder="Enter new password"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-12 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (previous) => !previous
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Confirm password
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        formData.confirmPassword
                      }
                      onChange={handleChange}
                      placeholder="Confirm new password"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-12 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          (previous) => !previous
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-xs leading-5 text-slate-400">
                  Use at least 8 characters.
                </p>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600"
                >
                  Reset Password
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ForgotPassword;