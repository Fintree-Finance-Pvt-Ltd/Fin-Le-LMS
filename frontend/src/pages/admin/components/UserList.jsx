import {
  KeyRound,
  Users,
} from "lucide-react";

function UserList({
  users,
  loading,
  onEditAccess,
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading users...
      </div>
    );
  }

  if (!users.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Users
          size={30}
          className="mx-auto text-slate-300"
        />

        <p className="mt-3 font-semibold text-slate-700">
          No users found
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-lg font-bold text-slate-900">
          Users
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Manage individual user access.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                User
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Role
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </th>

              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Action
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {users.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-slate-50/60"
              >
                <td className="px-6 py-4">
                  <p className="font-semibold text-slate-900">
                    {item.name}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {item.email}
                  </p>
                </td>

                <td className="px-6 py-4">
                  <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium capitalize text-slate-700">
                    {item.role_name ||
                      item.role}
                  </span>
                </td>

                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      item.is_active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {item.is_active
                      ? "Active"
                      : "Inactive"}
                  </span>
                </td>

                <td className="px-6 py-4 text-right">
                  <button
                    type="button"
                    onClick={() =>
                      onEditAccess(item)
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    <KeyRound size={16} />

                    Edit Access
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default UserList;