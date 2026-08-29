import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  WalletCards,
  IndianRupee,
  FileText,
  CalendarDays,
} from "lucide-react";

import "../styles/DisbursementDetails.css";

import {
  getDisbursementDetails
} from "../services/loanService";



const DisbursementDetails = () => {


  const { lan } = useParams();


  const [data,setData] = useState(null);

  const [loading,setLoading] = useState(true);

  const [error,setError] = useState("");




  useEffect(()=>{


    const fetchData = async()=>{


      try{


        const response =
          await getDisbursementDetails(lan);


        console.log(
          "DISBURSEMENT RESPONSE:",
          response
        );


        setData(response.data);


      }
      catch(err){


        console.error(
          "Disbursement Fetch Error:",
          err
        );


        setError(
          err.message ||
          "Failed to fetch disbursement details"
        );


      }
      finally{


        setLoading(false);


      }


    };



    if(lan){

      fetchData();

    }


  },[lan]);





  if(loading){

    return (

      <div className="p-10 text-center text-slate-500">

        Loading disbursement details...

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





  if(!data){

    return null;

  }





  const fields=[


    {
      label:"Disbursal Amount",
      value:data.requested_amount,
      icon:IndianRupee,
      amount:true
    },


    {
      label:"Partner Loan ID",
      value:data.partner_application_id,
      icon:FileText
    },


    {
      label:"Processing Fee",
      value:data.processing_fee,
      icon:FileText
    },


    {
      label:"Disbursement UTR",
      value:data.Disbursement_UTR || "Missing UTR",
      icon:WalletCards
    },


    {
      label:"Disbursement Date",
      value:data.Disbursement_Date || "-",
      icon:CalendarDays
    },


    {
      label:"Approved Loan Amount",
      value:data.bre_approved_loan_amount,
      icon:IndianRupee,
      amount:true
    },


    {
      label:"Interest Rate",
      value:data.interest_rate,
      icon:FileText
    },


    {
      label:"Number Of Installments",
      value:data.requested_tenure,
      icon:CalendarDays
    },


    {
      label:"Pre EMI",
      value:"-",
      icon:CalendarDays
    },


    {
      label:"Net Disbursement",
      value:
      data.requested_amount -
      (data.processing_fee || 0),

      icon:IndianRupee,

      amount:true
    }


  ];






  return (


    <div className="disbursement-card">



      <div className="disbursement-header">


        <div className="disbursement-header-icon">


          <WalletCards size={24}/>


        </div>




        <h2>

          Disbursement Details

        </h2>



      </div>






      <div className="disbursement-grid">



        {
          fields.map((field,index)=>{


            const Icon =
              field.icon;



            return (

              <div
                className="disbursement-field"
                key={index}
              >



                <label>

                  {field.label}

                </label>




                <div
                  className={
                    `
                    disbursement-value
                    ${field.amount ? "amount-value" : ""}
                    `
                  }
                >



                  <Icon
                    size={17}
                  />



                  <span>

                    {
                      field.value || "-"
                    }

                  </span>



                </div>



              </div>


            );


          })
        }



      </div>

    </div>
  );
};

export default DisbursementDetails;