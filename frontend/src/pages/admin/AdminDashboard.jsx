import {
  KeyRound,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useAuth } from "../../context/AuthContext";
import { dashboardService } from "../../services/dashboardService";
import { adminService } from "../../services/adminService";

import CreateUserModal from "./components/CreateUserModal";
import ManageAccessModal from "./components/ManageAccessModal";
import UserList from "./components/UserList";

function AdminDashboard() {
  const { user } = useAuth();

  const [dashboardData, setDashboardData] =
    useState(null);

  const [users, setUsers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [
    usersLoading,
    setUsersLoading,
  ] = useState(true);

  const [error, setError] =
    useState("");

  const [
    createUserOpen,
    setCreateUserOpen,
  ] = useState(false);

  const [
    selectedUser,
    setSelectedUser,
  ] = useState(null);


  // ====================================================
  // LOAD DASHBOARD
  // ====================================================

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const data =
          await dashboardService.getAdminDashboard();

        setDashboardData(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);


  // ====================================================
  // LOAD USERS
  // ====================================================

  const loadUsers =
    useCallback(async () => {
      try {
        setUsersLoading(true);

        const data =
          await adminService.getUsers();

        setUsers(data.users || []);
      } catch (error) {
        setError(error.message);
      } finally {
        setUsersLoading(false);
      }
    }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);


  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-600">
            Administration
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            Admin Dashboard
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Welcome back, {user?.name}.
            Manage users, roles and access.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setCreateUserOpen(true)
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <UserPlus size={18} />

          Add User
        </button>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Cards */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <ShieldCheck size={22} />
          </div>

          <p className="mt-5 text-sm text-slate-500">
            Access Level
          </p>

          <p className="mt-1 text-xl font-bold text-slate-900">
            Full Access
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Users size={22} />
          </div>

          <p className="mt-5 text-sm text-slate-500">
            Backend RBAC
          </p>

          <p className="mt-1 font-bold text-slate-900">
            {loading
              ? "Loading..."
              : dashboardData?.message}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <KeyRound size={22} />
          </div>

          <p className="mt-5 text-sm text-slate-500">
            Active Users
          </p>

          <p className="mt-1 text-xl font-bold text-slate-900">
            {
              users.filter(
                (item) =>
                  item.is_active
              ).length
            }
          </p>
        </div>
      </div>

      {/* Users */}
      <div className="mt-8">
        <UserList
          users={users}
          loading={usersLoading}
          onEditAccess={
            setSelectedUser
          }
        />
      </div>

      {/* Create User */}
      {createUserOpen && (
        <CreateUserModal
          onClose={() =>
            setCreateUserOpen(false)
          }
          onCreated={loadUsers}
        />
      )}

      {/* Edit Access */}
      {selectedUser && (
        <ManageAccessModal
          user={selectedUser}
          onClose={() =>
            setSelectedUser(null)
          }
          onUpdated={loadUsers}
        />
      )}
    </div>
  );
}

export default AdminDashboard;