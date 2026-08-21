import {
  Menu,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

function Topbar({
  onMenuClick,
}) {
  const { user } = useAuth();

  const initials =
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-30 h-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 lg:hidden"
          >
            <Menu size={21} />
          </button>

          <div>
            <h2 className="font-bold text-slate-900">
              Personal Loan LMS
            </h2>

            <p className="hidden text-xs text-slate-500 sm:block">
              Loan Management Workspace
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 md:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />

            <span className="text-xs font-semibold text-emerald-700">
              System Active
            </span>
          </div>

          <div className="hidden text-right sm:block">
            <p className="max-w-40 truncate text-sm font-semibold text-slate-900">
              {user?.name}
            </p>

            <p className="flex items-center justify-end gap-1 text-xs capitalize text-slate-500">
              <ShieldCheck size={12} />

              {user?.role_name || user?.role}
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;