import {
  useState,
} from "react";

import {
  Outlet,
  useNavigate,
} from "react-router-dom";


import {
  useAuth,
} from "../context/AuthContext";


import AppSidebar from "../components/layout/AppSidebar";
import Topbar from "../components/layout/Topbar";



function DashboardLayout() {


  const [sidebarOpen,setSidebarOpen] =
    useState(false);


  const navigate = useNavigate();


  const {
    logout,
    user,
  } = useAuth();





  const handleLogout = async()=>{


    await logout();


    navigate("/login",{
      replace:true,
    });


  };




  return (

    <div className="min-h-screen bg-slate-100">


      <AppSidebar

        open={sidebarOpen}

        onClose={()=>
          setSidebarOpen(false)
        }

      />



      <div className="min-h-screen lg:pl-72">


        <Topbar

          user={user}

          onMenuClick={()=>
            setSidebarOpen(true)
          }


          onLogout={handleLogout}

        />



        <main className="min-h-[calc(100vh-64px)] bg-slate-100 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">


          <div className="mx-auto w-full max-w-[1600px]">

            <Outlet />

          </div>


        </main>



      </div>


    </div>

  );


}


export default DashboardLayout;