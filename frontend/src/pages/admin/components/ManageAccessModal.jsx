import {
  Check,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import { adminService } from "../../../services/adminService";

function ManageAccessModal({
  user,
  onClose,
  onUpdated,
}) {
  const [
    permissions,
    setPermissions,
  ] = useState([]);

  const [
    selectedPermissions,
    setSelectedPermissions,
  ] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  // ====================================================
  // LOAD ACCESS
  // ====================================================

  useEffect(() => {
    const loadAccess = async () => {
      try {
        setLoading(true);

        const [
          permissionData,
          userPermissionData,
        ] = await Promise.all([
          adminService.getPermissions(),

          adminService.getUserPermissions(
            user.id
          ),
        ]);

        setPermissions(
          permissionData.permissions || []
        );

        setSelectedPermissions(
          (
            userPermissionData
              .effective_permissions || []
          ).map((permission) =>
            Number(permission.id)
          )
        );
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadAccess();
  }, [user.id]);


  // ====================================================
  // TOGGLE PERMISSION
  // ====================================================

  const togglePermission = (
    permissionId
  ) => {
    const id = Number(permissionId);

    setSelectedPermissions(
      (current) => {
        if (current.includes(id)) {
          return current.filter(
            (item) => item !== id
          );
        }

        return [
          ...current,
          id,
        ];
      }
    );
  };


  // ====================================================
  // SAVE
  // ====================================================

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const data =
        await adminService.updateUserPermissions(
          user.id,
          selectedPermissions
        );

      setSuccess(
        data.message ||
          "Permissions updated successfully"
      );

      if (onUpdated) {
        await onUpdated();
      }

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Edit User Access
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Add or remove access for this
              individual user.
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

        <div className="p-6">
          {/* User */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <ShieldCheck size={20} />
              </div>

              <div>
                <p className="font-bold text-slate-900">
                  {user.name}
                </p>

                <p className="text-sm text-slate-500">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Primary Role
              </span>

              <p className="mt-1 font-semibold text-slate-800">
                {user.role_name ||
                  user.role}
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {success}
            </div>
          )}

          {/* Permissions */}
          <div className="mt-6">
            <h3 className="font-bold text-slate-900">
              Page Access
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Select every page this user
              should be allowed to access.
            </p>

            {loading ? (
              <p className="mt-5 text-sm text-slate-500">
                Loading permissions...
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {permissions.map(
                  (permission) => {
                    const checked =
                      selectedPermissions.includes(
                        Number(
                          permission.id
                        )
                      );

                    return (
                      <button
                        type="button"
                        key={
                          permission.id
                        }
                        onClick={() =>
                          togglePermission(
                            permission.id
                          )
                        }
                        className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${
                          checked
                            ? "border-emerald-300 bg-emerald-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-slate-900">
                            {
                              permission.name
                            }
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {
                              permission.description
                            }
                          </p>
                        </div>

                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-md border ${
                            checked
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-slate-300"
                          }`}
                        >
                          {checked && (
                            <Check
                              size={15}
                            />
                          )}
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-7 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={
                loading || saving
              }
              className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManageAccessModal;