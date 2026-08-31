import {
  ArrowLeft,
  Download,
  Play,
} from "lucide-react";

import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  useParams,
} from "react-router-dom";

import {
  getReportBySlug,
} from "./reportConfig";

import "../../styles/ReportLayout.css";


function ReportLayout() {

  const { reportId } =
    useParams();


  const report =
    getReportBySlug(reportId);


  if (!report) {
    return (
      <Navigate
        to="/mis-reports/listing"
        replace
      />
    );
  }


  return (
    <div className="mis-detail-layout">

      <aside className="mis-detail-sidebar">

        <Link
          to="/mis-reports/listing"
          className="mis-back-link"
        >
          <ArrowLeft size={17} />

          <span>
            Back to Reports
          </span>
        </Link>


        <div className="mis-detail-menu">

          <NavLink
            to="trigger"
            className={({
              isActive,
            }) =>
              `mis-detail-menu-item ${
                isActive
                  ? "active"
                  : ""
              }`
            }
          >
            <Play size={17} />

            <span>
              Trigger Report
            </span>
          </NavLink>


          <NavLink
            to="downloads"
            className={({
              isActive,
            }) =>
              `mis-detail-menu-item ${
                isActive
                  ? "active"
                  : ""
              }`
            }
          >
            <Download size={17} />

            <span>
              Downloaded Reports
            </span>
          </NavLink>

        </div>

      </aside>


      <section className="mis-detail-content">

        <div className="mis-detail-header">

          <span className="mis-detail-category">
            {report.category}
          </span>

          <h2>
            {report.name}
          </h2>

        </div>


        <Outlet
          context={{
            report,
          }}
        />

      </section>

    </div>
  );
}


export default ReportLayout;