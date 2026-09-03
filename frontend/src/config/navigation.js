import {
  ClipboardCheck,
  LayoutDashboard,
  ShieldCheck,
  UserRound,
  WalletCards,
  BadgeCheck,
  Banknote,
  FileChartColumnIncreasing
} from "lucide-react";


export const permissionGroups = [

  {
    title: "Dashboards",

    permissions:[
      {
        label:"Admin Dashboard",
        path:"/admin/dashboard",
        icon: LayoutDashboard,
        permission:"admin.dashboard"
      },

      {
        label:"Operations Dashboard",
        path:"/operations/dashboard",
        icon: ClipboardCheck,
        permission:"operations.dashboard"
      },

      {
        label:"Credit Dashboard",
        path:"/credit/dashboard",
        icon: ShieldCheck,
        permission:"credit.dashboard"
      },

      {
        label:"User Dashboard",
        path:"/user/dashboard",
        icon: UserRound,
        permission:"user.dashboard"
      }
    ]
  },


  {
    title:"Loan Management",

    permissions:[
      {
        label:"All Loans",
        path:"/all-loans",
        icon: WalletCards,
        permission:"loans.all"
      },

      {
        label:"Approved Loans",
        path:"/approved-loans",
        icon: BadgeCheck,
        permission:"loans.approved"
      },

      {
        label:"Disbursed Loans",
        path:"/disbursed-loans",
        icon: Banknote,
        permission:"loans.disbursed"
      }
    ]
  },


  {
    title:"Reports",

    permissions:[
      {
        label:"MIS Reports",
        path:"/mis-reports/listing",
        icon: FileChartColumnIncreasing,
        permission:"reports.mis"
      }
    ]
  }

];


// Keep this because RoleRedirect and Sidebar still need flat data
export const navigationItems =
  permissionGroups.flatMap(
    (group) => group.permissions
  );