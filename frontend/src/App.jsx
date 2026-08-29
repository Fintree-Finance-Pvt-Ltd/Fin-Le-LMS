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


// Auth
import RequireAuth from "./components/auth/RequireAuth";
import RequirePermission from "./components/auth/RequirePermission";
import RoleRedirect from "./components/auth/RoleRedirect";


// Layout
import DashboardLayout from "./layouts/DashboardLayout";


// Pages
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import DocumentsPage from "./pages/DocumentsPage";

import AdminDashboard from "./pages/admin/AdminDashboard";
import OperationsDashboard from "./pages/operations/OperationsDashboard";
import CreditDashboard from "./pages/credit/CreditDashboard";
import UserDashboard from "./pages/user/UserDashboard";

import Unauthorized from "./pages/Unauthorized";


function App() {

  return (

    <Routes>


      {/* Default */}

      <Route
        path="/"
        element={
          <RoleRedirect />
        }
      />



      {/* Public Routes */}

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



      {/* Dashboard Layout Routes */}

      <Route
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >


        {/* All Loans */}

        <Route
          path="all-loans"
          element={
            <AllLoans />
          }
        />



        {/* Approved Loans */}

        <Route
          path="approved-loans"
          element={
            <ApprovedLoans />
          }
        />



        {/* Disbursed Loans */}

        <Route
          path="disbursed-loans"
          element={
            <DisbursedLoans />
          }
        />



        {/* Documents */}

        <Route
          path="documents/:lan"
          element={
            <DocumentsPage />
          }
        />



        {/* Loan Details */}

        {/* KEEP THIS FOR ALL LOANS + DISBURSED LOANS */}
        <Route
          path="loan-details/:lan"
          element={
            <LoanDetailsPage />
          }
        />


        {/* Approved Loan Details */}
        <Route
          path="approved-loan-details/:lan"
          element={
            <LoanDetails />
          }
        />



        {/* Disbursement */}

        <Route
          path="disbursement/:lan"
          element={
            <DisbursementDetails />
          }
        />



        {/* Admin Dashboard */}

        <Route
          path="admin/dashboard"
          element={
            <RequirePermission permission="admin.dashboard">
              <AdminDashboard />
            </RequirePermission>
          }
        />



        {/* Operations Dashboard */}

        <Route
          path="operations/dashboard"
          element={
            <RequirePermission permission="operations.dashboard">
              <OperationsDashboard />
            </RequirePermission>
          }
        />



        {/* Credit Dashboard */}

        <Route
          path="credit/dashboard"
          element={
            <RequirePermission permission="credit.dashboard">
              <CreditDashboard />
            </RequirePermission>
          }
        />



        {/* User Dashboard */}

        <Route
          path="user/dashboard"
          element={
            <RequirePermission permission="user.dashboard">
              <UserDashboard />
            </RequirePermission>
          }
        />


      </Route>



      {/* Unknown Route */}

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

  );

}


export default App;