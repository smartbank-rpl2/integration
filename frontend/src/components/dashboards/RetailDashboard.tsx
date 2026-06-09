"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, BadgeDollarSign, CheckCircle2, Clock, RefreshCw, Send, Wallet } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { fetchApi } from "@/lib/api";

type Transaction = {
  id: string;
  transaction_type: string;
  status: string;
  gross_amount: string | number;
  total_debit: string | number;
  created_at: string;
  direction: "CREDIT" | "DEBIT";
  other_party?: string;
};

const money = (value: string | number | null | undefined) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value || 0));
const unwrap = <T,>(response: { data?: T } | T): T =>
  typeof response === "object" && response !== null && "data" in response ? (response as { data: T }).data : (response as T);

export default function RetailDashboard() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [transfer, setTransfer] = useState({ walletId: "", amount: "", note: "", pin: "" });
  const [loan, setLoan] = useState({ amount: "", term: "12" });
  const [repayment, setRepayment] = useState({ loanId: "", amount: "", pin: "" });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [balanceResponse, transactionResponse] = await Promise.all([
        fetchApi<{ data?: { available_balance?: number | string }; available_balance?: number | string }>("/api/wallet/v1/wallets/me/balance"),
        fetchApi<{ data?: Transaction[] } | Transaction[]>("/api/wallet/v1/wallets/me/transactions"),
      ]);
      const balanceData = unwrap(balanceResponse);
      const transactionData = unwrap(transactionResponse);
      setBalance(Number(balanceData.available_balance || 0));
      setTransactions(Array.isArray(transactionData) ? transactionData : []);
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Data dompet gagal dimuat." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const chartData = useMemo(() => {
    let running = balance;
    return [...transactions].slice(0, 12).map((item) => {
      const amount = Number(item.direction === "DEBIT" ? item.total_debit : item.gross_amount);
      const point = { date: new Date(item.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }), value: running };
      running += item.direction === "DEBIT" ? amount : -amount;
      return point;
    }).reverse();
  }, [balance, transactions]);

  const mutate = async (key: string, endpoint: string, payload: object, success: string) => {
    setProcessing(key);
    setNotice(null);
    try {
      await fetchApi(endpoint, { method: "POST", body: JSON.stringify(payload) });
      setNotice({ tone: "success", text: success });
      await refresh();
      return true;
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Permintaan gagal diproses." });
      return false;
    } finally {
      setProcessing("");
    }
  };

  const submitTransfer = async (event: FormEvent) => {
    event.preventDefault();
    if (await mutate("transfer", "/api/wallet/v1/transfers", { to_wallet_id: transfer.walletId.trim(), amount: transfer.amount, note: transfer.note.trim() || "Transfer", pin: transfer.pin }, "Transfer berhasil diproses.")) {
      setTransfer({ walletId: "", amount: "", note: "", pin: "" });
    }
  };

  const submitLoan = async (event: FormEvent) => {
    event.preventDefault();
    if (await mutate("loan", "/api/wallet/v1/loans/apply", { amount: loan.amount, term_months: Number(loan.term) }, "Pengajuan pinjaman tercatat dan menunggu persetujuan Manager.")) {
      setLoan({ amount: "", term: "12" });
    }
  };

  const submitRepayment = async (event: FormEvent) => {
    event.preventDefault();
    if (await mutate("repayment", `/api/wallet/v1/loans/${repayment.loanId.trim()}/repay`, { amount: repayment.amount, pin: repayment.pin }, "Pembayaran pinjaman berhasil diproses.")) {
      setRepayment({ loanId: "", amount: "", pin: "" });
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 font-mono text-xs font-semibold uppercase text-primary">Retail wallet</p>
          <h1 className="text-balance font-display text-3xl font-semibold">Kendalikan uang digital Anda</h1>
          <p className="mt-2 text-pretty text-sm text-muted-foreground">Saldo, transfer, aktivitas, dan pinjaman dalam satu ruang yang terhubung ke ledger.</p>
        </div>
        <button onClick={() => void refresh()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold shadow-sm hover:bg-secondary disabled:opacity-50">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Segarkan
        </button>
      </header>

      {notice && <div className={`rounded-xl border p-4 text-sm ${notice.tone === "success" ? "border-primary/30 bg-primary/10 text-primary" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>{notice.text}</div>}

      <section id="overview" className="grid scroll-mt-8 gap-6 lg:grid-cols-5">
        <article className="rounded-2xl bg-primary p-6 text-primary-foreground shadow-sm lg:col-span-3">
          <div className="flex items-center gap-2 text-sm text-primary-foreground/75"><Wallet size={18} /> Saldo tersedia</div>
          <p className="mt-4 font-mono text-4xl font-semibold tabular-nums md:text-5xl">{loading ? "Memuat..." : money(balance)}</p>
          <div className="mt-8 h-36">
            {chartData.length > 1 ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><XAxis dataKey="date" hide /><Tooltip formatter={(value) => money(Number(value))} /><Area dataKey="value" type="monotone" stroke="currentColor" fill="currentColor" fillOpacity={0.16} isAnimationActive={false} /></AreaChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center rounded-xl border border-primary-foreground/20 text-sm text-primary-foreground/70">Grafik akan terbentuk setelah ada aktivitas transaksi.</div>}
          </div>
        </article>

        <form id="transfer" onSubmit={submitTransfer} className="scroll-mt-8 space-y-3 rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center gap-3"><Send size={19} className="text-primary" /><h2 className="font-display text-xl font-semibold">Transfer cepat</h2></div>
          <input required value={transfer.walletId} onChange={(e) => setTransfer({ ...transfer, walletId: e.target.value })} placeholder="Wallet ID penerima" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary" />
          <input required min="1" type="number" value={transfer.amount} onChange={(e) => setTransfer({ ...transfer, amount: e.target.value })} placeholder="Nominal" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary" />
          <input value={transfer.note} onChange={(e) => setTransfer({ ...transfer, note: e.target.value })} placeholder="Catatan transaksi" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          <input required inputMode="numeric" maxLength={6} type="password" value={transfer.pin} onChange={(e) => setTransfer({ ...transfer, pin: e.target.value })} placeholder="PIN 6 digit" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary" />
          <button disabled={processing === "transfer"} className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{processing === "transfer" ? "Memproses..." : "Kirim dana"}</button>
        </form>
      </section>

      <section id="loans" className="grid scroll-mt-8 gap-6 lg:grid-cols-2">
        <form onSubmit={submitLoan} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3"><BadgeDollarSign className="text-primary" size={20} /><h2 className="font-display text-xl font-semibold">Ajukan pinjaman</h2></div>
          <p className="text-sm text-muted-foreground">Pengajuan tidak langsung dicairkan. Manager harus meninjau dan menyetujuinya.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input required min="1" type="number" value={loan.amount} onChange={(e) => setLoan({ ...loan, amount: e.target.value })} placeholder="Nominal pinjaman" className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary" />
            <select value={loan.term} onChange={(e) => setLoan({ ...loan, term: e.target.value })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"><option value="3">3 bulan</option><option value="6">6 bulan</option><option value="12">12 bulan</option><option value="24">24 bulan</option></select>
          </div>
          <button disabled={processing === "loan"} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{processing === "loan" ? "Mengirim..." : "Kirim pengajuan"}</button>
        </form>

        <form onSubmit={submitRepayment} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3"><CheckCircle2 className="text-primary" size={20} /><h2 className="font-display text-xl font-semibold">Bayar pinjaman</h2></div>
          <p className="text-sm text-muted-foreground">Masukkan ID pinjaman aktif, nominal pembayaran, dan PIN transaksi.</p>
          <input required value={repayment.loanId} onChange={(e) => setRepayment({ ...repayment, loanId: e.target.value })} placeholder="Loan ID" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary" />
          <div className="grid gap-3 sm:grid-cols-2">
            <input required min="1" type="number" value={repayment.amount} onChange={(e) => setRepayment({ ...repayment, amount: e.target.value })} placeholder="Nominal bayar" className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary" />
            <input required type="password" inputMode="numeric" maxLength={6} value={repayment.pin} onChange={(e) => setRepayment({ ...repayment, pin: e.target.value })} placeholder="PIN 6 digit" className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary" />
          </div>
          <button disabled={processing === "repayment"} className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-semibold hover:bg-secondary/80 disabled:opacity-50">{processing === "repayment" ? "Memproses..." : "Bayar pinjaman"}</button>
        </form>
      </section>

      <section id="activity" className="scroll-mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border p-5"><h2 className="font-display text-xl font-semibold">Aktivitas terbaru</h2><Clock size={17} className="text-muted-foreground" /></div>
        {transactions.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">Belum ada transaksi untuk ditampilkan.</p> : transactions.slice(0, 10).map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-4 border-b border-border p-4 last:border-0 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2 text-primary">{item.direction === "CREDIT" ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</div>
              <div className="min-w-0"><p className="truncate text-sm font-semibold">{item.transaction_type.replaceAll("_", " ")}</p><p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString("id-ID")} · {item.status}</p></div>
            </div>
            <p className={`shrink-0 font-mono text-sm font-semibold tabular-nums ${item.direction === "CREDIT" ? "text-primary" : ""}`}>{item.direction === "CREDIT" ? "+" : "-"} {money(item.direction === "CREDIT" ? item.gross_amount : item.total_debit)}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
