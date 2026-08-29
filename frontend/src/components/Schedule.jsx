import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Download, CalendarDays } from "lucide-react";
import * as XLSX from "xlsx";

import "../styles/Schedule.css";

import { getScheduleByLan } from "../services/loanService";



const Schedule = () => {


    const { lan } = useParams();


    const [schedule,setSchedule] =
        useState([]);

    const [loading,setLoading] =
        useState(true);

    const [error,setError] =
        useState("");




    useEffect(()=>{


        const fetchSchedule = async()=>{


            try{


                const data =
                    await getScheduleByLan(lan);


                setSchedule(data);



            }
            catch(err){


                console.error(err);


                setError(
                    err.message ||
                    "Failed to fetch schedule"
                );


            }
            finally{


                setLoading(false);


            }


        };



        if(lan){

            fetchSchedule();

        }


    },[lan]);






    const formatDate=(date)=>{


        if(!date)
            return "-";


        return new Date(date)
        .toLocaleDateString(
            "en-GB",
            {
                day:"2-digit",
                month:"short",
                year:"numeric"
            }
        );

    };







    const exportExcel=()=>{


        if(!schedule.length)
            return;



        const rows =
            schedule.map((item,index)=>({

                "Sr No":
                    index+1,

                LAN:
                    item.lan,

                "Due Date":
                    formatDate(item.due_date),

                Status:
                    item.status,

                EMI:
                    item.emi,

                Principal:
                    item.principal,

                Interest:
                    item.interest,

                "Payment Date":
                    formatDate(
                        item.payment_date
                    ),

                DPD:
                    item.dpd,

                "Remaining Amount":
                    item.remaining_amount,

                "Remaining Principal":
                    item.remaining_principal,

                "Remaining Interest":
                    item.remaining_interest

            }));




        const worksheet =
            XLSX.utils.json_to_sheet(rows);



        const workbook =
            XLSX.utils.book_new();



        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Repayment Schedule"
        );



        XLSX.writeFile(
            workbook,
            `${lan}_Repayment_Schedule.xlsx`
        );


    };







    if(loading){

        return (

            <div className="schedule-loading">

                Loading Schedule...

            </div>

        );

    }




    if(error){

        return (

            <div className="schedule-error">

                {error}

            </div>

        );

    }






    return (

        <div className="schedule-card">


            <div className="schedule-header">


                <div>


                    <h2>
                        Repayment Schedule
                    </h2>


                    <p>
                        LAN:
                        <strong>
                            {lan}
                        </strong>
                    </p>


                </div>




                <button
                    className="excel-btn"
                    onClick={exportExcel}
                >

                    <Download size={16}/>

                    Export To Excel

                </button>


            </div>






            <div className="schedule-table-wrapper">


                <table>


                    <thead>

                        <tr>

                            <th>Due Date</th>

                            <th>Status</th>

                            <th>EMI</th>

                            <th>Principal</th>

                            <th>Interest</th>

                            <th>Payment Date</th>

                            <th>DPD</th>

                            <th>Remaining Amount</th>

                            <th>Remaining Principal</th>

                            <th>Remaining Interest</th>


                        </tr>

                    </thead>




                    <tbody>


                    {
                        schedule.map((item,index)=>(


                            <tr key={index}>


                                <td>
                                    {formatDate(item.due_date)}
                                </td>


                                <td>
                                    <span className="status-badge">
                                        {item.status}
                                    </span>
                                </td>


                                <td>
                                    ₹ {item.emi}
                                </td>


                                <td>
                                    ₹ {item.principal}
                                </td>


                                <td>
                                    ₹ {item.interest}
                                </td>


                                <td>
                                    {formatDate(item.payment_date)}
                                </td>


                                <td>
                                    {item.dpd}
                                </td>


                                <td>
                                    ₹ {item.remaining_amount}
                                </td>


                                <td>
                                    ₹ {item.remaining_principal}
                                </td>


                                <td>
                                    ₹ {item.remaining_interest}
                                </td>


                            </tr>


                        ))
                    }


                    </tbody>



                </table>


            </div>


        </div>


    );

};


export default Schedule;