import {
  KeyRound,
  Trash2,
  Users,
} from "lucide-react";


function UserList({
  users,
  loading,
  onEditAccess,
  onDeleteUser,
  isAdmin,
  deleteLoading,
}) {


  if (loading) {

    return (
      <div className="
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-10
        text-center
        text-sm
        text-slate-500
        shadow-sm
      ">
        Loading users...
      </div>
    );

  }




  if (!users.length) {

    return (

      <div className="
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-10
        text-center
        shadow-sm
      ">

        <Users
          size={36}
          className="
            mx-auto
            text-slate-300
          "
        />


        <p className="
          mt-4
          font-semibold
          text-slate-700
        ">
          No users found
        </p>


        <p className="
          mt-1
          text-sm
          text-slate-500
        ">
          Create a user to manage access.
        </p>


      </div>

    );

  }





  return (

    <div className="
      overflow-hidden
      rounded-2xl
      border
      border-slate-200
      bg-white
      shadow-sm
    ">


      {/* HEADER */}

      <div className="
        flex
        items-center
        justify-between
        border-b
        border-slate-200
        px-6
        py-5
      ">


        <div>

          <h2 className="
            text-lg
            font-bold
            text-slate-900
          ">
            Users
          </h2>


          <p className="
            mt-1
            text-sm
            text-slate-500
          ">
            Manage user roles and permissions.
          </p>

        </div>



        <div className="
          rounded-xl
          bg-slate-100
          px-4
          py-2
          text-sm
          font-semibold
          text-slate-700
        ">
          Total: {users.length}
        </div>


      </div>







      <div className="
        overflow-x-auto
      ">


        <table className="
          min-w-full
        ">


          <thead className="
            bg-slate-50
          ">


            <tr>


              <th className="
                px-6
                py-4
                text-left
                text-xs
                font-semibold
                uppercase
                tracking-wide
                text-slate-500
              ">
                User
              </th>



              <th className="
                px-6
                py-4
                text-left
                text-xs
                font-semibold
                uppercase
                tracking-wide
                text-slate-500
              ">
                Role
              </th>



              <th className="
                px-6
                py-4
                text-left
                text-xs
                font-semibold
                uppercase
                tracking-wide
                text-slate-500
              ">
                Status
              </th>



              <th className="
                px-6
                py-4
                text-right
                text-xs
                font-semibold
                uppercase
                tracking-wide
                text-slate-500
              ">
                Action
              </th>



            </tr>


          </thead>






          <tbody className="
            divide-y
            divide-slate-100
          ">


            {
              users.map((item) => (


                <tr
                  key={item.id}
                  className="
                  transition
                  hover:bg-slate-50
                "
                >





                  {/* USER */}

                  <td className="
                  px-6
                  py-5
                ">


                    <div>


                      <p className="
                      font-semibold
                      text-slate-900
                    ">
                        {item.name}
                      </p>



                      <p className="
                      mt-1
                      text-sm
                      text-slate-500
                    ">
                        {item.email}
                      </p>


                    </div>


                  </td>






                  {/* ROLE */}

                  <td className="
                  px-6
                  py-5
                ">


                    <span className="
                    inline-flex
                    rounded-lg
                    bg-slate-100
                    px-3
                    py-1.5
                    text-sm
                    font-medium
                    text-slate-700
                  ">

                      {
                        item.role_name ||
                        item.role
                      }


                    </span>


                  </td>







                  {/* STATUS */}

                  <td className="
                  px-6
                  py-5
                ">


                    <span
                      className={`
                      inline-flex
                      rounded-full
                      px-3
                      py-1
                      text-xs
                      font-semibold
                      ${item.is_active
                          ?
                          "bg-emerald-50 text-emerald-700"
                          :
                          "bg-red-50 text-red-700"
                        }
                    `}
                    >


                      {
                        item.is_active
                          ?
                          "Active"
                          :
                          "Inactive"
                      }


                    </span>


                  </td>








                  {/* ACTION */}

                  <td className="
                  px-6
                  py-5
                ">


                    <div className="
                    flex
                    justify-end
                    gap-3
                  ">




                      {/* EDIT ACCESS */}

                      <button

                        type="button"

                        onClick={() =>
                          onEditAccess(item)
                        }


                        title="Manage Permissions"


                        className="
                        inline-flex
                        items-center
                        gap-2
                        rounded-xl
                        border
                        border-slate-200
                        bg-white
                        px-4
                        py-2
                        text-sm
                        font-semibold
                        text-slate-700
                        transition
                        hover:border-emerald-300
                        hover:bg-emerald-50
                        hover:text-emerald-700
                      "
                      >

                        <KeyRound size={16} />

                        Edit


                      </button>








                      {/* DELETE ADMIN ONLY */}

                      {
                        isAdmin && (

                          <div className="relative group">

                            <button
                              type="button"
                              disabled={deleteLoading}
                              onClick={() => onDeleteUser(item.id)}
                              className="
      inline-flex
      h-10
      w-10
      items-center
      justify-center
      rounded-xl
      border
      border-red-200
      bg-white
      text-red-600
      transition
      hover:bg-red-50
      hover:border-red-300
      disabled:opacity-50
    "
                            >
                              <Trash2 size={18} />
                            </button>


                            {/* Custom Tooltip */}

                            <div
                              className="
      pointer-events-none
      absolute
      bottom-full
      left-1/2
      mb-2
      -translate-x-1/2
      scale-0
      rounded-lg
      bg-slate-900
      px-3
      py-1.5
      text-xs
      font-medium
      text-white
      opacity-0
      transition-all
      duration-200
      group-hover:scale-100
      group-hover:opacity-100
      whitespace-nowrap
    "
                            >

                              Delete User


                              {/* Arrow */}

                              <span
                                className="
        absolute
        left-1/2
        top-full
        -translate-x-1/2
        border-4
        border-transparent
        border-t-slate-900
      "
                              />

                            </div>

                          </div>


                        )
                      }





                    </div>


                  </td>





                </tr>


              ))
            }



          </tbody>


        </table>


      </div>


    </div>

  );


}


export default UserList;