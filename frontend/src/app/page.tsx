"use client";

import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Activity, Users } from "lucide-react";
import Link from "next/link";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

export default function LandingPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        className="max-w-4xl w-full text-center space-y-8 z-10"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-mono mb-4">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          System Online: v1.0.0
        </motion.div>

        <motion.h1 variants={fadeIn} className="text-5xl md:text-7xl font-display font-semibold tracking-tight text-foreground">
          Next-Generation <br />
          <span className="text-primary">CBDC Infrastructure</span>
        </motion.h1>

        <motion.p variants={fadeIn} className="text-lg text-muted-foreground max-w-2xl mx-auto font-sans">
          A robust, secure Tier-2 Central Bank Digital Currency ecosystem. Experience seamless transactions, advanced KYC verification, and intelligent loan management.
        </motion.p>

        <motion.div variants={fadeIn} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link href="/login">
            <button className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all hover:scale-105 active:scale-95">
              Access System <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
          <Link href="/guide">
            <button className="flex items-center gap-2 px-6 py-3 rounded-lg bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80 border border-border transition-all hover:scale-105 active:scale-95">
              Read the Guide
            </button>
          </Link>
        </motion.div>

        {/* Feature Bento Grid */}
        <motion.div variants={fadeIn} className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left">
          <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors">
            <ShieldCheck className="w-8 h-8 text-primary mb-4" />
            <h3 className="text-xl font-display font-medium text-card-foreground mb-2">Secure Transactions</h3>
            <p className="text-sm text-muted-foreground">Idempotent architecture ensuring safe, immutable ledger movements backed by Central Bank standards.</p>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors">
            <Users className="w-8 h-8 text-primary mb-4" />
            <h3 className="text-xl font-display font-medium text-card-foreground mb-2">Role-based Access</h3>
            <p className="text-sm text-muted-foreground">Tailored interfaces for Retail Customers, Tellers, and Managers with granular permission controls.</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors">
            <Activity className="w-8 h-8 text-primary mb-4" />
            <h3 className="text-xl font-display font-medium text-card-foreground mb-2">Real-time Analytics</h3>
            <p className="text-sm text-muted-foreground">Live transaction monitoring and dynamic charts built for high-performance financial tracking.</p>
          </div>
        </motion.div>
      </motion.div>
    </main>
  );
}
