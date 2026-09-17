import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";


// Components
import AllLoans from "./components/AllLoans";
import ApprovedLoans from "./components/ApprovedLoans";
import LoanDetailsPage from "./components/LoanDetailsPage";
import LoanDetails from "./components/LoanDetails";
import DisbursementDetails from "./components/DisbursementDetails";
import DisbursedLoans from "./components/DisbursedLoans";
import CustomerDetails from "./components/CustomerDetails";


// Auth
import RequireAuth from "./components/auth/RequireAuth";
import RequirePermission from "./components/auth/RequirePermission";
import RoleRedirect from "./components/auth/RoleRedirect";


// Reports
import ReportsListing from "./components/reports/ReportsListing";
import ReportLayout from "./components/reports/ReportLayout";
import TriggerReportForm from "./components/reports/TriggerReportForm";
import DownloadedReports from "./components/reports/DownloadedReports";


// Layout
import DashboardLayout from "./layouts/DashboardLayout";


// Pages
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import DocumentsPage from "./pages/DocumentsPage";

import AdminDashboard from "./pages/admin/AdminDashboard";
import PortfolioDashboard from "./pages/admin/PortfolioDashboard";
import OperationsDashboard from "./pages/operations/OperationsDashboard";
import CreditDashboard from "./pages/credit/CreditDashboard";
import UserDashboard from "./pages/user/UserDashboard";

import Unauthorized from "./pages/Unauthorized";


// Common
import GlobalLoader from "./components/common/GlobalLoader";



function App() {


  return (

    <>


      {/* GLOBAL LOADER */}

      <GlobalLoader />



      <Routes>


        {/* ==============================
            DEFAULT
        =============================== */}


        <Route
          path="/"
          element={
            <RoleRedirect />
          }
        />



        {/* ==============================
            PUBLIC ROUTES
        =============================== */}


        <Route
          path="/login"
          element={
            <Login />
          }
        />



        <Route
          path="/forgot-password"
          element={
            <ForgotPassword />
          }
        />



        <Route
          path="/unauthorized"
          element={
            <Unauthorized />
          }
        />




        {/* ==============================
            AUTHENTICATED ROUTES
        =============================== */}


        <Route
          element={
            <RequireAuth>

              <DashboardLayout />

            </RequireAuth>
          }
        >



          {/* ============================
              MIS REPORTS
          ============================= */}


          <Route
            path="mis-reports"
            element={
              <Navigate
                to="/mis-reports/listing"
                replace
              />
            }
          />



          <Route
            path="mis-reports/listing"
            element={
              <ReportsListing />
            }
          />



          <Route
            path="mis-reports/:reportId"
            element={
              <ReportLayout />
            }
          >


            <Route
              index
              element={
                <Navigate
                  to="trigger"
                  replace
                />
              }
            />



            <Route
              path="trigger"
              element={
                <TriggerReportForm />
              }
            />



            <Route
              path="downloads"
              element={
                <DownloadedReports />
              }
            />


          </Route>





          {/* ============================
              DASHBOARDS
          ============================= */}



          <Route
            path="portfolio"
            element={
              <PortfolioDashboard />
            }
          />



          <Route
            path="admin/dashboard"
            element={
              <RequirePermission permission="admin.dashboard">

                <AdminDashboard />

              </RequirePermission>
            }
          />



          <Route
            path="operations/dashboard"
            element={
              <RequirePermission permission="operations.dashboard">

                <OperationsDashboard />

              </RequirePermission>
            }
          />



          <Route
            path="credit/dashboard"
            element={
              <RequirePermission permission="credit.dashboard">

                <CreditDashboard />

              </RequirePermission>
            }
          />



          <Route
            path="user/dashboard"
            element={
              <RequirePermission permission="user.dashboard">

                <UserDashboard />

              </RequirePermission>
            }
          />






          {/* ============================
              LOANS
          ============================= */}



          <Route
            path="all-loans"
            element={
              <AllLoans />
            }
          />



          <Route
            path="approved-loans"
            element={
              <ApprovedLoans />
            }
          />



          <Route
            path="disbursed-loans"
            element={
              <DisbursedLoans />
            }
          />



          <Route
            path="customer-details/:lan"
            element={
              <CustomerDetails />
            }
          />



          <Route
            path="loan-details/:lan"
            element={
              <LoanDetailsPage />
            }
          />



          <Route
            path="approved-loan-details/:lan"
            element={
              <CustomerDetails />
            }
          />



          <Route
            path="disbursement/:lan"
            element={
              <DisbursementDetails />
            }
          />



          {/* ============================
              DOCUMENTS
          ============================= */}



          <Route
            path="documents/:lan"
            element={
              <DocumentsPage />
            }
          />



        </Route>





        {/* ==============================
            UNKNOWN ROUTE
        =============================== */}


        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />



      </Routes>


    </>

  );

}


export default App;