import { Navigate } from "react-router";

import { useAuth } from "../../context/AuthContext";

function RequirePermission({
  permission,
  children,
}) {
  const {
    user,
    loading,
  } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500" />

          <p className="mt-4 text-sm font-medium text-slate-500">
            Checking your access...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  const hasPermission =
    user.permissions?.includes(
      permission
    );

  if (!hasPermission) {
    return (
      <Navigate
        to="/unauthorized"
        replace
      />
    );
  }

  return children;
}

export default RequirePermission;