"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { FileCheck2, Loader2, UploadCloud } from "lucide-react";
import { fetchApi } from "@/lib/api";

type KycDocument = {
  kycTier?: string;
  documentType?: string | null;
  documentNumber?: string | null;
  documentName?: string | null;
  documentDataUrl?: string | null;
  uploadedAt?: string | null;
  hasDocument?: boolean;
};

const unwrap = <T,>(response: { data?: T } | T): T =>
  typeof response === "object" && response !== null && "data" in response ? (response as { data: T }).data : (response as T);

export default function KycDocumentCard({ onStatusChange }: { onStatusChange?: (status: string) => void }) {
  const [document, setDocument] = useState<KycDocument | null>(null);
  const [form, setForm] = useState({ documentType: "KTP", documentNumber: "", documentName: "" });
  const [documentDataUrl, setDocumentDataUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadDocument = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchApi<{ data?: KycDocument } | KycDocument>("/api/wallet/v1/wallets/me/kyc-document");
      const data = unwrap(response);
      setDocument(data);
      setForm({
        documentType: data.documentType || "KTP",
        documentNumber: data.documentNumber || "",
        documentName: data.documentName || "",
      });
      onStatusChange?.(data.kycTier || "BASIC");
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Dokumen KYC gagal dimuat." });
    } finally {
      setLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadDocument(), 0);
    return () => window.clearTimeout(timer);
  }, [loadDocument]);

  const readFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp", "application/pdf"].includes(file.type)) {
      setNotice({ tone: "error", text: "File harus PNG, JPG, WEBP, atau PDF." });
      return;
    }
    if (file.size > 500 * 1024) {
      setNotice({ tone: "error", text: "Ukuran file maksimal 500KB untuk simulasi ini." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDocumentDataUrl(String(reader.result || ""));
      setFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!documentDataUrl && !document?.documentDataUrl) {
      setNotice({ tone: "error", text: "Upload file dokumen identitas terlebih dahulu." });
      return;
    }
    setSubmitting(true);
    setNotice(null);
    try {
      const payload = {
        ...form,
        documentDataUrl: documentDataUrl || document?.documentDataUrl,
      };
      const response = await fetchApi<{ data?: KycDocument } | KycDocument>("/api/wallet/v1/wallets/me/kyc-document", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      const data = unwrap(response);
      setNotice({ tone: "success", text: "Dokumen tersimpan. Status KYC kembali BASIC sampai Teller memverifikasi." });
      setDocumentDataUrl("");
      setFileName("");
      await loadDocument();
      onStatusChange?.(data.kycTier || "BASIC");
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Upload dokumen gagal." });
    } finally {
      setSubmitting(false);
    }
  };

  const preview = documentDataUrl || document?.documentDataUrl || "";
  const isImage = preview.startsWith("data:image/");
  const isVerified = document?.kycTier === "VERIFIED";

  return (
    <section id="kyc" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="mb-2 font-mono text-xs font-semibold uppercase text-primary">KYC identity document</p>
          <h2 className="font-display text-2xl font-semibold">Dokumen identitas nasabah</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Upload dokumen ID agar Teller dapat memeriksa data riil sebelum mengubah status KYC.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isVerified ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-600"}`}>
          {loading ? "Memuat" : isVerified ? "KYC VERIFIED" : document?.hasDocument ? "MENUNGGU TELLER" : "BELUM ADA DOKUMEN"}
        </span>
      </div>

      {notice && <div className={`mt-5 rounded-xl border p-4 text-sm ${notice.tone === "success" ? "border-primary/30 bg-primary/10 text-primary" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>{notice.text}</div>}

      <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <div className="grid gap-3 md:grid-cols-3">
            <select value={form.documentType} onChange={(event) => setForm({ ...form, documentType: event.target.value })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary">
              <option value="KTP">KTP</option>
              <option value="SIM">SIM</option>
              <option value="PASSPORT">Passport</option>
            </select>
            <input required value={form.documentNumber} onChange={(event) => setForm({ ...form, documentNumber: event.target.value })} placeholder="Nomor dokumen" className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary" />
            <input required value={form.documentName} onChange={(event) => setForm({ ...form, documentName: event.target.value })} placeholder="Nama sesuai dokumen" className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background p-8 text-center hover:bg-secondary/50">
            <UploadCloud className="mb-3 text-primary" size={26} />
            <span className="text-sm font-semibold">Pilih file KTP/SIM/Passport</span>
            <span className="mt-1 text-xs text-muted-foreground">PNG, JPG, WEBP, atau PDF maksimal 500KB</span>
            <input className="hidden" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={readFile} />
            {fileName && <span className="mt-3 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">{fileName}</span>}
          </label>

          <button disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {submitting ? <Loader2 className="animate-spin" size={16} /> : <FileCheck2 size={16} />}
            Simpan dokumen KYC
          </button>
        </div>

        <aside className="rounded-2xl border border-border bg-background p-4 lg:col-span-2">
          <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Preview teller</p>
          {preview ? (
            isImage ? (
              <Image unoptimized width={640} height={360} src={preview} alt="Preview dokumen identitas" className="max-h-72 w-full rounded-xl object-contain" />
            ) : (
              <div className="rounded-xl bg-secondary p-6 text-center text-sm text-muted-foreground">PDF tersimpan dan dapat diperiksa melalui data dokumen.</div>
            )
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Belum ada dokumen.</div>
          )}
          {document?.uploadedAt && <p className="mt-3 text-xs text-muted-foreground">Upload terakhir: {new Date(document.uploadedAt).toLocaleString("id-ID")}</p>}
        </aside>
      </form>
    </section>
  );
}
