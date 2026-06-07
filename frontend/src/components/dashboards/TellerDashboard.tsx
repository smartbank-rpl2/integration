"use client";

import { useState } from "react";
import { fetchApi } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertCircle, 
  User, 
  Mail, 
  Phone, 
  Wallet, 
  CheckCircle2, 
  Loader2,
  Sparkles,
  DollarSign
} from "lucide-react";

export default function TellerDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [customer, setCustomer] = useState<any>(null);
  const [isLoadingKyc, setIsLoadingKyc] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const [topupAmount, setTopupAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const presets = ["10000", "50000", "100000", "250000", "500000"];

  const searchCustomer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoadingKyc(true);
    setError("");
    setSuccessMsg("");
    setHasSearched(true);
    
    try {
      const res = await fetchApi(`/api/bank/teller/customer?query=${encodeURIComponent(searchQuery.trim())}`);
      if (res.success && res.data) {
        setCustomer(res.data);
      } else {
        setCustomer(null);
        throw new Error("Format respons tidak valid");
      }
    } catch (err: any) {
      setCustomer(null);
      const msg = err.message || "Nasabah tidak ditemukan atau pencarian gagal.";
      setError(msg.includes('tidak ditemukan') || msg.includes('404') 
        ? `Nasabah dengan kata kunci "${searchQuery.trim()}" tidak ditemukan di sistem.` 
        : msg);
    } finally {
      setIsLoadingKyc(false);
    }
  };

  const handleRefresh = async () => {
    if (!customer?.id) return;
    try {
      const res = await fetchApi(`/api/bank/teller/customer?query=${encodeURIComponent(customer.id)}`);
      if (res.success && res.data) {
        setCustomer(res.data);
      }
    } catch (err) {
      console.error("Gagal menyegarkan data nasabah", err);
    }
  };

  const handleVerifyKyc = async () => {
    if (!customer?.id) return;
    setIsProcessing(true);
    setError("");
    setSuccessMsg("");
    try {
      await fetchApi("/api/bank/teller/kyc/verify", {
        method: "POST",
        body: JSON.stringify({ userId: customer.id }),
      });
      setSuccessMsg(`KYC untuk nasabah ${customer.name} berhasil diverifikasi!`);
      await handleRefresh();
    } catch (err: any) {
      setError(err.message || "Verifikasi KYC gagal");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer?.id) return;
    setIsProcessing(true);
    setError("");
    setSuccessMsg("");
    try {
      await fetchApi("/api/bank/teller/top-up", {
        method: "POST",
        body: JSON.stringify({ userId: customer.id, amount: topupAmount }),
      });
      setSuccessMsg(`Berhasil melakukan top-up Rp ${Number(topupAmount).toLocaleString("id-ID")} ke ${customer.name}`);
      setTopupAmount("");
      await handleRefresh();
    } catch (err: any) {
      setError(err.message || "Top-up gagal");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer?.id) return;
    setIsProcessing(true);
    setError("");
    setSuccessMsg("");
    try {
      await fetchApi("/api/bank/teller/withdraw", {
        method: "POST",
        body: JSON.stringify({ userId: customer.id, amount: withdrawAmount }),
      });
      setSuccessMsg(`Berhasil menarik Rp ${Number(withdrawAmount).toLocaleString("id-ID")} dari ${customer.name}`);
      setWithdrawAmount("");
      await handleRefresh();
    } catch (err: any) {
      setError(err.message || "Penarikan gagal");
    } finally {
      setIsProcessing(false);
    }
  };

  const activeWallet = customer?.wallets?.[0];
  const balance = activeWallet ? Number(activeWallet.availableBalance) : 0;
  const isKycVerified = customer?.kycTier === "VERIFIED";

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-3xl p-8 shadow-sm">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="relative flex items-center gap-3 mb-2">
          <Sparkles className="text-primary w-5 h-5 animate-pulse" />
          <span className="text-xs font-semibold tracking-wider uppercase text-primary font-mono">Teller Node Terminal</span>
        </div>
        <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Teller Terminal</h1>
        <p className="text-muted-foreground text-sm mt-1 max-w-xl">
          Verifikasi identitas KYC nasabah serta proses konversi kas fisik ke Rupiah Digital (CBDC) secara aman dan instan.
        </p>
      </div>

      {/* Lookup Card */}
      <motion.div 
        layout
        className="bg-card border border-border rounded-3xl p-6 shadow-md dark:shadow-black/20"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20">
            <Search className="text-primary w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-lg text-foreground">Pencarian Nasabah</h2>
            <p className="text-xs text-muted-foreground">Cari nasabah berdasarkan Email, Nomor Telepon, atau User ID.</p>
          </div>
        </div>

        <form onSubmit={searchCustomer} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setHasSearched(false); }}
              placeholder="Ketik Email nasabah (mis. nasabah@example.com)..." 
              className="w-full bg-secondary/30 border border-border rounded-xl py-3 px-4 text-sm font-sans focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoadingKyc}
            className="bg-primary text-primary-foreground hover:bg-primary/95 px-8 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {isLoadingKyc ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Mencari...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Cari Nasabah
              </>
            )}
          </button>
        </form>

        {/* Search hint */}
        {!hasSearched && !error && (
          <p className="mt-3 text-xs text-muted-foreground">
            💡 Cari berdasarkan <span className="font-mono text-foreground">Email</span>, <span className="font-mono text-foreground">Nomor Telepon</span>, atau <span className="font-mono text-foreground">User ID</span> nasabah.
          </p>
        )}

        {/* Global Notifications */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-2xl flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Terjadi Kesalahan</p>
                <p className="text-xs mt-0.5 opacity-90">{error}</p>
              </div>
            </motion.div>
          )}

          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm rounded-2xl flex items-start gap-3"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Berhasil</p>
                <p className="text-xs mt-0.5 opacity-90">{successMsg}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Customer Info & Operations Area */}
      <AnimatePresence mode="wait">
        {customer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Customer Details & KYC Status Card */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-card border border-border rounded-3xl p-6 shadow-md dark:shadow-black/20 flex flex-col h-full justify-between">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-secondary/80 border border-border">
                      <User className="text-foreground w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-foreground">Profil Nasabah</h3>
                      <p className="text-xs text-muted-foreground">Informasi detail identitas nasabah.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">Nama Lengkap</span>
                      <span className="text-sm font-semibold text-foreground">{customer.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">Alamat Email</span>
                      <span className="text-sm font-medium text-foreground font-mono">{customer.email}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">Nomor Telepon</span>
                      <span className="text-sm font-medium text-foreground font-mono">{customer.phone || "-"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">User ID</span>
                      <span className="text-[11px] font-mono text-muted-foreground select-all">{customer.id}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-border/60">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block mb-3">Status KYC</span>
                  {isKycVerified ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-2xl flex items-center gap-3">
                      <ShieldCheck className="w-6 h-6 shrink-0" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider">KYC Terverifikasi</p>
                        <p className="text-[10px] opacity-80 mt-0.5">Nasabah diizinkan bertransaksi.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-4 rounded-2xl flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-6 h-6 shrink-0" />
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider">KYC Belum Terverifikasi</p>
                          <p className="text-[10px] opacity-80 mt-0.5">Fungsi Top-up & Tarik Tunai dikunci.</p>
                        </div>
                      </div>
                      <button
                        onClick={handleVerifyKyc}
                        disabled={isProcessing}
                        className="w-full bg-amber-500 text-white font-semibold py-2 px-4 rounded-xl text-xs hover:bg-amber-600 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/15"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ShieldCheck className="w-3.5 h-3.5" />
                        )}
                        Setujui & Verifikasi KYC
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Wallet Balance & Action Forms */}
            <div className="lg:col-span-2 space-y-6">
              {/* Balance Widget */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-md dark:shadow-black/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-primary/5 blur-[50px] rounded-full pointer-events-none" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-secondary/80 border border-border">
                    <Wallet className="text-muted-foreground w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Saldo Dompet CBDC Nasabah</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase font-mono">Available Balance</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-4xl font-display font-bold text-foreground tracking-tight">
                      Rp {balance.toLocaleString("id-ID")}
                    </span>
                    <span className="text-xs font-semibold text-primary font-mono">CBDC_IDR</span>
                  </div>
                  <div className="mt-3 text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                    <span>Wallet ID:</span>
                    <span className="select-all text-foreground">{activeWallet?.id || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Transactions Panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top-up Form */}
                <div className={`bg-card border border-border rounded-3xl p-6 shadow-md dark:shadow-black/20 flex flex-col justify-between transition-opacity ${!isKycVerified ? 'opacity-40 pointer-events-none select-none' : ''}`}>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                        <ArrowDownLeft className="text-emerald-500 w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-foreground">Top-up Saldo</h3>
                        <p className="text-xs text-muted-foreground">Konversi uang fisik tunai ke CBDC.</p>
                      </div>
                    </div>

                    {/* Presets */}
                    <div className="grid grid-cols-3 gap-2">
                      {presets.slice(0, 3).map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setTopupAmount(amt)}
                          className={`py-1.5 px-3 rounded-xl border text-xs font-mono transition-all ${
                            topupAmount === amt 
                              ? 'bg-primary border-primary text-primary-foreground font-bold' 
                              : 'bg-secondary/40 border-border hover:bg-secondary/80 text-foreground'
                          }`}
                        >
                          Rp {Number(amt).toLocaleString("id-ID")}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {presets.slice(3, 5).map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setTopupAmount(amt)}
                          className={`py-1.5 px-3 rounded-xl border text-xs font-mono transition-all ${
                            topupAmount === amt 
                              ? 'bg-primary border-primary text-primary-foreground font-bold' 
                              : 'bg-secondary/40 border-border hover:bg-secondary/80 text-foreground'
                          }`}
                        >
                          Rp {Number(amt).toLocaleString("id-ID")}
                        </button>
                      ))}
                    </div>

                    <form onSubmit={handleTopup} className="space-y-3 pt-2">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">Rp</span>
                        <input 
                          type="number" 
                          value={topupAmount}
                          onChange={(e) => setTopupAmount(e.target.value)}
                          placeholder="Ketik nominal kustom..." 
                          className="w-full bg-secondary/30 border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm font-mono focus:border-primary outline-none transition-all text-foreground"
                          required
                          min="1"
                        />
                      </div>
                      <button 
                        type="submit" 
                        disabled={isProcessing || !topupAmount}
                        className="w-full bg-emerald-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-all active:scale-[0.98] disabled:opacity-50 shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5"
                      >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownLeft className="w-4 h-4" />}
                        Proses Top-up
                      </button>
                    </form>
                  </div>
                </div>

                {/* Withdrawal Form */}
                <div className={`bg-card border border-border rounded-3xl p-6 shadow-md dark:shadow-black/20 flex flex-col justify-between transition-opacity ${!isKycVerified ? 'opacity-40 pointer-events-none select-none' : ''}`}>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                        <ArrowUpRight className="text-amber-500 w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-foreground">Tarik Tunai</h3>
                        <p className="text-xs text-muted-foreground">Konversi saldo CBDC nasabah ke kas fisik.</p>
                      </div>
                    </div>

                    {/* Presets */}
                    <div className="grid grid-cols-3 gap-2">
                      {presets.slice(0, 3).map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setWithdrawAmount(amt)}
                          className={`py-1.5 px-3 rounded-xl border text-xs font-mono transition-all ${
                            withdrawAmount === amt 
                              ? 'bg-secondary-foreground text-secondary border-secondary-foreground font-bold' 
                              : 'bg-secondary/40 border-border hover:bg-secondary/80 text-foreground'
                          }`}
                        >
                          Rp {Number(amt).toLocaleString("id-ID")}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {presets.slice(3, 5).map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setWithdrawAmount(amt)}
                          className={`py-1.5 px-3 rounded-xl border text-xs font-mono transition-all ${
                            withdrawAmount === amt 
                              ? 'bg-secondary-foreground text-secondary border-secondary-foreground font-bold' 
                              : 'bg-secondary/40 border-border hover:bg-secondary/80 text-foreground'
                          }`}
                        >
                          Rp {Number(amt).toLocaleString("id-ID")}
                        </button>
                      ))}
                    </div>

                    <form onSubmit={handleWithdraw} className="space-y-3 pt-2">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">Rp</span>
                        <input 
                          type="number" 
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder="Ketik nominal kustom..." 
                          className="w-full bg-secondary/30 border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm font-mono focus:border-primary outline-none transition-all text-foreground"
                          required
                          min="1"
                        />
                      </div>
                      <button 
                        type="submit" 
                        disabled={isProcessing || !withdrawAmount}
                        className="w-full bg-secondary border border-border text-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-secondary/80 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
                        Proses Penarikan
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
