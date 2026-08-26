import {
  LogOut,
  Menu,
  UserRound,
} from "lucide-react";

function Topbar({
  user,
  onMenuClick,
  onLogout,
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950 shadow-sm">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* MOBILE MENU */}
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-200 transition hover:bg-slate-900 hover:text-white lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={21} />
        </button>

        {/* DESKTOP LEFT SPACE */}
        <div className="hidden lg:block" />

        {/* USER + LOGOUT */}
        <div className="ml-auto flex items-center">
          <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/70 px-2 py-1.5 sm:px-3">
            {/* STATUS + NAME */}
            <div className="hidden min-w-0 text-right sm:block">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-400">
                System Active
              </p>

              <p className="mt-0.5 max-w-[130px] truncate text-xs font-semibold text-white">
                {user?.name || "User"}
              </p>
            </div>

            {/* USER ICON */}
            <div className="sm:ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm">
              <UserRound size={17} />
            </div>

            {/* SEPARATOR */}
            <div className="mx-2 hidden h-7 w-px bg-slate-700 sm:block" />

            {/* LOGOUT */}
            <button
              type="button"
              onClick={onLogout}
              className="flex h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white sm:px-3"
            >
              <LogOut size={15} />

              <span className="hidden xs:inline sm:inline">
                Logout
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;