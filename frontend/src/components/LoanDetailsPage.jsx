import React, { useState } from "react";
import { useParams } from "react-router-dom";

import LoanSidebar from "./LoanSidebar";
import LoanDetails from "./LoanDetails";
import DisbursementDetails from "./DisbursementDetails";
import Schedule from "./Schedule";
import ExtraCharges from "./ExtraCharges";
import Documents from "./Documents";

const LoanDetailsPage = () => {

  // CHANGED:
  // Get LAN from the URL.
  // Example: /loan-details/FTPL00000001
  const { lan } = useParams();

  const [activeSection, setActiveSection] =
    useState("loan-details");

  const renderContent = () => {

    switch (activeSection) {

      case "loan-details":
        return <LoanDetails />;

      case "disbursement-details":
        return <DisbursementDetails />;

      case "schedule":
        return <Schedule />;

      case "extra-charges":
        return <ExtraCharges />;

      case "documents":
        return <Documents lan={lan} />;

      default:

        return (

          <div
            className="
              bg-white
              rounded-2xl
              p-10
              shadow
            "
          >

            <h2
              className="
                text-xl
                font-bold
                capitalize
              "
            >
              {activeSection.replace("-", " ")}
            </h2>

            <p
              className="
                mt-3
                text-slate-500
              "
            >
              Module will be added soon
            </p>

          </div>

        );
    }
  };

  return (

    <div
      className="
        flex
        gap-5
        p-5
        bg-slate-50
        min-h-screen
      "
    >

      <LoanSidebar
        onSelect={setActiveSection}
      />

      <div
        className="
          flex-1
        "
      >
        {renderContent()}
      </div>

    </div>

  );
};

export default LoanDetailsPage;