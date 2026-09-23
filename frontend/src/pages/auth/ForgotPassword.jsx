import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Landmark,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { authService } from "../../services/authService";


function ForgotPassword() {

  const navigate = useNavigate();


  // ======================================================
  // STEPS
  // email -> otp -> password -> success
  // ======================================================

  const [step, setStep] = useState("email");


  // ======================================================
  // FORM DATA
  // ======================================================

  const [email, setEmail] = useState("");

  const [otp, setOtp] = useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");


  // ======================================================
  // PASSWORD VISIBILITY
  // ======================================================

  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);


  // ======================================================
  // UI STATE
  // ======================================================

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");


  // ======================================================
  // SEND OTP
  // ======================================================

  const handleSendOtp = async (e) => {

    e.preventDefault();

    setError("");
    setMessage("");


    const cleanEmail =
      email
        .trim()
        .toLowerCase();


    if (!cleanEmail) {

      setError(
        "Please enter your registered email address."
      );

      return;

    }


    try {

      setLoading(true);


      const response =
        await authService.forgotPassword(
          cleanEmail
        );


      setEmail(cleanEmail);


      setMessage(
        response?.message ||
        "OTP sent to your registered email."
      );


      setStep("otp");

    }
    catch (error) {

      setError(
        error?.message ||
        "Unable to send OTP. Please try again."
      );

    }
    finally {

      setLoading(false);

    }

  };


  // ======================================================
  // VERIFY OTP
  // ======================================================

  const handleVerifyOtp = async (e) => {

    e.preventDefault();

    setError("");
    setMessage("");


    if (!otp) {

      setError(
        "Please enter the OTP sent to your email."
      );

      return;

    }


    if (otp.length !== 6) {

      setError(
        "OTP must be 6 digits."
      );

      return;

    }


    try {

      setLoading(true);


      const response =
        await authService.verifyOtp(
          email,
          otp
        );


      setMessage(
        response?.message ||
        "OTP verified successfully."
      );


      setStep("password");

    }
    catch (error) {

      setError(
        error?.message ||
        "Invalid or expired OTP."
      );

    }
    finally {

      setLoading(false);

    }

  };


  // ======================================================
  // RESEND OTP
  // ======================================================

  const handleResendOtp = async () => {

    setError("");
    setMessage("");


    try {

      setLoading(true);


      const response =
        await authService.forgotPassword(
          email
        );


      setOtp("");


      setMessage(
        response?.message ||
        "A new OTP has been sent to your email."
      );

    }
    catch (error) {

      setError(
        error?.message ||
        "Unable to resend OTP."
      );

    }
    finally {

      setLoading(false);

    }

  };


  // ======================================================
  // RESET PASSWORD
  // ======================================================

  const handleResetPassword = async (e) => {

    e.preventDefault();

    setError("");
    setMessage("");


    if (!newPassword) {

      setError(
        "Please enter your new password."
      );

      return;

    }


    if (newPassword.length < 8) {

      setError(
        "Password must be at least 8 characters long."
      );

      return;

    }


    if (!confirmPassword) {

      setError(
        "Please confirm your new password."
      );

      return;

    }


    if (
      newPassword !==
      confirmPassword
    ) {

      setError(
        "New password and confirm password do not match."
      );

      return;

    }


    try {

      setLoading(true);


      const response =
        await authService.resetPassword({

          email,

          otp,

          newPassword,

          confirmPassword,

        });


      setMessage(
        response?.message ||
        "Password reset successfully."
      );


      setStep("success");

    }
    catch (error) {

      setError(
        error?.message ||
        "Unable to reset password. Please try again."
      );

    }
    finally {

      setLoading(false);

    }

  };


  // ======================================================
  // BACK HANDLER
  // ======================================================

  const handleBack = () => {

    setError("");
    setMessage("");


    if (step === "otp") {

      setOtp("");

      setStep("email");

      return;

    }


    if (step === "password") {

      setNewPassword("");
      setConfirmPassword("");

      setStep("otp");

      return;

    }


    navigate("/login");

  };


  // ======================================================
  // LEFT SIDE CONTENT
  // ======================================================

  const getLeftContent = () => {

    if (step === "email") {

      return {

        title:
          "Recover your account securely.",

        description:
          "Enter your registered email address and we'll send a secure OTP to verify your identity.",

      };

    }


    if (step === "otp") {

      return {

        title:
          "Verify your identity.",

        description:
          "Enter the 6-digit OTP sent to your registered email address to continue resetting your password.",

      };

    }


    if (step === "password") {

      return {

        title:
          "Create a new secure password.",

        description:
          "Choose a strong password to protect your Personal Loan LMS account.",

      };

    }


    return {

      title:
        "Your password is updated.",

      description:
        "You can now securely access your Personal Loan LMS account using your new password.",

    };

  };


  const leftContent =
    getLeftContent();


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


          {/* BACKGROUND GLOW */}

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


          {/* MAIN CONTENT */}

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

              Secure Password Recovery

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

              {
                leftContent.title
              }

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

              {
                leftContent.description
              }

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


            {/* BACK BUTTON */}

            {
              step !== "success" && (

                <button

                  type="button"

                  onClick={handleBack}

                  disabled={loading}

                  className="
                    mb-5
                    flex
                    items-center
                    gap-2
                    text-sm
                    font-semibold
                    text-slate-500
                    transition
                    hover:text-slate-900
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >

                  <ArrowLeft size={17} />

                  {
                    step === "email"
                      ? "Back to login"
                      : "Back"
                  }

                </button>

              )
            }


            {/* =================================================
                CARD
            ================================================= */}

            <div
              className="
                rounded-3xl
                border
                border-slate-200
                bg-white
                p-6
                shadow-xl
                shadow-slate-200/60
                sm:p-8
              "
            >


              {/* =================================================
                  STEP 1 - EMAIL
              ================================================= */}

              {
                step === "email" && (

                  <>

                    <div className="mb-7">


                      <div
                        className="
                          mb-5
                          flex
                          h-12
                          w-12
                          items-center
                          justify-center
                          rounded-2xl
                          bg-emerald-50
                          text-emerald-600
                        "
                      >

                        <Mail size={24} />

                      </div>


                      <p
                        className="
                          text-sm
                          font-semibold
                          text-emerald-600
                        "
                      >
                        Password recovery
                      </p>


                      <h1
                        className="
                          mt-2
                          text-2xl
                          font-bold
                          text-slate-900
                        "
                      >
                        Forgot your password?
                      </h1>


                      <p
                        className="
                          mt-2
                          text-sm
                          leading-6
                          text-slate-500
                        "
                      >
                        Enter your registered email address.
                        We will send you a 6-digit OTP.
                      </p>

                    </div>


                    {
                      error && (

                        <div
                          className="
                            mb-5
                            rounded-xl
                            border
                            border-red-200
                            bg-red-50
                            px-4
                            py-3
                            text-sm
                            font-medium
                            text-red-700
                          "
                        >
                          {error}
                        </div>

                      )
                    }


                    <form
                      onSubmit={handleSendOtp}
                      className="space-y-5"
                    >


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

                            value={email}

                            onChange={(e) =>
                              setEmail(
                                e.target.value
                              )
                            }

                            placeholder="Enter registered email"

                            autoComplete="email"

                            required

                            disabled={loading}

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
                          px-4
                          py-3
                          text-sm
                          font-bold
                          text-white
                          shadow-lg
                          shadow-emerald-500/20
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
                            ? "Sending OTP..."
                            : "Send OTP"
                        }

                      </button>

                    </form>

                  </>

                )
              }


              {/* =================================================
                  STEP 2 - OTP
              ================================================= */}

              {
                step === "otp" && (

                  <>

                    <div className="mb-7">


                      <div
                        className="
                          mb-5
                          flex
                          h-12
                          w-12
                          items-center
                          justify-center
                          rounded-2xl
                          bg-emerald-50
                          text-emerald-600
                        "
                      >

                        <KeyRound size={24} />

                      </div>


                      <p
                        className="
                          text-sm
                          font-semibold
                          text-emerald-600
                        "
                      >
                        OTP verification
                      </p>


                      <h1
                        className="
                          mt-2
                          text-2xl
                          font-bold
                          text-slate-900
                        "
                      >
                        Verify your OTP
                      </h1>


                      <p
                        className="
                          mt-2
                          text-sm
                          leading-6
                          text-slate-500
                        "
                      >
                        Enter the 6-digit OTP sent to
                      </p>


                      <p
                        className="
                          mt-1
                          break-all
                          text-sm
                          font-semibold
                          text-slate-800
                        "
                      >
                        {email}
                      </p>

                    </div>


                    {
                      message && (

                        <div
                          className="
                            mb-5
                            rounded-xl
                            border
                            border-emerald-200
                            bg-emerald-50
                            px-4
                            py-3
                            text-sm
                            font-medium
                            text-emerald-700
                          "
                        >
                          {message}
                        </div>

                      )
                    }


                    {
                      error && (

                        <div
                          className="
                            mb-5
                            rounded-xl
                            border
                            border-red-200
                            bg-red-50
                            px-4
                            py-3
                            text-sm
                            font-medium
                            text-red-700
                          "
                        >
                          {error}
                        </div>

                      )
                    }


                    <form
                      onSubmit={handleVerifyOtp}
                      className="space-y-5"
                    >


                      <div>

                        <label
                          htmlFor="otp"
                          className="
                            mb-2
                            block
                            text-sm
                            font-semibold
                            text-slate-700
                          "
                        >
                          Enter OTP
                        </label>


                        <div className="relative">

                          <KeyRound
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

                            id="otp"

                            type="text"

                            value={otp}

                            onChange={(e) => {

                              const value =
                                e.target.value
                                  .replace(
                                    /\D/g,
                                    ""
                                  )
                                  .slice(
                                    0,
                                    6
                                  );


                              setOtp(value);

                            }}

                            inputMode="numeric"

                            maxLength={6}

                            autoComplete="one-time-code"

                            placeholder="Enter 6-digit OTP"

                            disabled={loading}

                            required

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
                              font-semibold
                              tracking-[0.22em]
                              text-slate-900
                              outline-none
                              transition
                              placeholder:font-normal
                              placeholder:tracking-normal
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
                          px-4
                          py-3
                          text-sm
                          font-bold
                          text-white
                          shadow-lg
                          shadow-emerald-500/20
                          transition
                          hover:bg-emerald-600
                          disabled:cursor-not-allowed
                          disabled:opacity-60
                        "
                      >

                        {
                          loading
                            ? "Verifying OTP..."
                            : "Verify OTP"
                        }

                      </button>


                      <div
                        className="
                          flex
                          items-center
                          justify-center
                          gap-1
                          text-sm
                        "
                      >

                        <span className="text-slate-500">
                          Didn't receive the OTP?
                        </span>


                        <button

                          type="button"

                          disabled={loading}

                          onClick={
                            handleResendOtp
                          }

                          className="
                            font-semibold
                            text-emerald-600
                            transition
                            hover:text-emerald-700
                            hover:underline
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                          "
                        >
                          Resend OTP
                        </button>

                      </div>

                    </form>

                  </>

                )
              }


              {/* =================================================
                  STEP 3 - NEW PASSWORD
              ================================================= */}

              {
                step === "password" && (

                  <>

                    <div className="mb-7">


                      <div
                        className="
                          mb-5
                          flex
                          h-12
                          w-12
                          items-center
                          justify-center
                          rounded-2xl
                          bg-emerald-50
                          text-emerald-600
                        "
                      >

                        <LockKeyhole size={24} />

                      </div>


                      <p
                        className="
                          text-sm
                          font-semibold
                          text-emerald-600
                        "
                      >
                        Reset password
                      </p>


                      <h1
                        className="
                          mt-2
                          text-2xl
                          font-bold
                          text-slate-900
                        "
                      >
                        Create new password
                      </h1>


                      <p
                        className="
                          mt-2
                          text-sm
                          leading-6
                          text-slate-500
                        "
                      >
                        OTP verified successfully.
                        Enter and confirm your new password.
                      </p>

                    </div>


                    {
                      error && (

                        <div
                          className="
                            mb-5
                            rounded-xl
                            border
                            border-red-200
                            bg-red-50
                            px-4
                            py-3
                            text-sm
                            font-medium
                            text-red-700
                          "
                        >
                          {error}
                        </div>

                      )
                    }


                    <form
                      onSubmit={
                        handleResetPassword
                      }
                      className="space-y-5"
                    >


                      {/* NEW PASSWORD */}

                      <div>

                        <label
                          htmlFor="newPassword"
                          className="
                            mb-2
                            block
                            text-sm
                            font-semibold
                            text-slate-700
                          "
                        >
                          New password
                        </label>


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

                            id="newPassword"

                            type={
                              showPassword
                                ? "text"
                                : "password"
                            }

                            value={
                              newPassword
                            }

                            onChange={(e) =>
                              setNewPassword(
                                e.target.value
                              )
                            }

                            placeholder="Enter new password"

                            autoComplete="new-password"

                            required

                            disabled={loading}

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

                            onClick={() =>
                              setShowPassword(
                                (previous) =>
                                  !previous
                              )
                            }

                            disabled={loading}

                            className="
                              absolute
                              right-3
                              top-1/2
                              -translate-y-1/2
                              rounded-lg
                              p-1.5
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

                      </div>


                      {/* CONFIRM PASSWORD */}

                      <div>

                        <label
                          htmlFor="confirmPassword"
                          className="
                            mb-2
                            block
                            text-sm
                            font-semibold
                            text-slate-700
                          "
                        >
                          Confirm password
                        </label>


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

                            id="confirmPassword"

                            type={
                              showConfirmPassword
                                ? "text"
                                : "password"
                            }

                            value={
                              confirmPassword
                            }

                            onChange={(e) =>
                              setConfirmPassword(
                                e.target.value
                              )
                            }

                            placeholder="Confirm new password"

                            autoComplete="new-password"

                            required

                            disabled={loading}

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
                            onClick={() =>
                              setShowConfirmPassword(
                                (previous) => !previous
                              )
                            }
                            className="
    absolute
    right-3
    top-1/2
    -translate-y-1/2
    rounded-lg
    p-1.5
    text-slate-400
    transition
    hover:bg-slate-100
    hover:text-slate-700
  "
                          >
                            {showConfirmPassword ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>

                        </div>

                      </div>


                      <p
                        className="
                          text-xs
                          leading-5
                          text-slate-400
                        "
                      >
                        Use at least 8 characters.
                      </p>


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
                          px-4
                          py-3
                          text-sm
                          font-bold
                          text-white
                          shadow-lg
                          shadow-emerald-500/20
                          transition
                          hover:bg-emerald-600
                          disabled:cursor-not-allowed
                          disabled:opacity-60
                        "
                      >

                        {
                          loading
                            ? "Resetting password..."
                            : "Reset Password"
                        }

                      </button>

                    </form>

                  </>

                )
              }


              {/* =================================================
                  STEP 4 - SUCCESS
              ================================================= */}

              {
                step === "success" && (

                  <div className="text-center">


                    <div
                      className="
                        mx-auto
                        flex
                        h-16
                        w-16
                        items-center
                        justify-center
                        rounded-2xl
                        bg-emerald-50
                        text-emerald-600
                      "
                    >

                      <CheckCircle2 size={32} />

                    </div>


                    <p
                      className="
                        mt-6
                        text-sm
                        font-semibold
                        text-emerald-600
                      "
                    >
                      Password reset complete
                    </p>


                    <h1
                      className="
                        mt-2
                        text-2xl
                        font-bold
                        text-slate-900
                      "
                    >
                      Password updated
                    </h1>


                    <p
                      className="
                        mt-3
                        text-sm
                        leading-6
                        text-slate-500
                      "
                    >
                      Your password has been reset
                      successfully. You can now log in
                      using your new password.
                    </p>


                    <button

                      type="button"

                      onClick={() =>
                        navigate(
                          "/login",
                          {
                            replace: true,
                          }
                        )
                      }

                      className="
                        mt-7
                        w-full
                        rounded-xl
                        bg-emerald-500
                        px-4
                        py-3
                        text-sm
                        font-bold
                        text-white
                        shadow-lg
                        shadow-emerald-500/20
                        transition
                        hover:bg-emerald-600
                      "
                    >
                      Back to Login
                    </button>

                  </div>

                )
              }


              {/* =================================================
                  SECURITY FOOTER
              ================================================= */}

              {
                step !== "success" && (

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

                    Secure password recovery

                  </div>

                )
              }


            </div>

          </div>

        </section>

      </div>

    </div>

  );

}


export default ForgotPassword;