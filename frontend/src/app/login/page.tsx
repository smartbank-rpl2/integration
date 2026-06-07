"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, KeyRound, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { fetchApi } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Step 1: Login through Gateway
      const loginRes = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password })
      });

      const token = loginRes.data.token;
      
      // Step 2: Fetch User Profile
      // Normally we decode JWT, but we can just use the token to fetch profile
      // Let's assume login returns { user, token } or we can decode the token manually.
      // Wait, Central Bank auth login returns { token }. We need to fetch profile or parse token.
      // Let's parse the JWT payload (base64) to get user info.
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      const user = {
        id: payload.sub || payload.id,
        phone: payload.phone || phone,
        role: payload.role,
        status: payload.status || 'ACTIVE'
      };

      setAuth(token, user as any);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || "Invalid phone number or password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center p-6 relative overflow-hidden min-h-screen">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
      
      <motion.div
        className="max-w-md w-full bg-card border border-border rounded-2xl p-8 z-10 shadow-2xl shadow-black/50"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-semibold text-foreground">Access Terminal</h1>
          <p className="text-muted-foreground text-sm mt-2 font-sans">
            Enter your credentials to access the CBDC network.
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

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1234567890"
                className="w-full bg-secondary/50 border border-border focus:border-primary rounded-lg py-2.5 pl-10 pr-4 outline-none transition-colors text-foreground font-mono"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Password</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full bg-secondary/50 border border-border focus:border-primary rounded-lg py-2.5 pl-10 pr-4 outline-none transition-colors text-foreground font-mono"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Authenticate"}
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Need test credentials? <a href="/guide" className="text-primary hover:underline">View Guide</a>
        </div>
      </motion.div>
    </main>
  );
}
