import {
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { adminService } from "../../../services/adminService";
import { permissionGroups } from "../../../config/navigation";


function ManageAccessModal({
  user,
  onClose,
  onUpdated,
}) {
  // ======================================================
  // STATE
  // ======================================================

  const [
    backendPermissions,
    setBackendPermissions,
  ] = useState([]);

  const [
    selectedPermissionCodes,
    setSelectedPermissionCodes,
  ] = useState([]);

  const [
    openGroups,
    setOpenGroups,
  ] = useState(
    permissionGroups.map(
      (group) => group.title
    )
  );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  // ======================================================
  // LOAD ACCESS
  // ======================================================

  useEffect(() => {
    const loadAccess = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          permissionData,
          userPermissionData,
        ] = await Promise.all([
          adminService.getPermissions(),

          adminService.getUserPermissions(
            user.id
          ),
        ]);

        const permissions =
          permissionData.permissions || [];

        setBackendPermissions(
          permissions
        );

        setSelectedPermissionCodes(
          (
            userPermissionData
              .effective_permissions || []
          ).map(
            (permission) =>
              permission.code
          )
        );
      } catch (error) {
        setError(
          error.message ||
            "Unable to load permissions."
        );
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      loadAccess();
    }
  }, [user?.id]);


  // ======================================================
  // ESC CLOSE
  // ======================================================

  useEffect(() => {
    const handleEscape = (event) => {
      if (
        event.key === "Escape" &&
        !saving
      ) {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [onClose, saving]);


  // ======================================================
  // PREVENT BODY SCROLL
  // ======================================================

  useEffect(() => {
    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, []);


  // ======================================================
  // TOGGLE GROUP
  // ======================================================

  const toggleGroup = (title) => {
    setOpenGroups((current) => {
      if (current.includes(title)) {
        return current.filter(
          (item) => item !== title
        );
      }

      return [
        ...current,
        title,
      ];
    });
  };


  // ======================================================
  // TOGGLE PERMISSION
  // ======================================================

  const togglePermission = (code) => {
    setSelectedPermissionCodes(
      (current) => {
        if (current.includes(code)) {
          return current.filter(
            (item) => item !== code
          );
        }

        return [
          ...current,
          code,
        ];
      }
    );
  };


  // ======================================================
  // CONVERT CODE -> ID
  // ======================================================

  const getPermissionId = (code) => {
    return backendPermissions.find(
      (permission) =>
        permission.code === code
    )?.id;
  };


  // ======================================================
  // PERMISSION COUNT
  // ======================================================

  const totalConfiguredPermissions =
    useMemo(() => {
      return permissionGroups.reduce(
        (total, group) =>
          total +
          (
            group.permissions || []
          ).length,
        0
      );
    }, []);


  // ======================================================
  // GROUP SELECTED COUNT
  // ======================================================

  const getSelectedGroupCount = (
    group
  ) => {
    return (
      group.permissions || []
    ).filter((page) =>
      selectedPermissionCodes.includes(
        page.permission
      )
    ).length;
  };


  // ======================================================
  // SAVE
  // ======================================================

  const handleSave = async () => {
    try {
      setSaving(true);

      setError("");
      setSuccess("");

      const permissionIds =
        selectedPermissionCodes
          .map((code) =>
            getPermissionId(code)
          )
          .filter(Boolean);

      const data =
        await adminService.updateUserPermissions(
          user.id,
          permissionIds
        );

      setSuccess(
        data.message ||
          "Permissions updated successfully."
      );

      if (onUpdated) {
        await onUpdated();
      }

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (error) {
      setError(
        error.message ||
          "Unable to update permissions."
      );
    } finally {
      setSaving(false);
    }
  };


  // ======================================================
  // USER INITIAL
  // ======================================================

  const userInitial =
    user?.name
      ?.trim()
      ?.charAt(0)
      ?.toUpperCase() || "U";


  // ======================================================
  // PAGE
  // ======================================================

  return (
    <div
      className="
        fixed
        inset-0
        z-[100]
        flex
        items-end
        justify-center
        bg-slate-950/60
        backdrop-blur-sm

        sm:items-center
        sm:p-4

        lg:p-6
      "
    >
      {/* =================================================
          MODAL
      ================================================= */}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-access-title"
        className="
          flex
          h-[96vh]
          w-full
          flex-col
          overflow-hidden
          rounded-t-[28px]
          border
          border-slate-200
          bg-white
          shadow-2xl

          sm:h-auto
          sm:max-h-[92vh]
          sm:max-w-4xl
          sm:rounded-[28px]

          xl:max-w-5xl
        "
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <div
          className="
            relative
            shrink-0
            overflow-hidden
            border-b
            border-slate-200
            bg-white
          "
        >
          {/* Top blue line */}
          <div
            className="
              h-1
              w-full
              bg-[#0F2A5F]
            "
          />

          <div
            className="
              flex
              items-start
              justify-between
              gap-4
              px-4
              py-4

              sm:px-6
              sm:py-5

              lg:px-7
            "
          >
            <div className="min-w-0">

              <div
                className="
                  mb-2
                  inline-flex
                  items-center
                  gap-2
                  rounded-lg
                  bg-blue-50
                  px-2.5
                  py-1.5
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.12em]
                  text-[#0F2A5F]
                "
              >
                <ShieldCheck
                  size={13}
                />

                Access Control
              </div>


              <h2
                id="manage-access-title"
                className="
                  text-xl
                  font-bold
                  tracking-tight
                  text-slate-950

                  sm:text-2xl
                "
              >
                Edit User Access
              </h2>


              <p
                className="
                  mt-1.5
                  max-w-xl
                  text-xs
                  leading-5
                  text-slate-500

                  sm:text-sm
                  sm:leading-6
                "
              >
                Manage the pages and
                modules this user is
                allowed to access.
              </p>

            </div>


            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              aria-label="Close"
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-slate-200
                bg-white
                text-slate-400
                shadow-sm
                transition-all

                hover:border-slate-300
                hover:bg-slate-50
                hover:text-slate-700

                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              <X size={19} />
            </button>
          </div>
        </div>


        {/* =================================================
            SCROLLABLE CONTENT
        ================================================= */}

        <div
          className="
            flex-1
            overflow-y-auto
            bg-slate-50/60

            [scrollbar-width:thin]
          "
        >
          <div
            className="
              space-y-5
              p-4

              sm:p-6

              lg:p-7
            "
          >

            {/* =================================================
                USER ACCESS CARD
            ================================================= */}

            <section
              className="
                overflow-hidden
                rounded-2xl
                border
                border-slate-200
                bg-white
                shadow-sm
              "
            >
              {/* Card heading */}
              <div
                className="
                  border-b
                  border-slate-100
                  px-4
                  py-4

                  sm:px-5
                "
              >
                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-3
                  "
                >
                  <div>
                    <h3
                      className="
                        text-sm
                        font-bold
                        text-slate-900
                      "
                    >
                      User Information
                    </h3>

                    <p
                      className="
                        mt-1
                        text-xs
                        text-slate-500
                      "
                    >
                      Review the account
                      before changing access.
                    </p>
                  </div>


                  <span
                    className="
                      hidden
                      rounded-full
                      border
                      border-blue-100
                      bg-blue-50
                      px-3
                      py-1
                      text-[10px]
                      font-bold
                      uppercase
                      tracking-wider
                      text-[#0F2A5F]

                      sm:inline-flex
                    "
                  >
                    User Access
                  </span>

                </div>
              </div>


              {/* User body */}
              <div
                className="
                  p-4

                  sm:p-5
                "
              >
                <div
                  className="
                    flex
                    flex-col
                    gap-4

                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                  "
                >
                  {/* User identity */}
                  <div
                    className="
                      flex
                      min-w-0
                      items-center
                      gap-3.5
                    "
                  >
                    {/* Avatar */}
                    <div
                      className="
                        flex
                        h-12
                        w-12
                        shrink-0
                        items-center
                        justify-center
                        rounded-2xl
                        bg-[#0F2A5F]
                        text-base
                        font-bold
                        text-white
                        shadow-md
                        shadow-blue-950/15

                        sm:h-14
                        sm:w-14
                        sm:text-lg
                      "
                    >
                      {userInitial}
                    </div>


                    <div className="min-w-0">

                      <p
                        className="
                          truncate
                          text-base
                          font-bold
                          text-slate-950

                          sm:text-lg
                        "
                      >
                        {user?.name ||
                          "User"}
                      </p>


                      <div
                        className="
                          mt-1
                          flex
                          min-w-0
                          items-center
                          gap-1.5
                          text-xs
                          text-slate-500
                        "
                      >
                        <Mail
                          size={13}
                          className="
                            shrink-0
                            text-slate-400
                          "
                        />

                        <span
                          className="
                            truncate
                          "
                        >
                          {user?.email ||
                            "No email available"}
                        </span>
                      </div>

                    </div>
                  </div>


                  {/* Access status */}
                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      gap-4
                      rounded-xl
                      border
                      border-slate-100
                      bg-slate-50
                      px-4
                      py-3

                      sm:min-w-[220px]
                    "
                  >
                    <div>
                      <p
                        className="
                          text-[9px]
                          font-bold
                          uppercase
                          tracking-[0.12em]
                          text-slate-400
                        "
                      >
                        Selected Access
                      </p>

                      <p
                        className="
                          mt-1
                          text-lg
                          font-bold
                          text-[#0F2A5F]
                        "
                      >
                        {
                          selectedPermissionCodes.length
                        }
                        <span
                          className="
                            ml-1
                            text-xs
                            font-medium
                            text-slate-400
                          "
                        >
                          /{" "}
                          {
                            totalConfiguredPermissions
                          }
                        </span>
                      </p>
                    </div>


                    <div
                      className="
                        flex
                        h-10
                        w-10
                        items-center
                        justify-center
                        rounded-xl
                        bg-blue-100
                        text-[#0F2A5F]
                      "
                    >
                      <ShieldCheck
                        size={19}
                      />
                    </div>
                  </div>

                </div>


                {/* Role */}
                <div
                  className="
                    mt-5
                    grid
                    grid-cols-1
                    gap-3

                    sm:grid-cols-2
                  "
                >
                  <div
                    className="
                      rounded-xl
                      border
                      border-slate-100
                      bg-slate-50/80
                      px-4
                      py-3
                    "
                  >
                    <p
                      className="
                        text-[9px]
                        font-bold
                        uppercase
                        tracking-[0.13em]
                        text-slate-400
                      "
                    >
                      Primary Role
                    </p>

                    <div
                      className="
                        mt-1.5
                        flex
                        items-center
                        gap-2
                      "
                    >
                      <UserRound
                        size={15}
                        className="
                          text-[#0F2A5F]
                        "
                      />

                      <p
                        className="
                          truncate
                          text-sm
                          font-semibold
                          capitalize
                          text-slate-800
                        "
                      >
                        {user?.role_name ||
                          user?.role ||
                          "User"}
                      </p>
                    </div>
                  </div>


                  <div
                    className="
                      rounded-xl
                      border
                      border-slate-100
                      bg-slate-50/80
                      px-4
                      py-3
                    "
                  >
                    <p
                      className="
                        text-[9px]
                        font-bold
                        uppercase
                        tracking-[0.13em]
                        text-slate-400
                      "
                    >
                      Access Status
                    </p>

                    <div
                      className="
                        mt-1.5
                        flex
                        items-center
                        gap-2
                      "
                    >
                      <span
                        className="
                          h-2
                          w-2
                          rounded-full
                          bg-emerald-500
                        "
                      />

                      <p
                        className="
                          text-sm
                          font-semibold
                          text-slate-800
                        "
                      >
                        Access Enabled
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            </section>


            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
              <div
                className="
                  flex
                  items-start
                  gap-3
                  rounded-xl
                  border
                  border-red-200
                  bg-red-50
                  px-4
                  py-3
                  text-sm
                  text-red-700
                "
              >
                <div
                  className="
                    mt-1
                    h-2
                    w-2
                    shrink-0
                    rounded-full
                    bg-red-500
                  "
                />

                <span>
                  {error}
                </span>
              </div>
            )}


            {/* =================================================
                SUCCESS
            ================================================= */}

            {success && (
              <div
                className="
                  flex
                  items-center
                  gap-3
                  rounded-xl
                  border
                  border-emerald-200
                  bg-emerald-50
                  px-4
                  py-3
                  text-sm
                  font-medium
                  text-emerald-700
                "
              >
                <Check size={17} />

                {success}
              </div>
            )}


            {/* =================================================
                PAGE ACCESS
            ================================================= */}

            <section
              className="
                overflow-hidden
                rounded-2xl
                border
                border-slate-200
                bg-white
                shadow-sm
              "
            >

              {/* Permission section heading */}
              <div
                className="
                  flex
                  flex-col
                  gap-2
                  border-b
                  border-slate-100
                  px-4
                  py-4

                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                  sm:px-5
                "
              >
                <div>
                  <h3
                    className="
                      text-sm
                      font-bold
                      text-slate-900

                      sm:text-base
                    "
                  >
                    Page Access
                  </h3>

                  <p
                    className="
                      mt-1
                      text-xs
                      leading-5
                      text-slate-500
                    "
                  >
                    Choose the pages and
                    modules this user can
                    access.
                  </p>
                </div>


                {!loading && (
                  <div
                    className="
                      inline-flex
                      w-fit
                      items-center
                      gap-2
                      rounded-lg
                      bg-blue-50
                      px-3
                      py-2
                      text-xs
                      font-semibold
                      text-[#0F2A5F]
                    "
                  >
                    <Check size={14} />

                    {
                      selectedPermissionCodes.length
                    }{" "}
                    selected
                  </div>
                )}
              </div>


              {/* =================================================
                  LOADING
              ================================================= */}

              {loading ? (
                <div
                  className="
                    flex
                    min-h-[280px]
                    flex-col
                    items-center
                    justify-center
                    px-4
                    py-12
                  "
                >
                  <Loader2
                    className="
                      h-7
                      w-7
                      animate-spin
                      text-[#0F2A5F]
                    "
                  />

                  <p
                    className="
                      mt-3
                      text-sm
                      font-medium
                      text-slate-500
                    "
                  >
                    Loading user
                    permissions...
                  </p>
                </div>
              ) : (

                /* ===============================================
                    PERMISSION GROUPS
                =============================================== */

                <div
                  className="
                    space-y-3
                    p-3

                    sm:p-4
                  "
                >
                  {permissionGroups.map(
                    (group) => {
                      const expanded =
                        openGroups.includes(
                          group.title
                        );

                      const selectedCount =
                        getSelectedGroupCount(
                          group
                        );

                      const groupTotal =
                        (
                          group.permissions ||
                          []
                        ).length;

                      return (
                        <div
                          key={
                            group.title
                          }
                          className="
                            overflow-hidden
                            rounded-xl
                            border
                            border-slate-200
                            bg-white
                            transition-all
                            duration-200
                          "
                        >

                          {/* ===============================
                              GROUP HEADER
                          =============================== */}

                          <button
                            type="button"
                            onClick={() =>
                              toggleGroup(
                                group.title
                              )
                            }
                            className="
                              flex
                              w-full
                              items-center
                              justify-between
                              gap-3
                              bg-slate-50/80
                              px-4
                              py-3.5
                              text-left
                              transition

                              hover:bg-slate-100
                            "
                          >
                            <div
                              className="
                                flex
                                min-w-0
                                items-center
                                gap-3
                              "
                            >
                              <div
                                className="
                                  flex
                                  h-9
                                  w-9
                                  shrink-0
                                  items-center
                                  justify-center
                                  rounded-lg
                                  bg-blue-50
                                  text-[#0F2A5F]
                                "
                              >
                                <ShieldCheck
                                  size={17}
                                />
                              </div>


                              <div className="min-w-0">

                                <p
                                  className="
                                    truncate
                                    text-sm
                                    font-bold
                                    text-slate-900
                                  "
                                >
                                  {
                                    group.title
                                  }
                                </p>

                                <p
                                  className="
                                    mt-0.5
                                    text-[10px]
                                    font-medium
                                    text-slate-400
                                  "
                                >
                                  {
                                    selectedCount
                                  }{" "}
                                  of{" "}
                                  {
                                    groupTotal
                                  }{" "}
                                  permissions
                                </p>

                              </div>
                            </div>


                            <div
                              className="
                                flex
                                shrink-0
                                items-center
                                gap-2
                              "
                            >
                              {selectedCount >
                                0 && (
                                <span
                                  className="
                                    hidden
                                    rounded-full
                                    bg-blue-100
                                    px-2.5
                                    py-1
                                    text-[10px]
                                    font-bold
                                    text-[#0F2A5F]

                                    sm:inline-flex
                                  "
                                >
                                  {
                                    selectedCount
                                  }{" "}
                                  selected
                                </span>
                              )}


                              <div
                                className="
                                  flex
                                  h-8
                                  w-8
                                  items-center
                                  justify-center
                                  rounded-lg
                                  border
                                  border-slate-200
                                  bg-white
                                  text-slate-500
                                "
                              >
                                {expanded ? (
                                  <ChevronDown
                                    size={
                                      16
                                    }
                                  />
                                ) : (
                                  <ChevronRight
                                    size={
                                      16
                                    }
                                  />
                                )}
                              </div>

                            </div>
                          </button>


                          {/* ===============================
                              PERMISSIONS
                          =============================== */}

                          {expanded && (
                            <div
                              className="
                                grid
                                grid-cols-1
                                gap-2
                                border-t
                                border-slate-100
                                p-3

                                md:grid-cols-2

                                xl:grid-cols-3
                              "
                            >
                              {(
                                group.permissions ||
                                []
                              ).map(
                                (page) => {
                                  const checked =
                                    selectedPermissionCodes.includes(
                                      page.permission
                                    );

                                  return (
                                    <button
                                      key={
                                        page.permission
                                      }
                                      type="button"
                                      onClick={() =>
                                        togglePermission(
                                          page.permission
                                        )
                                      }
                                      className={`
                                        group
                                        flex
                                        min-h-[64px]
                                        w-full
                                        items-center
                                        justify-between
                                        gap-3
                                        rounded-xl
                                        border
                                        p-3
                                        text-left
                                        transition-all
                                        duration-200

                                        ${
                                          checked
                                            ? `
                                              border-blue-200
                                              bg-blue-50/80
                                              shadow-sm
                                            `
                                            : `
                                              border-slate-200
                                              bg-white
                                              hover:border-blue-200
                                              hover:bg-slate-50
                                            `
                                        }
                                      `}
                                    >
                                      <div
                                        className="
                                          min-w-0
                                        "
                                      >
                                        <p
                                          className={`
                                            truncate
                                            text-sm
                                            font-semibold

                                            ${
                                              checked
                                                ? "text-[#0F2A5F]"
                                                : "text-slate-800"
                                            }
                                          `}
                                        >
                                          {
                                            page.label
                                          }
                                        </p>

                                        <p
                                          className="
                                            mt-1
                                            truncate
                                            text-[10px]
                                            text-slate-400
                                          "
                                        >
                                          {
                                            page.permission
                                          }
                                        </p>
                                      </div>


                                      {/* Checkbox */}
                                      <div
                                        className={`
                                          flex
                                          h-6
                                          w-6
                                          shrink-0
                                          items-center
                                          justify-center
                                          rounded-md
                                          border
                                          transition-all

                                          ${
                                            checked
                                              ? `
                                                border-[#0F2A5F]
                                                bg-[#0F2A5F]
                                                text-white
                                              `
                                              : `
                                                border-slate-300
                                                bg-white
                                                text-transparent
                                                group-hover:border-blue-300
                                              `
                                          }
                                        `}
                                      >
                                        <Check
                                          size={14}
                                          strokeWidth={
                                            3
                                          }
                                        />
                                      </div>

                                    </button>
                                  );
                                }
                              )}
                            </div>
                          )}

                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </section>
          </div>
        </div>


        {/* =================================================
            FOOTER BUTTONS
        ================================================= */}

        <div
          className="
            shrink-0
            border-t
            border-slate-200
            bg-white
            px-4
            py-4
            shadow-[0_-8px_30px_-24px_rgba(15,23,42,0.45)]

            sm:px-6

            lg:px-7
          "
        >
          <div
            className="
              flex
              flex-col-reverse
              gap-2.5

              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <p
              className="
                hidden
                text-xs
                text-slate-400

                sm:block
              "
            >
              Changes apply immediately
              after saving.
            </p>


            <div
              className="
                flex
                w-full
                flex-col-reverse
                gap-2.5

                sm:w-auto
                sm:flex-row
              "
            >
              {/* Cancel */}
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="
                  flex
                  h-11
                  w-full
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-5
                  text-sm
                  font-semibold
                  text-slate-600
                  transition-all

                  hover:border-slate-300
                  hover:bg-slate-50
                  hover:text-slate-900

                  disabled:cursor-not-allowed
                  disabled:opacity-50

                  sm:w-auto
                "
              >
                Cancel
              </button>


              {/* Save */}
              <button
                type="button"
                onClick={handleSave}
                disabled={
                  saving ||
                  loading
                }
                className="
                  flex
                  h-11
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-[#0F2A5F]
                  px-5
                  text-sm
                  font-semibold
                  text-white
                  shadow-sm
                  shadow-blue-950/20
                  transition-all

                  hover:-translate-y-[1px]
                  hover:bg-[#123978]
                  hover:shadow-md

                  focus:outline-none
                  focus:ring-4
                  focus:ring-blue-900/20

                  disabled:translate-y-0
                  disabled:cursor-not-allowed
                  disabled:bg-[#0F2A5F]/60
                  disabled:shadow-none

                  sm:min-w-[150px]
                  sm:w-auto
                "
              >
                {saving ? (
                  <>
                    <Loader2
                      className="
                        h-4
                        w-4
                        animate-spin
                      "
                    />

                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />

                    Save Changes
                  </>
                )}
              </button>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}


export default ManageAccessModal;