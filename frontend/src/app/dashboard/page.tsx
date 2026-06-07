"use client";

import { useAuthStore } from "@/store/auth";
import RetailDashboard from "@/components/dashboards/RetailDashboard";
import TellerDashboard from "@/components/dashboards/TellerDashboard";
import ManagerDashboard from "@/components/dashboards/ManagerDashboard";

export default function DashboardPage() {
  const { user } = useAuthStore();

  if (!user) return null;

  return (
    <>
      {user.role === "RETAIL_CUSTOMER" && <RetailDashboard />}
      {user.role === "TELLER" && <TellerDashboard />}
      {user.role === "MANAGER" && <ManagerDashboard />}
      {user.role === "ADMIN" && <ManagerDashboard />} {/* Map ADMIN to MANAGER for now */}
    </>
  );
}
