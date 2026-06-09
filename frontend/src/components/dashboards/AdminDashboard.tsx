"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Landmark, RefreshCw, RotateCcw, Search, ShieldCheck } from "lucide-react";
import { fetchApi } from "@/lib/api";

type Supply = {
  total_supply: string | number;
  reserve_balance: string | number;
  circulating_supply: string | number;
  sink_or_burn_accounting: string | number;
  invariant_total: string | number;
  invariant_valid: boolean;
};

type LedgerEntry = {
  id: string;
  transactionId: string;
  accountId: string;
  direction: string;
  amount: string | number;
  balanceAfter: string | number;
  description?: string;
  createdAt: string;
};

const money = (value: string | number | undefined) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value || 0));

const unwrap = <T,>(response: { data?: T } | T): T =>
  typeof response === "object" && response !== null && "data" in response ? (response as { data: T }).data : (response as T);

export default function AdminDashboard() {
  const [supply, setSupply] = useState<Supply | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [accountId, setAccountId] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [reversalId, setReversalId] = useState("");
  const [reasonCode, setReasonCode] = useState("ADMIN_CORRECTION");
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const loadSupply = useCallback(async () => {
    const response = await fetchApi<{ data?: Supply } | Supply>("/api/bank/central-bank/supply");
    setSupply(unwrap(response));
  }, []);

  const loadLedger = useCallback(async () => {
    const params = new URLSearchParams();
    if (accountId.trim()) params.set("account_id", accountId.trim());
    if (transactionId.trim()) params.set("transaction_id", transactionId.trim());
    const response = await fetchApi<{ data?: LedgerEntry[] } | LedgerEntry[]>(
      `/api/bank/central-bank/ledger${params.size ? `?${params.toString()}` : ""}`,
    );
    const data = unwrap(response);
    setLedger(Array.isArray(data) ? data : []);
  }, [accountId, transactionId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      await Promise.all([loadSupply(), loadLedger()]);
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Data bank sentral gagal dimuat." });
    } finally {
      setLoading(false);
    }
  }, [loadLedger, loadSupply]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const submitLedgerFilter = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await loadLedger();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Ledger gagal dimuat." });
    } finally {
      setLoading(false);
    }
  };

  const reverseTransaction = async (event: FormEvent) => {
    event.preventDefault();
    setProcessing(true);
    setNotice(null);
    try {
      await fetchApi("/api/bank/central-bank/reversals", {
        method: "POST",
        body: JSON.stringify({ original_transaction_id: reversalId.trim(), reason_code: reasonCode.trim(), note: note.trim() || undefined }),
      });
      setNotice({ tone: "success", text: "Reversal diterima dan tercatat pada ledger." });
      setReversalId("");
      setNote("");
      await refresh();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Reversal gagal diproses." });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 font-mono text-xs font-semibold uppercase text-primary">Central bank operations</p>
          <h1 className="text-balance font-display text-3xl font-semibold">Kendali moneter dan integritas ledger</h1>
          <p className="mt-2 max-w-2xl text-pretty text-sm text-muted-foreground">Pantau pasokan CBDC, telusuri pencatatan double-entry, dan lakukan reversal dengan jejak alasan yang eksplisit.</p>
        </div>
        <button onClick={() => void refresh()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold shadow-sm hover:bg-secondary disabled:opacity-50">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Segarkan data
        </button>
      </header>

      {notice && (
        <div className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${notice.tone === "success" ? "border-primary/30 bg-primary/10 text-primary" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>
          {notice.tone === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          {notice.text}
        </div>
      )}

      <section id="monetary" className="grid scroll-mt-8 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total supply", supply?.total_supply],
          ["Circulating supply", supply?.circulating_supply],
          ["Reserve balance", supply?.reserve_balance],
          ["Sink / burn accounting", supply?.sink_or_burn_accounting],
        ].map(([label, value], index) => (
          <article key={String(label)} className={`rounded-2xl border p-5 shadow-sm ${index === 0 ? "border-primary/30 bg-primary text-primary-foreground md:col-span-2" : "border-border bg-card"}`}>
            <p className={`text-xs font-semibold uppercase ${index === 0 ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{label}</p>
            <p className="mt-4 font-mono text-2xl font-semibold tabular-nums">{loading ? "Memuat..." : money(value)}</p>
          </article>
        ))}
        <article className="rounded-2xl border border-border bg-card p-5 shadow-sm md:col-span-2">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary"><ShieldCheck size={20} /></div>
            <div>
              <p className="text-sm font-semibold">Invariant ledger</p>
              <p className="text-xs text-muted-foreground">Total terhitung: <span className="font-mono tabular-nums">{money(supply?.invariant_total)}</span></p>
            </div>
            <span className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${supply?.invariant_valid ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
              {supply?.invariant_valid ? "VALID" : "PERLU INVESTIGASI"}
            </span>
          </div>
        </article>
      </section>

      <section id="ledger" className="scroll-mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border p-5">
          <div className="mb-4 flex items-center gap-3"><Landmark className="text-primary" size={20} /><h2 className="font-display text-xl font-semibold">Penelusuran ledger</h2></div>
          <form onSubmit={submitLedgerFilter} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="Account ID" className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary" />
            <input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder="Transaction ID" className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary" />
            <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><Search size={16} /> Cari</button>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground"><tr><th className="p-4">Waktu</th><th className="p-4">Transaksi</th><th className="p-4">Akun</th><th className="p-4">Arah</th><th className="p-4 text-right">Nominal</th><th className="p-4 text-right">Saldo akhir</th></tr></thead>
            <tbody>
              {ledger.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Belum ada entri ledger untuk filter ini.</td></tr> : ledger.slice(0, 30).map((entry) => (
                <tr key={entry.id} className="border-t border-border">
                  <td className="p-4 text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString("id-ID")}</td>
                  <td className="max-w-48 truncate p-4 font-mono text-xs" title={entry.transactionId}>{entry.transactionId}</td>
                  <td className="max-w-48 truncate p-4 font-mono text-xs" title={entry.accountId}>{entry.accountId}</td>
                  <td className="p-4"><span className="rounded-full bg-secondary px-2 py-1 font-mono text-xs">{entry.direction}</span></td>
                  <td className="p-4 text-right font-mono tabular-nums">{money(entry.amount)}</td>
                  <td className="p-4 text-right font-mono tabular-nums">{money(entry.balanceAfter)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <form id="reversal" onSubmit={reverseTransaction} className="scroll-mt-8 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-3">
          <div className="flex items-center gap-3"><RotateCcw className="text-primary" size={20} /><h2 className="font-display text-xl font-semibold">Reversal transaksi</h2></div>
          <p className="text-pretty text-sm text-muted-foreground">Gunakan hanya untuk koreksi operasional yang sudah diverifikasi. Alasan akan masuk ke jejak audit.</p>
          <input required value={reversalId} onChange={(e) => setReversalId(e.target.value)} placeholder="Original transaction ID" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary" />
          <div className="grid gap-3 md:grid-cols-2">
            <input required value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} placeholder="Reason code" className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary" />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan opsional" className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <button disabled={processing} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"><RotateCcw size={16} /> {processing ? "Memproses..." : "Proses reversal"}</button>
        </form>

        <aside className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
          <h2 className="font-display text-lg font-semibold">Cakupan API saat ini</h2>
          <div className="mt-5 space-y-4 text-sm">
            {["Monitoring supply", "Pencarian ledger", "Reversal transaksi"].map((item) => <div key={item} className="flex items-center gap-3"><CheckCircle2 size={17} className="text-primary" /><span>{item}</span></div>)}
            {["Issuance dan burn manual", "Pengaturan fee", "Daftar audit terpusat"].map((item) => <div key={item} className="flex items-center gap-3 text-muted-foreground"><AlertTriangle size={17} /><span>{item}: endpoint belum tersedia</span></div>)}
          </div>
        </aside>
      </section>
    </div>
  );
}
