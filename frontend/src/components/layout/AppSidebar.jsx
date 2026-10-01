import {
  ShieldCheck,
  X,
} from "lucide-react";

import { NavLink } from "react-router-dom";

import { navigationItems } from "../../config/navigation";
import { useAuth } from "../../context/AuthContext";

// Change this path if needed
import logo from "../../assets/fintree_logo.png";


function AppSidebar({
  open,
  onClose,
}) {

  const {
    user,
  } = useAuth();


  const visibleItems =
    navigationItems.filter((item) =>
      !item.permission ||
      user?.permissions?.includes(
        item.permission
      )
    );


  return (
    <>
      {/* =====================================================
          MOBILE OVERLAY
      ===================================================== */}

      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="
            fixed
            inset-0
            z-40
            bg-slate-950/50
            backdrop-blur-[2px]
            lg:hidden
          "
        />
      )}


      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        className={`
          fixed
          inset-y-0
          left-0
          z-50

          flex
          w-72
          flex-col

          overflow-hidden

          bg-[#071426]

          text-slate-200

          shadow-2xl
          shadow-slate-950/20

          transition-transform
          duration-300
          ease-in-out

          lg:translate-x-0

          ${
            open
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >

        {/* Decorative glow */}
        <div
          className="
            pointer-events-none
            absolute
            -left-24
            -top-24
            h-64
            w-64
            rounded-full
            bg-blue-700/20
            blur-3xl
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            -bottom-32
            -right-24
            h-72
            w-72
            rounded-full
            bg-cyan-500/10
            blur-3xl
          "
        />


        {/* =================================================
            LOGO
        ================================================= */}

        <div
          className="
            relative
            z-10
            flex
            min-h-20
            items-center
            justify-between
            border-b
            border-white/[0.07]
            px-5
          "
        >

          <div className="flex min-w-0 items-center gap-3">

            {/* Logo container */}
            <div
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-white/10
                bg-white
                p-1.5
                shadow-lg
                shadow-black/20
              "
            >
              <img
                src={logo}
                alt="Fintree Finance"
                className="
                  max-h-8
                  max-w-full
                  object-contain
                "
              />
            </div>


            {/* Brand */}
            <div className="min-w-0">

              <p
                className="
                  truncate
                  text-[15px]
                  font-bold
                  tracking-tight
                  text-white
                "
              >
                Fintree LMS
              </p>

              <p
                className="
                  mt-0.5
                  truncate
                  text-[10px]
                  font-medium
                  tracking-wide
                  text-slate-400
                "
              >
                Loan Management System
              </p>

            </div>

          </div>


          {/* Mobile close */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-lg
              text-slate-400
              transition-all
              duration-200
              hover:bg-white/[0.08]
              hover:text-white
              lg:hidden
            "
          >
            <X size={19} />
          </button>

        </div>



        {/* =================================================
            USER CARD
        ================================================= */}

        <div className="relative z-10 px-4 pt-5">

          <div
            className="
              rounded-2xl
              border
              border-white/[0.08]
              bg-white/[0.045]
              p-3.5
              backdrop-blur-sm
            "
          >

            <div className="flex items-center gap-3">

              {/* Avatar */}
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
                  text-sm
                  font-bold
                  uppercase
                  text-white
                  shadow-md
                  shadow-blue-950/20
                "
              >
                {user?.name
                  ?.trim()
                  ?.charAt(0) || "U"}
              </div>


              {/* User details */}
              <div className="min-w-0 flex-1">

                <p
                  className="
                    truncate
                    text-sm
                    font-semibold
                    text-white
                  "
                >
                  {user?.name || "User"}
                </p>


                <div className="mt-1 flex items-center gap-1.5">

                  <span
                    className="
                      h-1.5
                      w-1.5
                      rounded-full
                      bg-emerald-400
                    "
                  />

                  <p
                    className="
                      truncate
                      text-[11px]
                      font-medium
                      capitalize
                      text-slate-400
                    "
                  >
                    {user?.role_name ||
                      user?.role ||
                      "User"}
                  </p>

                </div>

              </div>

            </div>

          </div>

        </div>



        {/* =================================================
            NAVIGATION
        ================================================= */}

        <nav
          className="
            relative
            z-10
            flex-1
            overflow-y-auto
            px-4
            pb-5
            pt-6

            [&::-webkit-scrollbar]:w-1
            [&::-webkit-scrollbar-thumb]:rounded-full
            [&::-webkit-scrollbar-thumb]:bg-white/10
          "
        >

          <p
            className="
              mb-3
              px-3
              text-[10px]
              font-bold
              uppercase
              tracking-[0.16em]
              text-slate-500
            "
          >
            Main Navigation
          </p>


          <div className="space-y-1.5">

            {visibleItems.map((item) => {

              const Icon = item.icon;


              return (

                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `
                      group
                      relative

                      flex
                      min-h-[46px]
                      items-center
                      gap-3

                      overflow-hidden

                      rounded-xl
                      px-3.5
                      py-2.5

                      text-sm
                      font-medium

                      transition-all
                      duration-200

                      ${
                        isActive
                          ? `
                            bg-[#0F2A5F]
                            text-white
                            shadow-md
                            shadow-blue-950/20
                          `
                          : `
                            text-slate-400
                            hover:bg-white/[0.06]
                            hover:text-white
                          `
                      }
                    `
                  }
                >

                  {({ isActive }) => (
                    <>

                      {/* Active indicator */}
                      {isActive && (
                        <span
                          className="
                            absolute
                            left-0
                            top-1/2
                            h-6
                            w-[3px]
                            -translate-y-1/2
                            rounded-r-full
                            bg-blue-400
                          "
                        />
                      )}


                      {/* Icon */}
                      <span
                        className={`
                          flex
                          h-8
                          w-8
                          shrink-0
                          items-center
                          justify-center
                          rounded-lg

                          transition-all
                          duration-200

                          ${
                            isActive
                              ? `
                                bg-white/10
                                text-blue-100
                              `
                              : `
                                text-slate-500
                                group-hover:bg-white/[0.05]
                                group-hover:text-slate-200
                              `
                          }
                        `}
                      >
                        <Icon
                          size={18}
                          strokeWidth={2}
                        />
                      </span>


                      {/* Label */}
                      <span className="truncate">
                        {item.label}
                      </span>

                    </>
                  )}

                </NavLink>

              );

            })}

          </div>

        </nav>



        {/* =================================================
            SIDEBAR FOOTER
        ================================================= */}

        <div
          className="
            relative
            z-10
            border-t
            border-white/[0.07]
            p-4
          "
        >

          <div
            className="
              flex
              items-center
              gap-3
              rounded-xl
              bg-white/[0.035]
              px-3
              py-3
            "
          >

            <div
              className="
                flex
                h-8
                w-8
                shrink-0
                items-center
                justify-center
                rounded-lg
                bg-blue-500/10
                text-blue-300
              "
            >
              <ShieldCheck size={16} />
            </div>


            <div className="min-w-0">

              <p
                className="
                  text-[11px]
                  font-semibold
                  text-slate-300
                "
              >
                Secure LMS
              </p>

              <p
                className="
                  mt-0.5
                  text-[9px]
                  text-slate-500
                "
              >
                Authorized access only
              </p>

            </div>

          </div>

        </div>

      </aside>
    </>
  );

}


export default AppSidebar;