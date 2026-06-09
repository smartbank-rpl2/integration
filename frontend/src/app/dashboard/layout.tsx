"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeDollarSign,
  BookOpen,
  CreditCard,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import OnboardingTour from "@/components/OnboardingTour";
import { ThemeToggle } from "@/components/theme-toggle";
import { Role, useAuthStore } from "@/store/auth";

type MenuItem = { name: string; href: string; icon: React.ReactNode };

const menus: Record<Role, MenuItem[]> = {
  WALLET_USER: [
    { name: "Ringkasan Dompet", href: "#overview", icon: <LayoutDashboard size={19} /> },
    { name: "Transfer", href: "#transfer", icon: <CreditCard size={19} /> },
    { name: "Pinjaman", href: "#loans", icon: <BadgeDollarSign size={19} /> },
  ],
  RETAIL: [
    { name: "Ringkasan Dompet", href: "#overview", icon: <LayoutDashboard size={19} /> },
    { name: "Transfer", href: "#transfer", icon: <CreditCard size={19} /> },
    { name: "Pinjaman", href: "#loans", icon: <BadgeDollarSign size={19} /> },
  ],
  RETAIL_CUSTOMER: [
    { name: "Ringkasan Dompet", href: "#overview", icon: <LayoutDashboard size={19} /> },
    { name: "Transfer", href: "#transfer", icon: <CreditCard size={19} /> },
    { name: "Pinjaman", href: "#loans", icon: <BadgeDollarSign size={19} /> },
  ],
  TELLER: [
    { name: "Pencarian Nasabah", href: "#customer", icon: <LayoutDashboard size={19} /> },
    { name: "Operasi Teller", href: "#operations", icon: <ShieldAlert size={19} /> },
  ],
  MANAGER: [
    { name: "Kontrol Risiko", href: "#risk", icon: <Users size={19} /> },
    { name: "Keputusan Pinjaman", href: "#loans", icon: <CreditCard size={19} /> },
  ],
  ADMIN: [
    { name: "Pasokan Moneter", href: "#monetary", icon: <Landmark size={19} /> },
    { name: "Ledger", href: "#ledger", icon: <ScrollText size={19} /> },
    { name: "Reversal", href: "#reversal", icon: <ShieldAlert size={19} /> },
  ],
  CENTRAL_BANK_ADMIN: [
    { name: "Pasokan Moneter", href: "#monetary", icon: <Landmark size={19} /> },
    { name: "Ledger", href: "#ledger", icon: <ScrollText size={19} /> },
    { name: "Reversal", href: "#reversal", icon: <ShieldAlert size={19} /> },
  ],
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!token || !user) router.push("/login");
  }, [token, user, router]);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div className="flex min-h-dvh bg-background">
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.button
            aria-label="Tutup menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed left-0 top-0 z-50 flex h-dvh w-64 flex-col border-r border-border bg-card transition-transform md:relative ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-6">
          <div className="flex items-center gap-2 font-display text-xl font-bold">
            <span className="size-3 rounded-full bg-primary" />
            SmartBank
          </div>
          <button aria-label="Tutup menu" className="rounded-lg p-2 md:hidden" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6" aria-label="Navigasi dashboard">
          <p className="mb-4 text-xs font-semibold uppercase text-muted-foreground">Menu</p>
          {menus[user.role].map((item) => (
            <a
              key={item.name}
              href={item.href}
              onClick={() => setIsSidebarOpen(false)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
            >
              {item.icon}
              {item.name}
            </a>
          ))}
          <div className="mt-8 border-t border-border pt-6">
            <p className="mb-4 text-xs font-semibold uppercase text-muted-foreground">Bantuan</p>
            <Link href="/guide" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/10">
              <BookOpen size={19} />
              Panduan Pengguna
            </Link>
          </div>
        </nav>

        <div className="border-t border-border p-4">
          <div className="mb-4 flex items-center gap-3 px-2">
            <div className="flex size-10 items-center justify-center rounded-full border border-border bg-secondary font-display font-semibold">
              {(user.name || user.role).charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name || user.email || user.phone || "Pengguna"}</p>
              <p className="truncate text-xs text-muted-foreground">{user.role.replaceAll("_", " ")}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10">
            <LogOut size={19} />
            Keluar Aman
          </button>
        </div>
      </aside>

      <div className="relative flex h-dvh flex-1 flex-col overflow-hidden">
        <OnboardingTour />
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4 md:px-6">
          <button aria-label="Buka menu" className="rounded-lg p-2 hover:bg-secondary md:hidden" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-mono text-xs text-primary">
              <span className="size-1.5 rounded-full bg-primary" />
              {user.status}
            </div>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
