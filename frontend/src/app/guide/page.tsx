"use client";

import { motion } from "framer-motion";
import { BookOpen, ArrowLeft, Key, CheckCircle2 } from "lucide-react";
import Link from "next/link";

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const fadeIn = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export default function GuidePage() {
  return (
    <main className="flex-1 min-h-screen p-6 md:p-12 relative">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="flex items-center gap-4">
          <Link href="/">
            <button className="p-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
          </Link>
          <div>
            <h1 className="text-3xl font-display font-semibold text-foreground flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-primary" />
              System Documentation
            </h1>
            <p className="text-muted-foreground mt-1">Official guide to using the SmartBank CBDC Ecosystem.</p>
          </div>
        </div>

        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-8">
          
          <motion.section variants={fadeIn} className="bg-card border border-border rounded-xl p-6 md:p-8">
            <h2 className="text-xl font-display font-medium text-foreground mb-4 border-b border-border pb-2">1. Test Credentials</h2>
            <p className="text-muted-foreground mb-6 text-sm">Use these dummy accounts to simulate the different roles within the CBDC network. The password for all test accounts is <code className="bg-secondary px-2 py-1 rounded text-primary font-mono">123456</code>.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-secondary/30 p-4 rounded-lg border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-primary">Retail Customer</span>
                  <Key className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="font-mono text-sm text-foreground space-y-1">
                  <div>Phone: <span className="text-primary-foreground bg-primary/20 px-1 rounded">0811111111</span></div>
                  <div>Phone: <span className="text-primary-foreground bg-primary/20 px-1 rounded">0822222222</span></div>
                </div>
              </div>

              <div className="bg-secondary/30 p-4 rounded-lg border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-[#00a8ff]">Teller (Agent)</span>
                  <Key className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="font-mono text-sm text-foreground">
                  <div>Phone: <span className="text-primary-foreground bg-[#00a8ff]/20 px-1 rounded">0888888888</span></div>
                </div>
              </div>

              <div className="bg-secondary/30 p-4 rounded-lg border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-[#ff9f43]">Manager (Admin)</span>
                  <Key className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="font-mono text-sm text-foreground">
                  <div>Phone: <span className="text-primary-foreground bg-[#ff9f43]/20 px-1 rounded">0899999999</span></div>
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section variants={fadeIn} className="bg-card border border-border rounded-xl p-6 md:p-8">
            <h2 className="text-xl font-display font-medium text-foreground mb-4 border-b border-border pb-2">2. Operating as a Retail Customer</h2>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Login to view your digital wallet balance and recent transactions.</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Use the <strong>Transfer</strong> tab to send funds to another Retail Customer using their phone number.</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Apply for a CBDC loan in the <strong>Loans</strong> section. It will remain <code className="bg-secondary px-1 rounded text-foreground">PENDING</code> until approved by a Manager.</li>
            </ul>
          </motion.section>

          <motion.section variants={fadeIn} className="bg-card border border-border rounded-xl p-6 md:p-8">
            <h2 className="text-xl font-display font-medium text-foreground mb-4 border-b border-border pb-2">3. Operating as a Teller</h2>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#00a8ff] shrink-0 mt-0.5" /> Tellers act as the bridge between physical cash and CBDC.</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#00a8ff] shrink-0 mt-0.5" /> Verify a customer&apos;s KYC status by entering their phone number in the Verification tab.</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#00a8ff] shrink-0 mt-0.5" /> <strong>Top-Up:</strong> Simulate receiving physical cash from a customer and crediting their CBDC wallet.</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#00a8ff] shrink-0 mt-0.5" /> <strong>Withdraw:</strong> Deduct CBDC from the customer&apos;s wallet to give them physical cash.</li>
            </ul>
          </motion.section>

          <motion.section variants={fadeIn} className="bg-card border border-border rounded-xl p-6 md:p-8">
            <h2 className="text-xl font-display font-medium text-foreground mb-4 border-b border-border pb-2">4. Operating as a Manager</h2>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#ff9f43] shrink-0 mt-0.5" /> Managers oversee the health and security of the Tier-2 node.</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#ff9f43] shrink-0 mt-0.5" /> Monitor all <code className="bg-secondary px-1 rounded text-foreground">PENDING</code> loans. Review the user&apos;s credit score and click <strong>Approve</strong> or <strong>Reject</strong>.</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#ff9f43] shrink-0 mt-0.5" /> In cases of fraud, navigate to the User Management tab to <strong>Suspend</strong> an account instantly freezing their funds.</li>
            </ul>
          </motion.section>

        </motion.div>
      </div>
    </main>
  );
}
