"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Users, CreditCard, ShieldAlert, LogOut, Menu, X, BookOpen } from "lucide-react";
import Link from "next/link";
import OnboardingTour from "@/components/OnboardingTour";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!token || !user) {
      router.push("/login");
    }
  }, [token, user, router]);

  if (!mounted || !user) return null;

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const getRoleMenu = () => {
    switch (user.role) {
      case "RETAIL_CUSTOMER":
        return [
          { name: "My Wallet", icon: <LayoutDashboard size={20} /> },
          { name: "Transfer", icon: <CreditCard size={20} /> },
        ];
      case "TELLER":
        return [
          { name: "Teller Desk", icon: <LayoutDashboard size={20} /> },
          { name: "KYC Verification", icon: <ShieldAlert size={20} /> },
        ];
      case "MANAGER":
        return [
          { name: "Manager Overview", icon: <LayoutDashboard size={20} /> },
          { name: "User Management", icon: <Users size={20} /> },
        ];
      default:
        return [];
    }
  };

  const menu = getRoleMenu();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: isSidebarOpen ? 0 : "-100%" }}
        className="fixed md:relative top-0 left-0 h-screen w-64 bg-card border-r border-border z-50 md:translate-x-0 transition-transform flex flex-col"
        style={{ x: isSidebarOpen ? 0 : undefined }}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <div className="font-display font-bold text-xl tracking-tight flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-primary animate-pulse" />
            SmartBank
          </div>
          <button className="md:hidden" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
            Menu
          </div>
          {menu.map((item) => (
            <button
              key={item.name}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              {item.icon}
              {item.name}
            </button>
          ))}
          
          <div className="mt-8 mb-4 border-t border-border pt-6">
            <div className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
              Help
            </div>
            <Link href="/guide">
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-colors">
                <BookOpen size={20} />
                User Guide
              </button>
            </Link>
          </div>
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center font-display font-semibold text-foreground">
              {user.role.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-foreground truncate">{user.phone}</p>
              <p className="text-xs text-muted-foreground truncate">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut size={20} />
            Secure Logout
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <OnboardingTour />
        {/* Topbar */}
        <header className="h-16 border-b border-border bg-background/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0">
          <button
            className="md:hidden p-2 -ml-2 rounded-lg hover:bg-secondary text-foreground"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          <div className="ml-auto flex items-center gap-4">
            <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              {user.status}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
