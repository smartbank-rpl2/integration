"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, KeyRound, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { type User, useAuthStore } from "@/store/auth";
import { fetchApi } from "@/lib/api";

type LoginResponse = {
  data: {
    accessToken: string;
    user: User;
  };
};

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Step 1: Login through Gateway
      const loginRes = await fetchApi<LoginResponse>('/api/wallet/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      const token = loginRes.data.accessToken;
      const user = loginRes.data.user;

      if (!token || !user) {
        throw new Error("Invalid response from server");
      }

      setAuth(token, user);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email atau password tidak valid");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center p-6 relative overflow-hidden min-h-screen">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
      
      <motion.div
        className="max-w-md w-full bg-card border border-border rounded-2xl p-8 z-10 shadow-xl dark:shadow-2xl dark:shadow-black/50"
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
            <label className="text-sm font-medium text-foreground">Email / User ID</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manager@test.com"
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
        
        <div className="mt-6 text-center text-sm text-muted-foreground space-y-3">
          <div className="bg-secondary/30 p-3 rounded-lg text-xs space-y-1 text-left border border-border">
            <p className="font-semibold text-foreground mb-2">Dummy Accounts (Pass: password):</p>
            <p><span className="text-primary font-mono">teller@test.com</span> (Teller)</p>
            <p><span className="text-primary font-mono">manager@test.com</span> (Manager)</p>
          </div>
          <div className="pt-2 border-t border-border/50">
            Don&apos;t have a retail account? <a href="/register" className="text-primary font-medium hover:underline">Register Here</a>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
