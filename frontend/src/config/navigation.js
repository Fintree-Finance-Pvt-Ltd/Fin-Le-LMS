import {
  ClipboardCheck,
  LayoutDashboard,
  ShieldCheck,
  UserRound,
  WalletCards,
  BadgeCheck,
  Banknote
} from "lucide-react";

export const navigationItems = [
  {
    label: "Admin Dashboard",
    path: "/admin/dashboard",
    icon: LayoutDashboard,
    permission: "admin.dashboard",
  },

  {
    label: "Operations",
    path: "/operations/dashboard",
    icon: ClipboardCheck,
    permission: "operations.dashboard",
  },

  {
    label: "Credit",
    path: "/credit/dashboard",
    icon: ShieldCheck,
    permission: "credit.dashboard",
  },

  {
    label: "My Dashboard",
    path: "/user/dashboard",
    icon: UserRound,
    permission: "user.dashboard",
  },

  {
    label: "All Loans",
    path: "/all-loans",
    icon: WalletCards,
  },
  {
    label: "Approved Loans",
    path: "/approved-loans",
    icon: BadgeCheck,
  },

  {
    label: "Disbursed Loans",
    path: "/disbursed-loans",
    icon: Banknote,
  },

];
