import { Navigate } from "react-router";

import { useAuth } from "../../context/AuthContext";
import { navigationItems } from "../../config/navigation";

function RoleRedirect() {
  const {
    user,
    loading,
  } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />

          <p className="mt-4 text-sm text-slate-500">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  // Find first page the user has permission to access
  const destination =
    navigationItems.find((item) =>
      user.permissions?.includes(
        item.permission
      )
    );

  // Logged in but no page access
  if (!destination) {
    return (
      <Navigate
        to="/unauthorized"
        replace
      />
    );
  }

  return (
    <Navigate
      to={destination.path}
      replace
    />
  );
}

export default RoleRedirect;