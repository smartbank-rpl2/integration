"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, KeyRound, Phone, Mail, User, Hash, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { fetchApi } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    pin: "",
    role: "RETAIL"
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Step 1: Register through Gateway
      await fetchApi('/api/wallet/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      // Step 2: Automatically log in
      const loginRes = await fetchApi('/api/wallet/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });

      const token = loginRes.data.accessToken;
      const user = loginRes.data.user;

      if (!token || !user) {
        throw new Error("Invalid response from server during auto-login");
      }

      setAuth(token, user as any);
      router.push('/dashboard');
    } catch (err: any) {
      let errorMsg = err.message || "Registration failed. Please check your details.";
      if (errorMsg.includes('Idempotency-Key dipakai') || errorMsg.includes('Email sudah terdaftar') || errorMsg.includes('Email sudah digunakan')) {
        errorMsg = "Email ini sudah terdaftar. Silakan gunakan email lain atau langsung Login ke akun Anda.";
      }
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center p-6 relative overflow-hidden min-h-screen my-8">
      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
      
      <motion.div
        className="max-w-md w-full bg-card border border-border rounded-2xl p-8 z-10 shadow-xl dark:shadow-2xl dark:shadow-black/50"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-semibold text-foreground">Create Identity</h1>
          <p className="text-muted-foreground text-sm mt-2 font-sans">
            Register for a new CBDC node access.
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-destructive/10 border border-destructive/30 text-destructive text-sm p-3 rounded-lg mb-6 text-center"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full bg-secondary/50 border border-border focus:border-primary rounded-lg py-2 pl-10 pr-4 outline-none transition-colors text-foreground text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
                className="w-full bg-secondary/50 border border-border focus:border-primary rounded-lg py-2 pl-10 pr-4 outline-none transition-colors text-foreground text-sm font-mono"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="08123456789"
                className="w-full bg-secondary/50 border border-border focus:border-primary rounded-lg py-2 pl-10 pr-4 outline-none transition-colors text-foreground text-sm font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••"
                  className="w-full bg-secondary/50 border border-border focus:border-primary rounded-lg py-2 pl-10 pr-4 outline-none transition-colors text-foreground text-sm font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">6-Digit PIN</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  name="pin"
                  maxLength={6}
                  value={formData.pin}
                  onChange={handleChange}
                  placeholder="123456"
                  className="w-full bg-secondary/50 border border-border focus:border-primary rounded-lg py-2 pl-10 pr-4 outline-none transition-colors text-foreground text-sm font-mono"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-4"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Register"}
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account? <a href="/login" className="text-primary hover:underline">Log In</a>
        </div>
      </motion.div>
    </main>
  );
}
