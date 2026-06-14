"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import RetailDashboard from "@/components/dashboards/RetailDashboard";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user?.role === "TELLER") router.replace("/teller/nasabah");
    if (user?.role === "MANAGER") router.replace("/manager/pinjaman");
    if (user?.role === "ADMIN" || user?.role === "CENTRAL_BANK_ADMIN") router.replace("/admin");
  }, [router, user?.role]);

  if (!user) return null;

  if (user.role === "WALLET_USER" || user.role === "RETAIL_CUSTOMER" || user.role === "RETAIL") {
    return <RetailDashboard mode="overview" />;
  }

  return <p className="text-sm text-muted-foreground">Mengalihkan ke dashboard role...</p>;
}
