"use client";

import { FormEvent, useState } from "react";
import { AlertTriangle, CheckCircle2, Search, ShieldAlert, UserCheck, UserX, Wallet, XCircle } from "lucide-react";
import { fetchApi } from "@/lib/api";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  kycTier: string;
  wallets?: Array<{ id: string; availableBalance: string | number; status: string }>;
};

const money = (value: string | number | undefined) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value || 0));
const unwrap = <T,>(response: { data?: T } | T): T | undefined =>
  typeof response === "object" && response !== null && "data" in response ? (response as { data?: T }).data : (response as T);

export default function ManagerDashboard() {
  const [query, setQuery] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loanId, setLoanId] = useState("");
  const [reasonCode, setReasonCode] = useState("MANAGER_REVIEW");
  const [processing, setProcessing] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const searchCustomer = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!query.trim()) return;
    setProcessing("search");
    setNotice(null);
    try {
      const response = await fetchApi<{ data?: Customer } | Customer>(`/api/bank/teller/customer?query=${encodeURIComponent(query.trim())}`);
      const data = unwrap<Customer>(response);
      setCustomer(data || null);
    } catch (error) {
      setCustomer(null);
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Nasabah tidak ditemukan." });
    } finally {
      setProcessing("");
    }
  };

  const runAction = async (key: string, endpoint: string, payload: object, success: string) => {
    setProcessing(key);
    setNotice(null);
    try {
      await fetchApi(endpoint, { method: "POST", body: JSON.stringify(payload) });
      setNotice({ tone: "success", text: success });
      if (customer) await searchCustomer();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Aksi gagal diproses." });
    } finally {
      setProcessing("");
    }
  };

  const userAction = (action: "suspend" | "activate") => {
    if (!customer) return;
    void runAction(action, `/api/bank/manager/users/${action}`, { userId: customer.id, reasonCode: reasonCode.trim() }, `Status ${customer.name} berhasil diperbarui.`);
  };

  const loanAction = (action: "approve" | "reject") => {
    if (!loanId.trim()) {
      setNotice({ tone: "error", text: "Loan ID wajib diisi sebelum keputusan dibuat." });
      return;
    }
    void runAction(action, `/api/bank/manager/loans/${action}`, { loanId: loanId.trim(), reasonCode: reasonCode.trim() }, `Pinjaman ${loanId.trim()} berhasil ${action === "approve" ? "disetujui" : "ditolak"}.`);
  };

  return (
    <div className="space-y-8">
      <header>
        <p className="mb-2 font-mono text-xs font-semibold uppercase text-primary">Manager control center</p>
        <h1 className="text-balance font-display text-3xl font-semibold">Keputusan risiko yang dapat ditelusuri</h1>
        <p className="mt-2 max-w-2xl text-pretty text-sm text-muted-foreground">Cari profil nasabah sebelum mengubah status akun dan sertakan reason code pada setiap keputusan sensitif.</p>
      </header>

      {notice && <div className={`rounded-xl border p-4 text-sm ${notice.tone === "success" ? "border-primary/30 bg-primary/10 text-primary" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>{notice.text}</div>}

      <section id="risk" className="grid scroll-mt-8 gap-6 lg:grid-cols-5">
        <article className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-3">
          <div className="mb-5 flex items-center gap-3"><ShieldAlert className="text-primary" size={20} /><h2 className="font-display text-xl font-semibold">Kontrol risiko akun</h2></div>
          <form onSubmit={searchCustomer} className="flex flex-col gap-3 sm:flex-row">
            <input required value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Email, telepon, atau User ID" className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            <button disabled={processing === "search"} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"><Search size={16} /> {processing === "search" ? "Mencari..." : "Cari nasabah"}</button>
          </form>

          {customer ? (
            <div className="mt-6 rounded-xl border border-border bg-background p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div><p className="font-display text-lg font-semibold">{customer.name}</p><p className="text-sm text-muted-foreground">{customer.email} · {customer.phone || "Tanpa telepon"}</p><p className="mt-2 font-mono text-xs text-muted-foreground">{customer.id}</p></div>
                <div className="flex gap-2"><span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">{customer.status}</span><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{customer.kycTier}</span></div>
              </div>
              <div className="mt-5 flex items-center gap-3 border-t border-border pt-4"><Wallet size={17} className="text-primary" /><div><p className="text-xs text-muted-foreground">Saldo dompet utama</p><p className="font-mono font-semibold tabular-nums">{money(customer.wallets?.[0]?.availableBalance)}</p></div></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button onClick={() => userAction("suspend")} disabled={Boolean(processing)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-50"><UserX size={16} /> Bekukan akun</button>
                <button onClick={() => userAction("activate")} disabled={Boolean(processing)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20 disabled:opacity-50"><UserCheck size={16} /> Aktifkan akun</button>
              </div>
            </div>
          ) : <div className="mt-6 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Cari nasabah untuk melihat konteks sebelum mengambil tindakan.</div>}
        </article>

        <aside className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
          <h2 className="font-display text-lg font-semibold">Alasan keputusan</h2>
          <p className="mt-2 text-sm text-muted-foreground">Reason code yang sama digunakan untuk aksi berikutnya dan disimpan pada audit log.</p>
          <label className="mt-5 block text-xs font-semibold uppercase text-muted-foreground">Reason code</label>
          <input required value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary" />
          <div className="mt-6 rounded-xl bg-secondary/50 p-4 text-sm text-muted-foreground"><AlertTriangle size={18} className="mb-2 text-primary" /> Verifikasi identitas dan konteks kasus sebelum suspend, activate, approve, atau reject.</div>
        </aside>
      </section>

      <section id="loans" className="scroll-mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3"><CheckCircle2 className="text-primary" size={20} /><h2 className="font-display text-xl font-semibold">Keputusan pinjaman</h2></div>
        <p className="mt-2 text-sm text-muted-foreground">Backend belum menyediakan daftar pinjaman pending. Gunakan Loan ID dari hasil operasional yang telah diverifikasi.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <input value={loanId} onChange={(e) => setLoanId(e.target.value)} placeholder="Loan ID" className="rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary" />
          <button onClick={() => loanAction("approve")} disabled={Boolean(processing)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"><CheckCircle2 size={16} /> Setujui</button>
          <button onClick={() => loanAction("reject")} disabled={Boolean(processing)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-semibold hover:bg-secondary/80 disabled:opacity-50"><XCircle size={16} /> Tolak</button>
        </div>
      </section>
    </div>
  );
}
