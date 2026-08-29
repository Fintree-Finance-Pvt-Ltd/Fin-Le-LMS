import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  User,
  CreditCard,
  Briefcase,
  MapPin,
  Landmark,
  ShieldCheck,
} from "lucide-react";

import "../styles/LoanDetails.css";
import { getLoanByLan } from "../services/loanService";


const Field = ({ label, value }) => {
  return (
    <div className="loan-field">

      <label>
        {label}
      </label>

      <div className="loan-field-value">
        {value || "-"}
      </div>

    </div>
  );
};



const Section = ({ icon: Icon, title, children }) => {

  return (

    <div className="loan-section-card">


      <div className="loan-section-title">


        <div className="loan-section-icon">

          <Icon size={22}/>

        </div>


        <h2>
          {title}
        </h2>


      </div>


      {children}


    </div>

  );

};




const LoanDetails = () => {


  const { lan } = useParams();


  const [loan,setLoan] = useState(null);

  const [loading,setLoading] = useState(true);

  const [error,setError] = useState("");



  useEffect(()=>{


    const fetchLoan = async()=>{


      try{


        const response =
          await getLoanByLan(lan);


        setLoan(response);


      }
      catch(err){


        console.error(err);

        setError(
          err.message || "Failed to load loan details"
        );


      }
      finally{


        setLoading(false);


      }


    };


    fetchLoan();


  },[lan]);




  if(loading){

    return (

      <div className="p-10 text-center">

        Loading loan details...

      </div>

    );

  }




  if(error){

    return (

      <div className="p-10 text-red-600">

        {error}

      </div>

    );

  }




  if(!loan){

    return null;

  }





  return (

    <div className="loan-details-page p-4 md:p-6">



      {/* TOP HEADER */}

      <div className="loan-header">


        <h1>

          Loan Application By {loan.customer_full_name}

        </h1>



        <div
          className="
          grid
          grid-cols-2
          md:grid-cols-4
          gap-4
          mt-6
          "
        >



          <div className="loan-header-item">

            <p className="loan-header-label">
              LAN
            </p>

            <p className="loan-header-value">
              {loan.lan}
            </p>

          </div>




          <div className="loan-header-item">

            <p className="loan-header-label">
              Status
            </p>

            <p className="loan-header-value">
              {loan.status}
            </p>

          </div>





          <div className="loan-header-item">

            <p className="loan-header-label">
              Mobile
            </p>

            <p className="loan-header-value">
              {loan.mobile_number}
            </p>

          </div>





          <div className="loan-header-item">

            <p className="loan-header-label">
              Email
            </p>

            <p className="loan-header-value truncate">
              {loan.email}
            </p>

          </div>



        </div>


      </div>






      {/* CUSTOMER DETAILS */}

      <Section
        icon={User}
        title="Customer Details"
      >


        <div
          className="
          grid
          grid-cols-1
          md:grid-cols-3
          gap-5
          "
        >


          <Field
            label="Customer Name"
            value={loan.customer_full_name}
          />


          <Field
            label="LAN"
            value={loan.lan}
          />


          <Field
            label="Created At"
            value={loan.created_at}
          />


          <Field
            label="Mobile Number"
            value={loan.mobile_number}
          />


          <Field
            label="Email"
            value={loan.email}
          />


          <Field
            label="PAN"
            value={loan.pan_number}
          />


          <Field
            label="Date Of Birth"
            value={loan.date_of_birth}
          />


          <Field
            label="Gender"
            value={loan.gender}
          />


        </div>


      </Section>








      {/* LOAN DETAILS */}

      <Section
        icon={CreditCard}
        title="Loan Details"
      >


        <div
          className="
          grid
          grid-cols-1
          md:grid-cols-3
          gap-5
          "
        >


          <Field
            label="Requested Amount"
            value={loan.requested_amount}
          />


          <Field
            label="Approved Amount"
            value={loan.bre_approved_loan_amount}
          />


          <Field
            label="Tenure"
            value={loan.requested_tenure}
          />


          <Field
            label="Interest Rate"
            value={loan.interest_rate}
          />


          <Field
            label="Processing Fee"
            value={loan.processing_fee}
          />


          <Field
            label="BRE Status"
            value={loan.bre_status}
          />


          <Field
            label="Final Status"
            value={loan.bre_final_status}
          />


        </div>


      </Section>







      {/* EMPLOYMENT */}

      <Section
        icon={Briefcase}
        title="Employment Details"
      >


        <div
          className="
          grid
          grid-cols-1
          md:grid-cols-3
          gap-5
          "
        >


          <Field
            label="Employment Type"
            value={loan.employment_employment_type}
          />


          <Field
            label="Company Name"
            value={loan.employment_company_name}
          />


          <Field
            label="Monthly Income"
            value={loan.employment_monthly_income}
          />


        </div>


      </Section>







      {/* ADDRESS */}

      <Section
        icon={MapPin}
        title="Address Details"
      >


        <div
          className="
          grid
          grid-cols-1
          md:grid-cols-3
          gap-5
          "
        >


          <Field
            label="City"
            value={loan.perm_city}
          />


          <Field
            label="State"
            value={loan.perm_state}
          />


          <Field
            label="Pincode"
            value={loan.perm_pincode}
          />


          <Field
            label="Address"
            value={loan.perm_address_line1}
          />


        </div>


      </Section>







      {/* BANK */}

      <Section
        icon={Landmark}
        title="Bank Details"
      >


        <div
          className="
          grid
          grid-cols-1
          md:grid-cols-3
          gap-5
          "
        >


          <Field
            label="Account Holder"
            value={loan.bank_account_holder_name}
          />


          <Field
            label="Bank Name"
            value={loan.bank_name}
          />


          <Field
            label="IFSC"
            value={loan.bank_ifsc_code}
          />


          <Field
            label="Account Number"
            value={loan.bank_account_number}
          />


        </div>


      </Section>








      {/* MANDATE */}

      <Section
        icon={ShieldCheck}
        title="Mandate Details"
      >


        <div
          className="
          grid
          grid-cols-1
          md:grid-cols-3
          gap-5
          "
        >


          <Field
            label="UMRN"
            value={loan.mandate_umrn}
          />


          <Field
            label="Provider"
            value={loan.mandate_provider}
          />


          <Field
            label="Type"
            value={loan.mandate_type}
          />


        </div>


      </Section>



    </div>

  );


};



export default LoanDetails;