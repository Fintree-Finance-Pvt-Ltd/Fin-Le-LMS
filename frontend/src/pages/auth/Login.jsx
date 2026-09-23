import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Eye,
  EyeOff,
  Landmark,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

import toast from "react-hot-toast";

import { useAuth } from "../../context/AuthContext";


function Login() {

  const navigate = useNavigate();

  const { login } = useAuth();


  // ======================================================
  // FORM STATE
  // ======================================================

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });


  const [showPassword, setShowPassword] =
    useState(false);


  const [loading, setLoading] =
    useState(false);


  // ======================================================
  // INPUT CHANGE
  // ======================================================

  const handleChange = (e) => {

    const {
      name,
      value,
    } = e.target;


    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

  };


  // ======================================================
  // LOGIN
  // ======================================================

  const handleSubmit = async (e) => {

    e.preventDefault();


    if (
      !formData.email.trim() ||
      !formData.password
    ) {

      toast.error(
        "Please enter email and password"
      );

      return;

    }


    setLoading(true);


    try {

      await login({

        email:
          formData.email
            .trim()
            .toLowerCase(),

        password:
          formData.password,

      });


      toast.success(
        "Login successful"
      );


      navigate("/", {
        replace: true,
      });

    }
    catch (error) {

      toast.error(
        error?.message ||
        "Unable to login. Please try again."
      );

    }
    finally {

      setLoading(false);

    }

  };


  // ======================================================
  // PAGE
  // ======================================================

  return (

    <div className="min-h-screen bg-slate-950">

      <div className="grid min-h-screen lg:grid-cols-2">


        {/* =================================================
            LEFT SECTION
        ================================================= */}

        <section
          className="
            relative
            hidden
            overflow-hidden
            bg-slate-950
            lg:flex
            lg:flex-col
            lg:justify-between
            lg:p-12
          "
        >


          {/* BACKGROUND EFFECTS */}

          <div
            className="
              pointer-events-none
              absolute
              -left-32
              top-20
              h-80
              w-80
              rounded-full
              bg-emerald-500/20
              blur-3xl
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              bottom-0
              right-0
              h-96
              w-96
              rounded-full
              bg-teal-400/10
              blur-3xl
            "
          />


          {/* LOGO */}

          <div className="relative z-10">

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-2xl
                  bg-emerald-500
                  text-white
                  shadow-lg
                  shadow-emerald-500/20
                "
              >

                <Landmark size={24} />

              </div>


              <div>

                <h1
                  className="
                    text-xl
                    font-bold
                    text-white
                  "
                >
                  LoanLMS
                </h1>


                <p
                  className="
                    text-sm
                    text-slate-400
                  "
                >
                  Personal Loan Management
                </p>

              </div>

            </div>

          </div>


          {/* MAIN LEFT CONTENT */}

          <div
            className="
              relative
              z-10
              max-w-xl
            "
          >

            <div
              className="
                mb-5
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-emerald-400/20
                bg-emerald-400/10
                px-3
                py-1.5
                text-xs
                font-semibold
                text-emerald-300
              "
            >

              <ShieldCheck size={14} />

              Secure Financial Workspace

            </div>


            <h2
              className="
                text-4xl
                font-bold
                leading-tight
                text-white
                xl:text-5xl
              "
            >

              Manage personal loan operations{" "}

              <span className="text-emerald-400">
                efficiently.
              </span>

            </h2>


            <p
              className="
                mt-5
                max-w-lg
                text-base
                leading-7
                text-slate-400
              "
            >

              Access loan applications,
              customer information,
              credit processing and repayments
              from one secure management system.

            </p>

          </div>


          {/* FOOTER */}

          <p
            className="
              relative
              z-10
              text-xs
              text-slate-600
            "
          >
            Personal Loan Management System
          </p>

        </section>


        {/* =================================================
            RIGHT SECTION
        ================================================= */}

        <section
          className="
            flex
            min-h-screen
            items-center
            justify-center
            bg-slate-50
            px-4
            py-10
          "
        >

          <div className="w-full max-w-md">


            {/* LOGIN CARD */}

            <div
              className="
                rounded-3xl
                border
                border-slate-200
                bg-white
                p-6
                shadow-xl
                shadow-slate-200/70
                sm:p-8
              "
            >


              {/* HEADER */}

              <div className="mb-7">

                <p
                  className="
                    mb-2
                    text-sm
                    font-semibold
                    text-emerald-600
                  "
                >
                  Welcome back
                </p>


                <h2
                  className="
                    text-2xl
                    font-bold
                    text-slate-900
                  "
                >
                  Login to your account
                </h2>


                <p
                  className="
                    mt-2
                    text-sm
                    text-slate-500
                  "
                >
                  Enter your registered email and password.
                </p>

              </div>


              {/* LOGIN FORM */}

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >


                {/* EMAIL */}

                <div>

                  <label
                    htmlFor="email"
                    className="
                      mb-2
                      block
                      text-sm
                      font-semibold
                      text-slate-700
                    "
                  >
                    Email address
                  </label>


                  <div className="relative">

                    <Mail
                      size={18}
                      className="
                        absolute
                        left-3.5
                        top-1/2
                        -translate-y-1/2
                        text-slate-400
                      "
                    />


                    <input

                      id="email"

                      type="email"

                      name="email"

                      value={formData.email}

                      onChange={handleChange}

                      disabled={loading}

                      required

                      autoComplete="email"

                      placeholder="Enter your email"

                      className="
                        w-full
                        rounded-xl
                        border
                        border-slate-200
                        bg-slate-50
                        py-3
                        pl-11
                        pr-4
                        text-sm
                        text-slate-900
                        outline-none
                        transition
                        placeholder:text-slate-400
                        focus:border-emerald-500
                        focus:bg-white
                        focus:ring-4
                        focus:ring-emerald-500/10
                        disabled:cursor-not-allowed
                        disabled:opacity-60
                      "
                    />

                  </div>

                </div>


                {/* PASSWORD */}

                <div>

                  <div
                    className="
                      mb-2
                      flex
                      items-center
                      justify-between
                    "
                  >

                    <label
                      htmlFor="password"
                      className="
                        text-sm
                        font-semibold
                        text-slate-700
                      "
                    >
                      Password
                    </label>

                  </div>


                  <div className="relative">

                    <LockKeyhole
                      size={18}
                      className="
                        absolute
                        left-3.5
                        top-1/2
                        -translate-y-1/2
                        text-slate-400
                      "
                    />


                    <input

                      id="password"

                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }

                      name="password"

                      value={formData.password}

                      onChange={handleChange}

                      disabled={loading}

                      required

                      autoComplete="current-password"

                      placeholder="Enter your password"

                      className="
                        w-full
                        rounded-xl
                        border
                        border-slate-200
                        bg-slate-50
                        py-3
                        pl-11
                        pr-12
                        text-sm
                        text-slate-900
                        outline-none
                        transition
                        placeholder:text-slate-400
                        focus:border-emerald-500
                        focus:bg-white
                        focus:ring-4
                        focus:ring-emerald-500/10
                        disabled:cursor-not-allowed
                        disabled:opacity-60
                      "
                    />


                    <button

                      type="button"

                      disabled={loading}

                      onClick={() =>
                        setShowPassword(
                          (previous) =>
                            !previous
                        )
                      }

                      className="
                        absolute
                        right-3
                        top-1/2
                        flex
                        -translate-y-1/2
                        items-center
                        justify-center
                        rounded-lg
                        p-1
                        text-slate-400
                        transition
                        hover:bg-slate-100
                        hover:text-slate-700
                        disabled:cursor-not-allowed
                      "
                    >

                      {
                        showPassword
                          ?
                          <EyeOff size={18} />
                          :
                          <Eye size={18} />
                      }

                    </button>

                  </div>


                  {/* FORGOT PASSWORD */}

                  <div
                    className="
                      mt-3
                      flex
                      justify-end
                    "
                  >

                    <button

                      type="button"

                      disabled={loading}

                      onClick={() =>
                        navigate(
                          "/forgot-password"
                        )
                      }

                      className="
                        text-xs
                        font-semibold
                        text-emerald-600
                        transition
                        hover:text-emerald-700
                        hover:underline
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                      "
                    >
                      Forgot password?
                    </button>

                  </div>

                </div>


                {/* LOGIN BUTTON */}

                <button

                  type="submit"

                  disabled={loading}

                  className="
                    flex
                    w-full
                    items-center
                    justify-center
                    rounded-xl
                    bg-emerald-500
                    py-3
                    text-sm
                    font-bold
                    text-white
                    shadow-sm
                    transition
                    hover:bg-emerald-600
                    focus:outline-none
                    focus:ring-4
                    focus:ring-emerald-500/20
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >

                  {
                    loading
                      ? "Signing in..."
                      : "Login"
                  }

                </button>

              </form>


              {/* SECURITY MESSAGE */}

              <div
                className="
                  mt-6
                  flex
                  items-center
                  justify-center
                  gap-2
                  text-xs
                  text-slate-400
                "
              >

                <ShieldCheck size={14} />

                Secure session-based authentication

              </div>

            </div>

          </div>

        </section>

      </div>

    </div>

  );

}


export default Login;