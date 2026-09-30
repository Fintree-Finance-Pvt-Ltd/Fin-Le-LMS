import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
    ArrowLeft,
    User,
    WalletCards,
    Landmark,
    MapPin,
    ShieldCheck,
    BriefcaseBusiness,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Clock3,
    AlertCircle,
} from "lucide-react";

import { rejectLoan } from "../services/loanService";


function CustomerDetails() {

    const { lan } = useParams();

    const navigate = useNavigate();

    const [data, setData] = useState(null);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");

    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [customReason, setCustomReason] = useState("");
    const [rejecting, setRejecting] = useState(false);

    const handleRejectConfirm = async () => {
        const finalReason =
            rejectReason === "Other"
                ? customReason.trim()
                : (rejectReason || customReason).trim();

        if (!finalReason) {
            toast.error("Please provide a rejection reason");
            return;
        }

        setRejecting(true);
        try {
            await rejectLoan(lan, { rejectReason: finalReason });
            toast.success("Case rejected successfully! LOS notified.");
            setIsRejectModalOpen(false);
            setRejectReason("");
            setCustomReason("");
            await fetchCustomerDetails();
        } catch (err) {
            toast.error(err.message || "Failed to reject loan");
        } finally {
            setRejecting(false);
        }
    };


    // =====================================================
    // FETCH CUSTOMER DETAILS
    // =====================================================

    const fetchCustomerDetails = async () => {

        try {

            setLoading(true);

            setError("");


            const response = await fetch(
                `/api/loans/customer-details/${encodeURIComponent(lan)}`,
                {
                    method: "GET",

                    credentials: "include",

                    headers: {
                        Accept: "application/json",
                    },
                }
            );


            // =================================================
            // CHECK RESPONSE TYPE
            // =================================================

            const contentType =
                response.headers.get("content-type") || "";


            if (!contentType.includes("application/json")) {

                const text = await response.text();

                console.error(
                    "Expected JSON but received:",
                    text.substring(0, 500)
                );

                throw new Error(
                    `Customer details API returned ${response.status} ${response.statusText} instead of JSON. Please check API/proxy configuration.`
                );

            }


            // =================================================
            // PARSE JSON
            // =================================================

            const result = await response.json();


            if (!response.ok) {

                throw new Error(
                    result.message ||
                    result.error?.message ||
                    `Request failed with status ${response.status}`
                );

            }


            if (!result.success) {

                throw new Error(
                    result.message ||
                    "Failed to fetch customer details"
                );

            }


            console.log(
                "Customer details API response:",
                result.data
            );


            setData(result.data);

        }

        catch (err) {

            console.error(
                "Customer details error:",
                err
            );

            setError(
                err.message ||
                "Failed to load customer details"
            );

        }

        finally {

            setLoading(false);


        }

    };


    // =====================================================
    // INITIAL LOAD
    // =====================================================

    useEffect(() => {

        if (lan) {
            fetchCustomerDetails();
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps

    }, [lan]);


    // =====================================================
    // HELPERS
    // =====================================================

    const displayValue = (value) => {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return "—";
        }

        return String(value);

    };


    const formatMoney = (value) => {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return "—";
        }

        const number = Number(value);

        if (Number.isNaN(number)) {
            return displayValue(value);
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


    const formatDate = (value) => {

        if (!value) {
            return "—";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return displayValue(value);
        }

        return date.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
            }
        );

    };


    // =====================================================
    // STATUS CONFIG
    // =====================================================

    const getStatusConfig = (status) => {

        const value =
            String(status || "")
                .toUpperCase();


        if (
            value.includes("APPROVED") ||
            value.includes("VERIFIED") ||
            value.includes("ACCEPTED") ||
            value.includes("DISBURSED") ||
            value.includes("SUCCESS")
        ) {

            return {
                className:
                    "border-emerald-200 bg-emerald-50 text-emerald-700",

                icon:
                    <CheckCircle2 size={14} />,
            };

        }


        if (
            value.includes("REJECTED") ||
            value.includes("FAILED")
        ) {

            return {
                className:
                    "border-red-200 bg-red-50 text-red-700",

                icon:
                    <XCircle size={14} />,
            };

        }


        if (
            value.includes("PENDING") ||
            value.includes("INITIATED") ||
            value.includes("PROCESSING")
        ) {

            return {
                className:
                    "border-amber-200 bg-amber-50 text-amber-700",

                icon:
                    <Clock3 size={14} />,
            };

        }


        return {
            className:
                "border-slate-200 bg-slate-50 text-slate-700",

            icon:
                <AlertCircle size={14} />,
        };

    };


    // =====================================================
    // SECTION CARD
    // =====================================================

    const SectionCard = ({
        title,
        icon,
        children,
    }) => {

        return (

            <section
                className="
          group
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-sm
          transition-all
          duration-300
          hover:-translate-y-[2px]
          hover:border-emerald-300
          hover:shadow-md
        "
            >

                <div
                    className="
            flex
            items-center
            gap-3
            border-b
            border-slate-100
            px-5
            py-4
            sm:px-6
          "
                >

                    <div
                        className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-emerald-50
              text-emerald-600
              transition-all
              duration-300
              group-hover:bg-emerald-500
              group-hover:text-white
            "
                    >

                        {icon}

                    </div>


                    <h2
                        className="
              text-base
              font-bold
              text-slate-900
              sm:text-lg
            "
                    >

                        {title}

                    </h2>

                </div>


                <div className="p-5 sm:p-6">

                    {children}

                </div>

            </section>

        );

    };


    // =====================================================
    // FIELD
    // =====================================================

    const Field = ({
        label,
        value,
        mono = false,
        money = false,
    }) => {

        let formattedValue = value;

        if (money) {
            formattedValue = formatMoney(value);
        }


        return (

            <div
                className="
          rounded-xl
          border
          border-slate-100
          bg-slate-50
          px-4
          py-3
          transition-all
          duration-200
          hover:border-emerald-200
          hover:bg-emerald-50/60
        "
            >

                <p
                    className="
            text-[10px]
            font-bold
            uppercase
            tracking-[0.08em]
            text-slate-400
          "
                >

                    {label}

                </p>


                <p
                    className={`
            mt-1.5
            break-words
            text-sm
            font-semibold
            text-slate-900
            ${mono ? "font-mono" : ""}
          `}
                >

                    {displayValue(formattedValue)}

                </p>

            </div>

        );

    };


    // =====================================================
    // STATUS BADGE
    // =====================================================

    const StatusBadge = ({
        value,
    }) => {

        const config =
            getStatusConfig(value);


        return (

            <span
                className={`
          inline-flex
          items-center
          gap-2
          rounded-lg
          border
          px-3
          py-1.5
          text-xs
          font-bold
          ${config.className}
        `}
            >

                {config.icon}

                {displayValue(value)}

            </span>

        );

    };


    // =====================================================
    // LOADING
    // =====================================================

    if (loading) {

        return (

            <div
                className="
          mx-auto
          flex
          min-h-[60vh]
          w-full
          max-w-7xl
          items-center
          justify-center
          px-4
          py-8
          sm:px-6
        "
            >

                <div
                    className="
            flex
            flex-col
            items-center
            gap-3
            text-center
          "
                >

                    <div
                        className="
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-full
              bg-emerald-50
              text-emerald-600
            "
                    >

                        <RefreshCw
                            size={22}
                            className="animate-spin"
                        />

                    </div>


                    <p
                        className="
              text-sm
              font-semibold
              text-slate-700
            "
                    >

                        Loading customer details...

                    </p>

                </div>

            </div>

        );

    }


    // =====================================================
    // ERROR
    // =====================================================

    if (error) {

        return (

            <div
                className="
          mx-auto
          w-full
          max-w-7xl
          px-4
          py-6
          sm:px-6
          lg:px-8
        "
            >

                <button
                    onClick={() => navigate("/all-loans")}
                    className="
            mb-6
            inline-flex
            items-center
            gap-2
            rounded-xl
            border
            border-slate-200
            bg-white
            px-4
            py-2.5
            text-sm
            font-semibold
            text-slate-700
            shadow-sm
            transition-all
            duration-200
            hover:border-emerald-300
            hover:bg-emerald-50
            hover:text-emerald-700
            hover:shadow-md
          "
                >

                    <ArrowLeft size={16} />

                    Back to All Loans

                </button>


                <div
                    className="
            rounded-2xl
            border
            border-red-200
            bg-red-50
            p-5
            text-red-700
          "
                >

                    <div
                        className="
              flex
              items-start
              gap-3
            "
                    >

                        <AlertCircle
                            size={20}
                            className="mt-0.5 shrink-0"
                        />


                        <div>

                            <p className="font-bold">

                                Unable to load customer details

                            </p>


                            <p className="mt-1 text-sm">

                                {error}

                            </p>


                            <button
                                onClick={fetchCustomerDetails}
                                className="
                  mt-4
                  inline-flex
                  items-center
                  gap-2
                  rounded-lg
                  bg-red-600
                  px-4
                  py-2
                  text-xs
                  font-bold
                  text-white
                  transition
                  hover:bg-red-700
                "
                            >

                                <RefreshCw size={14} />

                                Try Again

                            </button>

                        </div>

                    </div>

                </div>

            </div>

        );

    }


    // =====================================================
    // MAIN UI
    // =====================================================

    return (

        <div
            className="
        mx-auto
        w-full
        max-w-7xl
        px-4
        py-5
        sm:px-6
        sm:py-6
        lg:px-8
      "
        >

            {/* =================================================
          TOP ACTION BAR
      ================================================= */}

            <div
                className="
          mb-5
          flex
          flex-col
          gap-3
          sm:flex-row
          sm:items-center
          sm:justify-between
        "
            >

                <button
                    onClick={() => navigate("/all-loans")}
                    className="
            inline-flex
            w-fit
            items-center
            gap-2
            rounded-xl
            border
            border-slate-200
            bg-white
            px-4
            py-2.5
            text-sm
            font-semibold
            text-slate-700
            shadow-sm
            transition-all
            duration-200
            hover:border-emerald-300
            hover:bg-emerald-50
            hover:text-emerald-700
            hover:shadow-md
          "
                >

                    <ArrowLeft size={16} />

                    Back to All Loans

                </button>


            </div>


            {/* =================================================
          PAGE HEADER
      ================================================= */}

            <div
                className="
          mb-6
          overflow-hidden
          rounded-2xl
          border
          border-emerald-100
          bg-white
          shadow-sm
        "
            >

                <div className="h-1 w-full bg-emerald-500" />


                <div
                    className="
            flex
            flex-col
            gap-5
            px-5
            py-5
            sm:px-6
            sm:py-6
            lg:flex-row
            lg:items-center
            lg:justify-between
          "
                >

                    <div>

                        <p
                            className="
                text-xs
                font-bold
                uppercase
                tracking-wider
                text-slate-400
              "
                        >

                            Personal Loan Applicant

                        </p>


                        <h1
                            className="
                mt-1
                text-xl
                font-bold
                text-slate-950
                sm:text-2xl
              "
                        >

                            {displayValue(
                                data?.applicant?.fullName
                            )}

                        </h1>


                        <div
                            className="
                mt-2
                flex
                flex-wrap
                items-center
                gap-2
              "
                        >

                            <span
                                className="
                  rounded-lg
                  bg-emerald-50
                  px-3
                  py-1.5
                  font-mono
                  text-xs
                  font-bold
                  text-emerald-700
                "
                            >

                                LAN:{" "}
                                {displayValue(
                                    data?.applicant?.lan
                                )}

                            </span>


                            <span
                                className="
                  rounded-lg
                  bg-slate-50
                  px-3
                  py-1.5
                  text-xs
                  font-medium
                  text-slate-500
                "
                            >

                                Partner Application:{" "}
                                {displayValue(
                                    data?.applicant
                                        ?.partnerApplicationNumber
                                )}

                            </span>

                        </div>

                    </div>


                    <div className="flex flex-wrap items-center gap-3">
                        <StatusBadge
                            value={data?.loanStatus}
                        />

                        {!String(data?.loanStatus || "").toUpperCase().includes("REJECTED") &&
                         !String(data?.loanStatus || "").toUpperCase().includes("DISBURSED") && (
                            <button
                                onClick={() => setIsRejectModalOpen(true)}
                                className="
                                  inline-flex items-center gap-1.5
                                  rounded-xl border border-red-200 bg-red-50
                                  px-3.5 py-1.5 text-xs font-semibold text-red-700
                                  shadow-sm transition-all duration-150
                                  hover:bg-red-100 hover:border-red-300
                                "
                            >
                                <XCircle size={14} />
                                Reject Case
                            </button>
                        )}
                    </div>

                </div>

                {String(data?.loanStatus || "").toUpperCase().includes("REJECTED") && (
                    <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
                        <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-red-900">Application Rejected</p>
                            <p className="mt-0.5 text-red-700">
                                {data?.bre?.finalReason || data?.bre?.reason || "This loan application was marked as rejected."}
                            </p>
                        </div>
                    </div>
                )}

            </div>


            {/* =================================================
          ALL DETAILS
      ================================================= */}

            <div className="space-y-5">


                {/* =================================================
            APPLICANT INFORMATION
        ================================================= */}

                <SectionCard
                    title="Applicant Information"
                    icon={<User size={19} />}
                >

                    <div
                        className="
              grid
              grid-cols-1
              gap-3
              sm:grid-cols-2
              lg:grid-cols-4
            "
                    >

                        <Field
                            label="Customer Name"
                            value={
                                data?.applicant?.fullName
                            }
                        />

                        <Field
                            label="First Name"
                            value={
                                data?.applicant?.firstName
                            }
                        />

                        <Field
                            label="Middle Name"
                            value={
                                data?.applicant?.middleName
                            }
                        />

                        <Field
                            label="Last Name"
                            value={
                                data?.applicant?.lastName
                            }
                        />

                        <Field
                            label="Father Name"
                            value={
                                data?.applicant?.fatherName
                            }
                        />

                        <Field
                            label="PAN"
                            value={
                                data?.applicant?.pan
                            }
                            mono
                        />

                        <Field
                            label="Mobile"
                            value={
                                data?.applicant?.mobile
                            }
                        />

                        <Field
                            label="Email"
                            value={
                                data?.applicant?.email
                            }
                        />

                        <Field
                            label="Date of Birth"
                            value={
                                formatDate(
                                    data?.applicant?.dob
                                )
                            }
                        />

                        <Field
                            label="Gender"
                            value={
                                data?.applicant?.gender
                            }
                        />

                        <Field
                            label="Partner Application ID"
                            value={
                                data?.applicant
                                    ?.partnerApplicationId
                            }
                            mono
                        />

                        <Field
                            label="Partner Application Number"
                            value={
                                data?.applicant
                                    ?.partnerApplicationNumber
                            }
                            mono
                        />

                    </div>

                </SectionCard>


                {/* =================================================
            EMPLOYMENT
        ================================================= */}

                <SectionCard
                    title="Employment Details"
                    icon={<BriefcaseBusiness size={19} />}
                >

                    <div
                        className="
              grid
              grid-cols-1
              gap-3
              sm:grid-cols-2
              lg:grid-cols-4
            "
                    >

                        <Field
                            label="Employment Type"
                            value={
                                data?.employment?.type
                            }
                        />

                        <Field
                            label="Company"
                            value={
                                data?.employment?.company
                            }
                        />

                        <Field
                            label="Designation"
                            value={
                                data?.employment?.designation
                            }
                        />

                        <Field
                            label="Monthly Income"
                            value={
                                data?.employment?.monthlyIncome
                            }
                            money
                        />

                    </div>

                </SectionCard>


                {/* =================================================
            LOAN & FINANCIAL
        ================================================= */}

                <SectionCard
                    title="Loan & Financial Details"
                    icon={<WalletCards size={19} />}
                >

                    <div
                        className="
              grid
              grid-cols-1
              gap-3
              sm:grid-cols-2
              lg:grid-cols-4
            "
                    >

                        <Field
                            label="Requested Amount"
                            value={
                                data?.loanFinancial
                                    ?.requestedAmount
                            }
                            money
                        />

                        <Field
                            label="Requested Tenure"
                            value={
                                data?.loanFinancial
                                    ?.requestedTenure
                            }
                        />

                        <Field
                            label="Tenure Type"
                            value={
                                data?.loanFinancial
                                    ?.tenureType
                            }
                        />

                        <Field
                            label="Interest Rate"
                            value={
                                data?.loanFinancial?.interestRate !== null &&
                                    data?.loanFinancial?.interestRate !== undefined &&
                                    data?.loanFinancial?.interestRate !== ""
                                    ? `${Number(data.loanFinancial.interestRate).toFixed(2)}%`
                                    : "—"
                            }
                        />

                        <Field
                            label="Processing Fee"
                            value={
                                data?.loanFinancial?.processingFee !== null &&
                                    data?.loanFinancial?.processingFee !== undefined &&
                                    data?.loanFinancial?.processingFee !== ""
                                    ? `${Number(data.loanFinancial.processingFee).toFixed(2)}%`
                                    : "—"
                            }
                        />

                        <Field
                            label="Selected Offer Amount"
                            value={
                                data?.loanFinancial
                                    ?.selectedOfferAmount
                            }
                            money
                        />

                        <Field
                            label="Selected Offer Tenure"
                            value={
                                data?.loanFinancial
                                    ?.selectedOfferTenure
                            }
                        />

                        <Field
                            label="Approved Amount"
                            value={
                                data?.bre
                                    ?.approvedAmount
                            }
                            money
                        />

                    </div>

                </SectionCard>


                {/* =================================================
            BANK DETAILS
        ================================================= */}

                <SectionCard
                    title="Bank Details"
                    icon={<Landmark size={19} />}
                >

                    <div
                        className="
              grid
              grid-cols-1
              gap-3
              sm:grid-cols-2
              lg:grid-cols-4
            "
                    >

                        <Field
                            label="Bank Name"
                            value={
                                data?.bank?.bankName
                            }
                        />

                        <Field
                            label="Account Holder"
                            value={
                                data?.bank?.accountHolder
                            }
                        />

                        <Field
                            label="Account Number"
                            value={
                                data?.bank?.accountNumber
                            }
                            mono
                        />

                        <Field
                            label="IFSC"
                            value={
                                data?.bank?.ifsc
                            }
                            mono
                        />

                        <Field
                            label="Account Type"
                            value={
                                data?.bank?.accountType
                            }
                        />

                    </div>

                </SectionCard>


                {/* =================================================
            ADDRESS DETAILS
        ================================================= */}

                <SectionCard
                    title="Address Details"
                    icon={<MapPin size={19} />}
                >

                    <div
                        className="
              grid
              grid-cols-1
              gap-3
              sm:grid-cols-2
              lg:grid-cols-4
            "
                    >

                        <div
                            className="
                rounded-xl
                border
                border-slate-100
                bg-slate-50
                px-4
                py-3
                transition
                hover:border-emerald-200
                hover:bg-emerald-50/60
                sm:col-span-2
                lg:col-span-2
              "
                        >

                            <p
                                className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.08em]
                  text-slate-400
                "
                            >

                                Address Line 1

                            </p>


                            <p
                                className="
                  mt-1.5
                  break-words
                  text-sm
                  font-semibold
                  text-slate-900
                "
                            >

                                {displayValue(
                                    data?.address?.line1
                                )}

                            </p>

                        </div>


                        <div
                            className="
                rounded-xl
                border
                border-slate-100
                bg-slate-50
                px-4
                py-3
                transition
                hover:border-emerald-200
                hover:bg-emerald-50/60
                sm:col-span-2
                lg:col-span-2
              "
                        >

                            <p
                                className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.08em]
                  text-slate-400
                "
                            >

                                Address Line 2

                            </p>


                            <p
                                className="
                  mt-1.5
                  break-words
                  text-sm
                  font-semibold
                  text-slate-900
                "
                            >

                                {displayValue(
                                    data?.address?.line2
                                )}

                            </p>

                        </div>


                        <Field
                            label="City"
                            value={
                                data?.address?.city
                            }
                        />

                        <Field
                            label="District"
                            value={
                                data?.address?.district
                            }
                        />

                        <Field
                            label="State"
                            value={
                                data?.address?.state
                            }
                        />

                        <Field
                            label="Pincode"
                            value={
                                data?.address?.pincode
                            }
                            mono
                        />

                    </div>

                </SectionCard>


                {/* =================================================
            RISK + BRE + BUREAU
        ================================================= */}

                <SectionCard
                    title="Risk & BRE Decisioning"
                    icon={<ShieldCheck size={19} />}
                >

                    <div
                        className="
              grid
              grid-cols-1
              gap-3
              sm:grid-cols-2
              lg:grid-cols-4
            "
                    >

                        {/* BRE STATUS */}

                        <div
                            className="
                rounded-xl
                border
                border-slate-100
                bg-slate-50
                px-4
                py-3
                transition
                hover:border-emerald-200
                hover:bg-emerald-50/60
              "
                        >

                            <p
                                className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.08em]
                  text-slate-400
                "
                            >

                                BRE Status

                            </p>


                            <div className="mt-2">

                                <StatusBadge
                                    value={
                                        data?.bre?.status
                                    }
                                />

                            </div>

                        </div>


                        {/* BUREAU STATUS */}

                        <div
                            className="
                rounded-xl
                border
                border-emerald-100
                bg-emerald-50/50
                px-4
                py-3
                transition
                hover:border-emerald-300
                hover:bg-emerald-50
              "
                        >

                            <p
                                className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.08em]
                  text-emerald-600
                "
                            >

                                Bureau Status

                            </p>


                            <div className="mt-2">

                                <StatusBadge
                                    value={
                                        data?.bureau?.status
                                    }
                                />

                            </div>

                        </div>


                        {/* CIBIL SCORE */}

                        <div
                            className="
                rounded-xl
                border
                border-emerald-100
                bg-emerald-50/50
                px-4
                py-3
                transition
                hover:border-emerald-300
                hover:bg-emerald-50
              "
                        >

                            <p
                                className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.08em]
                  text-emerald-600
                "
                            >

                                CIBIL / Bureau Score

                            </p>


                            <p
                                className="
                  mt-1
                  text-2xl
                  font-extrabold
                  text-slate-950
                "
                            >

                                {displayValue(
                                    data?.bureau?.score
                                )}

                            </p>

                        </div>


                        {/* DECISION STAGE */}

                        <Field
                            label="Decision Stage"
                            value={
                                data?.bre?.decisionStage
                            }
                        />


                        {/* POLICY VERSION */}

                        <Field
                            label="Policy Version"
                            value={
                                data?.bre?.policyVersion
                            }
                        />


                        {/* CREDIT LIMIT */}

                        <Field
                            label="Credit Limit"
                            value={
                                data?.bre?.creditLimit
                            }
                            money
                        />


                        {/* APPROVED AMOUNT */}

                        <Field
                            label="Approved Amount"
                            value={
                                data?.bre?.approvedAmount
                            }
                            money
                        />


                        {/* GROSS APPROVED */}

                        <Field
                            label="Gross Approved Amount"
                            value={
                                data?.bre?.grossApprovedAmount
                            }
                            money
                        />


                        {/* BUREAU CHECKED */}

                        <Field
                            label="Bureau Checked At"
                            value={
                                formatDate(
                                    data?.bureau?.checkedAt
                                )
                            }
                        />


                        {/* ENQUIRIES */}

                        <Field
                            label="Enquiries"
                            value={
                                data?.bureau?.enquiries
                            }
                        />


                        {/* BRE CHECKED */}

                        <Field
                            label="BRE Checked At"
                            value={
                                formatDate(
                                    data?.bre?.checkedAt
                                )
                            }
                        />


                        {/* FINAL STATUS */}

                        <div
                            className="
                rounded-xl
                border
                border-slate-100
                bg-slate-50
                px-4
                py-3
                transition
                hover:border-emerald-200
                hover:bg-emerald-50/60
              "
                        >

                            <p
                                className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.08em]
                  text-slate-400
                "
                            >

                                Final Status

                            </p>


                            <div className="mt-2">

                                <StatusBadge
                                    value={
                                        data?.bre?.finalStatus
                                    }
                                />

                            </div>

                        </div>


                        {/* BRE REASON */}

                        <Field
                            label="BRE Reason"
                            value={
                                data?.bre?.reason
                            }
                        />


                        {/* FINAL REASON */}

                        <Field
                            label="Final Reason"
                            value={
                                data?.bre?.finalReason
                            }
                        />

                    </div>

                </SectionCard>


                {/* =================================================
            FOOTER
        ================================================= */}

                <div
                    className="
            rounded-2xl
            border
            border-slate-200
            bg-white
            p-5
            shadow-sm
            sm:p-6
          "
                >

                </div>


            </div>

            {/* =================================================
                REJECT CASE MODAL
            ================================================= */}
            {isRejectModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
                        <div className="flex items-center gap-3 text-red-600 mb-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                                <XCircle size={22} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Reject Loan Application</h3>
                                <p className="text-xs text-slate-500">LAN: {lan}</p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-600 mb-4">
                            Rejecting this loan in Fin-Le-LMS will mark the case as <strong>REJECTED</strong> and automatically dispatch a webhook to <strong>LOS</strong> to update their system.
                        </p>

                        <div className="space-y-3 mb-5">
                            <label className="block text-xs font-semibold text-slate-700">
                                Select Rejection Reason
                            </label>
                            <select
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:border-red-400 focus:bg-white focus:outline-none"
                            >
                                <option value="">-- Choose reason --</option>
                                <option value="Bank verification failed (NAME_MISMATCH)">Bank verification failed (NAME_MISMATCH)</option>
                                <option value="Credit review rejected">Credit review rejected</option>
                                <option value="KYC / Document verification failed">KYC / Document verification failed</option>
                                <option value="TrackWizz AML / Sanctions review rejected">TrackWizz AML / Sanctions review rejected</option>
                                <option value="Customer requested cancellation">Customer requested cancellation</option>
                                <option value="Other">Other / Custom Reason</option>
                            </select>

                            {(rejectReason === "Other" || !rejectReason) && (
                                <textarea
                                    value={customReason}
                                    onChange={(e) => setCustomReason(e.target.value)}
                                    placeholder="Enter detailed rejection remarks..."
                                    rows={3}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:border-red-400 focus:bg-white focus:outline-none"
                                />
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                disabled={rejecting}
                                onClick={() => {
                                    setIsRejectModalOpen(false);
                                    setRejectReason("");
                                    setCustomReason("");
                                }}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={rejecting}
                                onClick={handleRejectConfirm}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition disabled:opacity-50"
                            >
                                {rejecting ? (
                                    <>
                                        <RefreshCw size={13} className="animate-spin" />
                                        Rejecting &amp; Notifying LOS...
                                    </>
                                ) : (
                                    <>
                                        <XCircle size={14} />
                                        Confirm Rejection
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>

    );

}


export default CustomerDetails;