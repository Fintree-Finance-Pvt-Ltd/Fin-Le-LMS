import {
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
} from "lucide-react";

function Topbar({
  user,
  onMenuClick,
  onLogout,
}) {
  return (
    <header
      className="
        sticky
        top-0
        z-40
        border-b
        border-slate-200
        bg-white/95
        shadow-sm
        backdrop-blur
      "
    >
      <div
        className="
          flex
          h-[68px]
          items-center
          justify-between
          px-4
          sm:px-6
          lg:px-8
        "
      >
        {/* =========================================
            MOBILE MENU
        ========================================= */}

        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-xl
            border
            border-slate-200
            bg-white
            text-slate-600
            shadow-sm
            transition-all
            duration-200
            hover:border-blue-200
            hover:bg-blue-50
            hover:text-[#0F2A5F]
            lg:hidden
          "
        >
          <Menu size={20} />
        </button>


        {/* =========================================
            DESKTOP LEFT
        ========================================= */}

        <div className="hidden lg:block">
          <div className="flex items-center gap-2">
            <div
              className="
                flex
                h-8
                w-8
                items-center
                justify-center
                rounded-lg
                bg-blue-50
                text-[#0F2A5F]
              "
            >
              <ShieldCheck size={16} />
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-700">
                Fintree Loan Management System
              </p>

              <p className="mt-0.5 text-[10px] text-slate-400">
                Secure internal workspace
              </p>
            </div>
          </div>
        </div>


        {/* =========================================
            USER SECTION
        ========================================= */}

        <div className="ml-auto flex items-center">
          <div
            className="
              flex
              items-center
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-1.5
              shadow-sm
            "
          >

            {/* =====================================
                USER DETAILS
            ===================================== */}

            <div className="hidden min-w-0 px-2 text-right sm:block">
              <div className="flex items-center justify-end gap-1.5">

                <span
                  className="
                    h-1.5
                    w-1.5
                    rounded-full
                    bg-emerald-500
                  "
                />

                <p
                  className="
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-[0.12em]
                    text-emerald-600
                  "
                >
                  System Active
                </p>

              </div>


              <p
                className="
                  mt-0.5
                  max-w-[150px]
                  truncate
                  text-xs
                  font-semibold
                  text-slate-800
                "
              >
                {user?.name || "User"}
              </p>
            </div>


            {/* =====================================
                AVATAR
            ===================================== */}

            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-[#0F2A5F]
                text-white
                shadow-md
                shadow-blue-950/20
                sm:ml-2
              "
            >
              {user?.name ? (
                <span className="text-sm font-bold uppercase">
                  {user.name
                    .trim()
                    .charAt(0)}
                </span>
              ) : (
                <UserRound size={17} />
              )}
            </div>


            {/* =====================================
                SEPARATOR
            ===================================== */}

            <div
              className="
                mx-2
                hidden
                h-7
                w-px
                bg-slate-200
                sm:block
              "
            />


            {/* =====================================
                LOGOUT
            ===================================== */}

            <button
              type="button"
              onClick={onLogout}
              className="
                group
                flex
                h-10
                items-center
                justify-center
                gap-2
                rounded-xl
                px-2.5
                text-xs
                font-semibold
                text-slate-500
                transition-all
                duration-200
                hover:bg-red-50
                hover:text-red-600
                sm:px-3
              "
            >
              <LogOut
                size={16}
                className="
                  transition-transform
                  duration-200
                  group-hover:translate-x-[1px]
                "
              />

              <span className="hidden sm:inline">
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