"use client";

import { useAuthStore } from "@/store/auth";
import RetailDashboard from "@/components/dashboards/RetailDashboard";
import TellerDashboard from "@/components/dashboards/TellerDashboard";
import ManagerDashboard from "@/components/dashboards/ManagerDashboard";
import AdminDashboard from "@/components/dashboards/AdminDashboard";

export default function DashboardPage() {
  const { user } = useAuthStore();

  if (!user) return null;

  return (
    <>
      {(user.role === "WALLET_USER" || user.role === "RETAIL_CUSTOMER" || user.role === "RETAIL") && <RetailDashboard />}
      {user.role === "TELLER" && <TellerDashboard />}
      {user.role === "MANAGER" && <ManagerDashboard />}
      {(user.role === "ADMIN" || user.role === "CENTRAL_BANK_ADMIN") && <AdminDashboard />}
    </>
  );
}
