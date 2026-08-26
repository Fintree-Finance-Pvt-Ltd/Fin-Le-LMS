import {
  Landmark,
  LogOut,
  X,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router";

import { navigationItems } from "../../config/navigation";
import { useAuth } from "../../context/AuthContext";

function AppSidebar({
  open,
  onClose,
}) {
  const navigate = useNavigate();

  const {
    user,
    logout,
  } = useAuth();

  const visibleItems =
  navigationItems.filter((item) =>
    !item.permission ||
    user?.permissions?.includes(
      item.permission
    )
  );

  const handleLogout = async () => {
    try {
      await logout();

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[1px] lg:hidden"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex w-72 flex-col
          bg-slate-950 text-slate-200
          transition-transform duration-300
          lg:translate-x-0
          ${
            open
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >
        {/* Logo */}
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
              <Landmark size={21} />
            </div>

            <div>
              <p className="font-bold text-white">
                LoanLMS
              </p>

              <p className="text-xs text-slate-400">
                Personal Loan Management
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Role */}
        <div className="mx-4 mt-5 rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="truncate text-sm font-semibold text-white">
            {user?.name}
          </p>

          <p className="mt-1 text-xs capitalize text-emerald-400">
            {user?.role_name || user?.role}
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
            Navigation
          </p>

          {visibleItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `
                    flex items-center gap-3
                    rounded-xl px-3 py-3
                    text-sm font-medium
                    transition
                    ${
                      isActive
                        ? "bg-emerald-500 text-white"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }
                  `
                }
              >
                <Icon size={19} />

                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-white/10 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut size={18} />

            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

export default AppSidebar;