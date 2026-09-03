import {
  Check,
  ShieldCheck,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import { adminService } from "../../../services/adminService";
import { permissionGroups } from "../../../config/navigation";


function ManageAccessModal({
  user,
  onClose,
  onUpdated,
}) {

  const [backendPermissions, setBackendPermissions] =
    useState([]);

  const [
    selectedPermissionCodes,
    setSelectedPermissionCodes,
  ] = useState([]);


  const [openGroups, setOpenGroups] =
    useState(
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



  // ===============================
  // LOAD ACCESS
  // ===============================

  useEffect(() => {

    const loadAccess = async () => {

      try {

        setLoading(true);


        const [
          permissionData,
          userPermissionData
        ] = await Promise.all([

          adminService.getPermissions(),

          adminService.getUserPermissions(
            user.id
          )

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
            permission =>
              permission.code
          )

        );


      }
      catch (error) {

        setError(
          error.message
        );

      }
      finally {

        setLoading(false);

      }

    };


    loadAccess();


  }, [user.id]);





  // ===============================
  // TOGGLE GROUP
  // ===============================

  const toggleGroup = (title) => {

    setOpenGroups(current => {

      if (current.includes(title)) {

        return current.filter(
          item => item !== title
        );

      }


      return [
        ...current,
        title
      ];

    });

  };





  // ===============================
  // TOGGLE PERMISSION
  // ===============================


  const togglePermission = (code) => {


    setSelectedPermissionCodes(
      current => {


        if (current.includes(code)) {

          return current.filter(
            item => item !== code
          );

        }


        return [
          ...current,
          code
        ];

      }
    );


  };





  // ===============================
  // CONVERT CODE -> ID
  // ===============================


  const getPermissionId = (code) => {


    return backendPermissions.find(
      permission =>
        permission.code === code
    )?.id;


  };





  // ===============================
  // SAVE
  // ===============================


  const handleSave = async () => {


    try {

      setSaving(true);

      setError("");

      setSuccess("");



      const permissionIds =
        selectedPermissionCodes

          .map(code =>
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
        "Permissions updated successfully"
      );



      if (onUpdated) {

        await onUpdated();

      }



      setTimeout(() => {

        onClose();

      }, 700);



    }
    catch (error) {

      setError(
        error.message
      );

    }
    finally {

      setSaving(false);

    }

  };






  return (

    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">


      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">



        {/* HEADER */}

        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">

          <div>

            <h2 className="text-xl font-bold text-slate-900">
              Edit User Access
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Add or remove access for this individual user.
            </p>

          </div>


          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >

            <X size={20} />

          </button>

        </div>





        <div className="p-6">


          {/* USER CARD */}

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

              <span className="text-xs font-semibold uppercase text-slate-400">
                Primary Role
              </span>

              <p className="mt-1 font-semibold">
                {user.role_name || user.role}
              </p>

            </div>


          </div>





          {error && (

            <div className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">

              {error}

            </div>

          )}



          {success && (

            <div className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">

              {success}

            </div>

          )}






          {/* PAGE ACCESS */}


          <div className="mt-6">


            <h3 className="font-bold text-slate-900">
              Page Access
            </h3>


            <p className="mt-1 text-sm text-slate-500">
              Select pages this user can access.
            </p>





            {
              loading ?

                <p className="mt-5 text-sm text-slate-500">
                  Loading permissions...
                </p>


                :

                <div className="mt-4 space-y-3">


                  {

                    permissionGroups.map(group => {


                      const expanded =
                        openGroups.includes(
                          group.title
                        );



                      return (

                        <div
                          key={group.title}
                          className="rounded-xl border border-slate-200"
                        >



                          <button
                            type="button"
                            onClick={() => toggleGroup(group.title)}
                            className="flex w-full items-center justify-between bg-slate-50 px-4 py-3 font-semibold"
                          >


                            <span>
                              {group.title}
                            </span>


                            {
                              expanded
                                ?
                                <ChevronDown size={18} />
                                :
                                <ChevronRight size={18} />
                            }


                          </button>





                          {
                            expanded && (

                              <div className="space-y-2 p-3">


                                {

                                  group.permissions.map(page => {


                                    const checked =
                                      selectedPermissionCodes.includes(
                                        page.permission
                                      );



                                    return (

                                      <button
                                        key={page.permission}
                                        type="button"
                                        onClick={() =>
                                          togglePermission(
                                            page.permission
                                          )
                                        }
                                        className={`flex w-full items-center justify-between rounded-xl border p-4 text-left ${checked
                                            ?
                                            "border-emerald-300 bg-emerald-50"
                                            :
                                            "border-slate-200 bg-white"
                                          }`}

                                      >


                                        <div>

                                          <p className="font-semibold">
                                            {page.label}
                                          </p>

                                        </div>



                                        <div
                                          className={`flex h-6 w-6 items-center justify-center rounded-md border ${checked
                                              ?
                                              "bg-emerald-500 text-white"
                                              :
                                              "border-slate-300"
                                            }`}
                                        >


                                          {
                                            checked &&
                                            <Check size={15} />
                                          }


                                        </div>



                                      </button>

                                    );


                                  })

                                }


                              </div>

                            )

                          }


                        </div>

                      );


                    })

                  }


                </div>

            }




          </div>






          {/* BUTTONS */}


          <div className="mt-7 flex justify-end gap-3">


            <button
              onClick={onClose}
              className="rounded-xl border px-5 py-3"
            >
              Cancel
            </button>



            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-slate-950 px-5 py-3 text-white"
            >

              {
                saving
                  ?
                  "Saving..."
                  :
                  "Save Changes"
              }

            </button>


          </div>




        </div>


      </div>


    </div>

  );


}


export default ManageAccessModal;