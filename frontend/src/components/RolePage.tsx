"use client";

import { ReactNode } from "react";
import { Role, useAuthStore } from "@/store/auth";

export default function RolePage({ allowed, children }: { allowed: Role[]; children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  if (!user) return null;
  if (!allowed.includes(user.role)) {
    return <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center text-sm text-destructive">Role Anda tidak memiliki akses ke halaman ini.</div>;
  }
  return <>{children}</>;
}
