import {
    useMemo,
    useState,
} from "react";

import {
    ArrowRight,
    FileChartLine,
    Search,
} from "lucide-react";

import {
    Link,
} from "react-router-dom";

import {
    REPORTS,
} from "./reportConfig";

import "../../styles/ReportsListing.css";


function ReportsListing() {

    const [searchTerm, setSearchTerm] =
        useState("");


    const filteredReports =
        useMemo(() => {

            const value =
                searchTerm
                    .trim()
                    .toLowerCase();

            return REPORTS.filter(
                (report) =>
                    report.name
                        .toLowerCase()
                        .includes(value)
            );

        }, [searchTerm]);


    return (
        <div className="mis-reports-page">

            <div className="mis-reports-header">

                <div className="mis-reports-heading">

                    <div className="mis-title-icon">
                        <FileChartLine size={26} />
                    </div>

                    <div>
                        <h1>
                            MIS Report Listing
                        </h1>

                        <p>
                            Select a report to configure
                            and generate data
                        </p>
                    </div>

                </div>


                <div className="mis-search-wrapper">

                    <Search
                        size={18}
                        className="mis-search-icon"
                    />

                    <input
                        type="text"
                        value={searchTerm}
                        placeholder="Search by report name..."
                        onChange={(e) =>
                            setSearchTerm(
                                e.target.value
                            )
                        }
                    />

                </div>

            </div>


            <div className="mis-reports-grid">

                {filteredReports.length > 0 ? (

                    filteredReports.map(
                        (report) => (

                            <div
                                key={report.id}
                                className="mis-report-card"
                            >

                                <div>

                                    <span
                                        className={`mis-category-tag ${report.category
                                            .toLowerCase()
                                            .replace(/\s+/g, "-")}`}
                                    >
                                        {report.category}
                                    </span>

                                    <h3>
                                        {report.name}
                                    </h3>

                                </div>


                                <Link
                                    to={`/mis-reports/${report.slug}/trigger`}
                                    className="mis-generate-link"
                                >

                                    <span>
                                        Generate Report
                                    </span>

                                    <ArrowRight
                                        size={18}
                                        className="mis-arrow"
                                    />

                                </Link>

                            </div>

                        )
                    )

                ) : (

                    <div className="mis-empty-state">
                        No reports found.
                    </div>

                )}

            </div>

        </div>
    );
}


export default ReportsListing;