import {
  Eye,
  EyeOff,
  X,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import { adminService } from "../../../services/adminService";

function CreateUserModal({
  onClose,
  onCreated,
}) {
  const [roles, setRoles] =
    useState([]);

  const [form, setForm] =
    useState({
      name: "",
      email: "",
      password: "",
      role_id: "",
    });

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [rolesLoading, setRolesLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  // ====================================================
  // LOAD ROLES
  // ====================================================

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const data =
          await adminService.getRoles();

        setRoles(data.roles || []);
      } catch (error) {
        setError(error.message);
      } finally {
        setRolesLoading(false);
      }
    };

    loadRoles();
  }, []);


  // ====================================================
  // FORM CHANGE
  // ====================================================

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };


  // ====================================================
  // SUBMIT
  // ====================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.password ||
      !form.role_id
    ) {
      setError(
        "Name, email, password and role are required."
      );

      return;
    }

    try {
      setLoading(true);

      const data =
        await adminService.createUser({
          name: form.name.trim(),
          email: form.email
            .trim()
            .toLowerCase(),
          password: form.password,
          role_id: Number(form.role_id),
        });

      setSuccess(
        data.message ||
          "User created successfully"
      );

      setForm({
        name: "",
        email: "",
        password: "",
        role_id: "",
      });

      if (onCreated) {
        await onCreated(data.user);
      }

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Create New User
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Create a user and assign their
              primary role.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6"
        >
          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Name */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Name
              </label>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter name"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Email
              </label>

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="user@example.com"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Password
              </label>

              <div className="relative">
                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (current) => !current
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Primary Role
              </label>

              <select
                name="role_id"
                value={form.role_id}
                onChange={handleChange}
                disabled={rolesLoading}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">
                  {rolesLoading
                    ? "Loading roles..."
                    : "Select role"}
                </option>

                {roles.map((role) => (
                  <option
                    key={role.id}
                    value={role.id}
                  >
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-7 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Creating..."
                : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateUserModal;