"use client";

import { useState } from "react";
import { fetchApi } from "@/lib/api";
import { motion } from "framer-motion";
import { Search, ShieldCheck, ArrowUpRight, ArrowDownLeft, AlertCircle } from "lucide-react";

export default function TellerDashboard() {
  const [searchPhone, setSearchPhone] = useState("");
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [isLoadingKyc, setIsLoadingKyc] = useState(false);

  const [topupAmount, setTopupAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const checkKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingKyc(true);
    setKycStatus(null);
    try {
      const res = await fetchApi(`/bank/kyc/${searchPhone}`);
      setKycStatus(res.data.status);
    } catch (error: any) {
      alert(error.message || "Failed to fetch KYC status");
    } finally {
      setIsLoadingKyc(false);
    }
  };

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPhone || !kycStatus) return alert("Please verify KYC status first.");
    setIsProcessing(true);
    try {
      await fetchApi('/bank/teller/topup', {
        method: 'POST',
        body: JSON.stringify({ phone: searchPhone, amount: parseFloat(topupAmount), currency: 'CBDC' })
      });
      alert(`Successfully topped up ${topupAmount} CBDC to ${searchPhone}`);
      setTopupAmount("");
    } catch (error: any) {
      alert(error.message || "Top-up failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPhone || !kycStatus) return alert("Please verify KYC status first.");
    setIsProcessing(true);
    try {
      await fetchApi('/bank/teller/withdraw', {
        method: 'POST',
        body: JSON.stringify({ phone: searchPhone, amount: parseFloat(withdrawAmount), currency: 'CBDC' })
      });
      alert(`Successfully withdrew ${withdrawAmount} CBDC from ${searchPhone}`);
      setWithdrawAmount("");
    } catch (error: any) {
      alert(error.message || "Withdrawal failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold text-foreground">Teller Terminal</h1>
        <p className="text-muted-foreground text-sm">Verify KYC and manage physical-to-digital currency conversions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KYC Check Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-1 lg:col-span-3 bg-card border border-border rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <Search className="text-primary w-5 h-5" />
            <h2 className="font-display font-medium text-lg text-foreground">Customer Lookup</h2>
          </div>

          <form onSubmit={checkKyc} className="flex gap-4 max-w-xl">
            <input 
              type="text" 
              value={searchPhone}
              onChange={(e) => { setSearchPhone(e.target.value); setKycStatus(null); }}
              placeholder="Enter customer phone (e.g. 0811111111)" 
              className="flex-1 bg-secondary/50 border border-border rounded-lg py-2.5 px-4 text-sm font-mono focus:border-primary outline-none"
              required
            />
            <button 
              type="submit" 
              disabled={isLoadingKyc}
              className="bg-secondary text-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-secondary/80 border border-border transition-all"
            >
              {isLoadingKyc ? "Checking..." : "Verify KYC"}
            </button>
          </form>

          {kycStatus && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`mt-6 p-4 rounded-xl border flex items-center gap-4 ${
                kycStatus === 'VERIFIED' ? 'bg-primary/10 border-primary/30' : 'bg-destructive/10 border-destructive/30'
              }`}
            >
              {kycStatus === 'VERIFIED' ? (
                <ShieldCheck className="w-8 h-8 text-primary" />
              ) : (
                <AlertCircle className="w-8 h-8 text-destructive" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">Status: <span className="font-mono">{kycStatus}</span></p>
                <p className="text-xs text-muted-foreground mt-1">
                  {kycStatus === 'VERIFIED' ? 'Customer is eligible for transactions.' : 'Customer must complete KYC before transacting.'}
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Top-up Form */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`col-span-1 lg:col-span-1 bg-card border border-border rounded-2xl p-6 ${kycStatus !== 'VERIFIED' ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-full bg-primary/10">
              <ArrowDownLeft className="text-primary w-5 h-5" />
            </div>
            <h2 className="font-display font-medium text-lg text-foreground">Top-up CBDC</h2>
          </div>
          
          <form onSubmit={handleTopup} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Amount to Credit</label>
              <input 
                type="number" 
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                placeholder="0.00" 
                className="w-full bg-secondary/50 border border-border rounded-lg py-2 px-3 text-sm font-mono focus:border-primary outline-none"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={isProcessing}
              className="w-full mt-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              Execute Top-up
            </button>
          </form>
        </motion.div>

        {/* Withdraw Form */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`col-span-1 lg:col-span-1 bg-card border border-border rounded-2xl p-6 ${kycStatus !== 'VERIFIED' ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-full bg-secondary">
              <ArrowUpRight className="text-foreground w-5 h-5" />
            </div>
            <h2 className="font-display font-medium text-lg text-foreground">Withdraw CBDC</h2>
          </div>
          
          <form onSubmit={handleWithdraw} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Amount to Deduct</label>
              <input 
                type="number" 
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00" 
                className="w-full bg-secondary/50 border border-border rounded-lg py-2 px-3 text-sm font-mono focus:border-primary outline-none"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={isProcessing}
              className="w-full mt-2 bg-secondary border border-border text-foreground py-2.5 rounded-lg text-sm font-semibold hover:bg-secondary/80 transition-all disabled:opacity-50"
            >
              Execute Withdrawal
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
