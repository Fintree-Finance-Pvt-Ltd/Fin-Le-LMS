import React, { useState } from "react";

import {
    Wallet,
    Receipt,
    CalendarDays,
    BarChart3,
    PlusCircle,
    RefreshCw,
    Folder,
    Settings,
    Users,
} from "lucide-react";

import "../styles/LoanSidebar.css";


const LoanSidebar = ({ onSelect }) => {


    const [activeSection, setActiveSection] =
        useState("loan-details");



    const handleSelect = (section) => {

        setActiveSection(section);

        if (onSelect) {
            onSelect(section);
        }

    };



    const iconMap = {


        "loan-details":
            <Wallet size={18} />,


        "disbursement-details":
            <Receipt size={18} />,


        "schedule":
            <CalendarDays size={18} />,


        "charges-cashflow":
            <BarChart3 size={18} />,


        "extra-charges":
            <PlusCircle size={18} />,


        "allocation":
            <Users size={18} />,


        "foreclosure":
            <RefreshCw size={18} />,


        "documents":
            <Folder size={18} />,


        "action":
            <Settings size={18} />,


    };




    const sections = [


        {
            key: "loan-details",
            label: "Loan Details"
        },


        {
            key: "disbursement-details",
            label: "Disbursement Details"
        },


        {
            key: "schedule",
            label: "Schedule"
        },


        {
            key: "charges-cashflow",
            label: "Charges & Cashflow"
        },


        {
            key: "extra-charges",
            label: "Extra Charges"
        },


        {
            key: "allocation",
            label: "Allocation"
        },


        {
            key: "foreclosure",
            label: "Foreclosure-Collection"
        },


        {
            key: "documents",
            label: "Documents"
        },


        {
            key: "action",
            label: "Action"
        }


    ];





    return (

        <aside className="loan-sidebar">


            <h3 className="loan-sidebar-title">
                Loan Sections
            </h3>




            <ul>


                {
                    sections.map((section) => (


                        <li

                            key={section.key}

                            onClick={() =>
                                handleSelect(section.key)
                            }


                            className={

                                `loan-sidebar-item 
                ${activeSection === section.key
                                    ? "active"
                                    : ""
                                }`

                            }

                        >


                            <span className="sidebar-icon">

                                {
                                    iconMap[section.key]
                                }

                            </span>



                            <span>

                                {
                                    section.label
                                }

                            </span>



                        </li>


                    ))
                }


            </ul>


        </aside>


    );
};
export default LoanSidebar;