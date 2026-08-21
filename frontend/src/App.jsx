import {
  Navigate,
  Route,
  Routes,
} from "react-router";

import RequireAuth from "./components/auth/RequireAuth";
import RequirePermission from "./components/auth/RequirePermission";
import RoleRedirect from "./components/auth/RoleRedirect";

import DashboardLayout from "./layouts/DashboardLayout";

import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";

import AdminDashboard from "./pages/admin/AdminDashboard";
import OperationsDashboard from "./pages/operations/OperationsDashboard";
import CreditDashboard from "./pages/credit/CreditDashboard";
import UserDashboard from "./pages/user/UserDashboard";

import Unauthorized from "./pages/Unauthorized";

function App() {
  return (
    <Routes>
      {/* Home decides access destination */}
      <Route
        path="/"
        element={<RoleRedirect />}
      />

      {/* Public routes */}
      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/unauthorized"
        element={<Unauthorized />}
      />

      {/* Authenticated dashboard layout */}
      <Route
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        {/* Admin */}
        <Route
          path="admin/dashboard"
          element={
            <RequirePermission permission="admin.dashboard">
              <AdminDashboard />
            </RequirePermission>
          }
        />

        {/* Operations */}
        <Route
          path="operations/dashboard"
          element={
            <RequirePermission permission="operations.dashboard">
              <OperationsDashboard />
            </RequirePermission>
          }
        />

        {/* Credit */}
        <Route
          path="credit/dashboard"
          element={
            <RequirePermission permission="credit.dashboard">
              <CreditDashboard />
            </RequirePermission>
          }
        />

        {/* User */}
        <Route
          path="user/dashboard"
          element={
            <RequirePermission permission="user.dashboard">
              <UserDashboard />
            </RequirePermission>
          }
        />
      </Route>

      {/* Unknown URL */}
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