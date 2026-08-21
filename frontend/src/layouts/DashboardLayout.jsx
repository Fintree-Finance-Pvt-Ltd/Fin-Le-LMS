import { useState } from "react";
import { Outlet } from "react-router";

import AppSidebar from "../components/layout/AppSidebar";
import Topbar from "../components/layout/Topbar";

function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <AppSidebar
        open={sidebarOpen}
        onClose={() =>
          setSidebarOpen(false)
        }
      />

      <div className="min-h-screen lg:pl-72">
        <Topbar
          onMenuClick={() =>
            setSidebarOpen(true)
          }
        />

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;