import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/fintree_logo.png";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const email = formData.email.trim().toLowerCase();

    if (!email || !formData.password) {
      toast.error("Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      await login({
        email,
        password: formData.password,
      });

      toast.success("Authentication successful.");

      navigate("/", {
        replace: true,
        state: { showWelcome: true },
      });
    } catch (error) {
      toast.error(
        error?.message || "Invalid credentials. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f9f8] font-sans">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-260px] h-[520px] w-[700px] -translate-x-1/2 rounded-full bg-emerald-100/50 blur-[130px]" />

        <div className="absolute -bottom-40 -left-40 h-[380px] w-[380px] rounded-full bg-teal-100/30 blur-[110px]" />

        <div className="absolute -right-40 top-1/3 h-[340px] w-[340px] rounded-full bg-emerald-50 blur-[100px]" />

        {/* subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-[470px]">
          {/* Main card */}
          <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            {/* Brand line */}
           
            <div className="px-7 pb-8 pt-8 sm:px-10 sm:pb-10 sm:pt-9">
              {/* Logo */}
              <div className="mb-6 flex justify-center">
                {!logoFailed ? (
                  <img
                    src={logo}
                    alt="Fintree Finance"
                    onError={() => setLogoFailed(true)}
                    className="h-auto w-[190px] object-contain sm:w-[220px]"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-100">
                    <Building2 className="h-10 w-10 text-emerald-700" />
                  </div>
                )}
              </div>

              {/* Heading */}
              <div className="mb-8 text-center">
               <p className="mx-auto mt-2 max-w-[380px] text-lg leading-8 text-slate-500">
  Sign in securely to access the Fintree Loan Management System.
</p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
                noValidate
              >
                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Email address
                  </label>

                  <div className="group relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-600" />

                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      disabled={loading}
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="name@company.com"
                      className="
                        h-[52px]
                        w-full
                        rounded-xl
                        border
                        border-slate-200
                        bg-white
                        pl-11
                        pr-4
                        text-sm
                        font-medium
                        text-slate-900
                        outline-none
                        transition-all
                        placeholder:font-normal
                        placeholder:text-slate-400
                        hover:border-slate-300
                        focus:border-emerald-600
                        focus:ring-4
                        focus:ring-emerald-500/10
                        disabled:cursor-not-allowed
                        disabled:bg-slate-50
                        disabled:text-slate-500
                      "
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-sm font-semibold text-slate-700"
                    >
                      Password
                    </label>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => navigate("/forgot-password")}
                      className="text-xs font-semibold text-emerald-700 transition-colors hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <div className="group relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-600" />

                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      disabled={loading}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      className="
                        h-[52px]
                        w-full
                        rounded-xl
                        border
                        border-slate-200
                        bg-white
                        pl-11
                        pr-12
                        text-sm
                        font-medium
                        text-slate-900
                        outline-none
                        transition-all
                        placeholder:font-normal
                        placeholder:text-slate-400
                        hover:border-slate-300
                        focus:border-emerald-600
                        focus:ring-4
                        focus:ring-emerald-500/10
                        disabled:cursor-not-allowed
                        disabled:bg-slate-50
                        disabled:text-slate-500
                      "
                    />

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      aria-pressed={showPassword}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed"
                    >
                      {showPassword ? (
                        <EyeOff className="h-[18px] w-[18px]" />
                      ) : (
                        <Eye className="h-[18px] w-[18px]" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember */}
                <div className="flex items-center">
                  <input
                    id="remember"
                    name="remember"
                    type="checkbox"
                    disabled={loading}
                    checked={formData.remember}
                    onChange={handleChange}
                    className="
                      h-4
                      w-4
                      cursor-pointer
                      rounded
                      border-slate-300
                      text-emerald-600
                      focus:ring-2
                      focus:ring-emerald-500/20
                      disabled:cursor-not-allowed
                    "
                  />

                  <label
                    htmlFor="remember"
                    className="ml-2 cursor-pointer text-sm text-slate-600"
                  >
                    Remember me for 30 days
                  </label>
                </div>

                {/* Submit */}
             <button
  type="submit"
  disabled={loading}
  className="
    group
    flex
    h-[52px]
    w-full
    items-center
    justify-center
    gap-2
    rounded-xl
    bg-[#0F2A5F]
    px-5
    text-sm
    font-semibold
    text-white
    shadow-sm
    shadow-blue-950/20
    transition-all
    hover:-translate-y-[1px]
    hover:bg-[#123978]
    hover:shadow-md
    focus:outline-none
    focus:ring-4
    focus:ring-blue-900/20
    disabled:translate-y-0
    disabled:cursor-not-allowed
    disabled:bg-[#0F2A5F]/60
    disabled:shadow-none
  "
>
  {loading ? (
    <>
      <Loader2 className="h-5 w-5 animate-spin" />
      Signing in...
    </>
  ) : (
    <>Sign in</>
  )}
</button>
              
              </form>

              {/* Security */}
              <div className="mt-7 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>
                    Secure access protected with enterprise-grade encryption
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-6 text-center">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-400">
             

              <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />

              <span>
                © {new Date().getFullYear()} Fintree Finance
              </span>
            </div>

          </footer>
        </div>
      </div>
    </main>
  );
}