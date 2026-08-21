import {
  FileText,
  UserRound,
} from "lucide-react";

import { useEffect, useState } from "react";

import { useAuth } from "../../context/AuthContext";
import { dashboardService } from "../../services/dashboardService";

function UserDashboard() {
  const { user } = useAuth();

  const [dashboardData, setDashboardData] =
    useState(null);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const data =
          await dashboardService.getUserDashboard();

        setDashboardData(data);
      } catch (error) {
        setError(error.message);
      }
    };

    loadDashboard();
  }, []);

  return (
    <div>
      <p className="text-sm font-semibold text-emerald-600">
        My Account
      </p>

      <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
        Welcome, {user?.name}
      </h1>

      <p className="mt-2 text-sm text-slate-500">
        View and manage your personal loan
        information.
      </p>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <UserRound className="text-emerald-500" />

          <h2 className="mt-4 font-bold text-slate-900">
            My Profile
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {user?.email}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <FileText className="text-emerald-500" />

          <h2 className="mt-4 font-bold text-slate-900">
            My Loan Information
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {dashboardData?.message ||
              "Loading..."}
          </p>
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;