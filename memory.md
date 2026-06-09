# Project Memory (Konteks AI)

Dokumen ini berisi rangkuman status terkini proyek, sejarah implementasi, dan arsitektur sistem. Sesuai aturan di `gemini.md`, file ini harus dibaca untuk mendapatkan konteks sebelum mengerjakan tugas baru.

## 1. Arsitektur Proyek (CBDC System)
Sistem ini menggunakan arsitektur microservices-lite yang dipisahkan ke dalam beberapa modul:
- **Central-Bank:** Core Engine (NestJS + Prisma). Berfungsi sebagai *source of truth* untuk pencatatan buku besar (ledger), saldo, dan manajemen akun CBDC.
- **Wallet:** Client Application Backend (Express.js + MySQL Native). Berfungsi mengelola autentikasi pengguna dan pemetaan hak akses, namun tidak menyimpan saldo secara independen (tidak ada *shared database anti-pattern*).
- **Gateway:** API Gateway (Express.js + `http-proxy-middleware`). Bertindak sebagai *Single Entry Point* untuk semua *request* masuk. Melakukan *forwarding* ke port Central-Bank atau Wallet, dilengkapi middleware validasi token (JWT).

## 2. Status Implementasi Saat Ini
- **Role System:** Tedapat 4 Role yang diizinkan dalam sistem (berdasarkan Sprint 1-3):
  1. `NASABAH`
  2. `ADMIN`
  3. `MANAGER` (baru ditambahkan)
  4. `TELLER` (baru ditambahkan)
- **Database Central-Bank:** Prisma schema telah diperbarui dengan enum role baru dan migrasi berhasil (`@prisma/client` v6.1.0).
- **Authentication:** Wallet (`auth.service.js`) telah disinkronisasi untuk memetakan (`mapDbRole`) user yang masuk dengan 4 role tersebut.
- **Testing:** Seluruh backend Central-Bank (Unit tests menggunakan Jest) telah diperbaiki dan berjalan lancar (hijau). Gateway proxy bekerja secara struktural.

## 3. Log Perubahan / Change History
- **[2026-06-06] Sprint 1-3 Completed:** 
  - Penambahan `MANAGER` dan `TELLER` pada Prisma Schema di `Central-Bank`.
  - Pembuatan API Gateway (Node/Express) yang berjalan dengan `http-proxy-middleware`.
  - Sinkronisasi role autentikasi pada `Wallet`.
  - Seluruh *unit test* Prisma divalidasi dan berhasil *PASS*.
  - Perubahan di-*commit* ke repositori Git (`feat: implement API Gateway, update MANAGER and TELLER roles`).
  - Pembuatan file `gemini.md` dan `memory.md` sebagai pondasi kepatuhan operasional AI.
- **[2026-06-07] Sprint 4 Completed (RBAC & Feature Separation):**
  - Diimplementasikan `requireRole` middleware di sisi *Wallet* untuk memproteksi endpoint P2P, pembayaran, dan manajemen profil khusus untuk `WALLET_USER`.
  - Diimplementasikan `@Roles` decorator dan `RolesGuard` di sisi *Central-Bank* (NestJS) yang memvalidasi header `x-user-role`.
  - Mengamankan endpoint Moneter, Ledger, dan Settlement (seperti Reversal) di Central-Bank agar hanya bisa diakses oleh `CENTRAL_BANK_ADMIN`.
  - Lolos uji *compile* dan *unit testing* (`npm test`) di *Central-Bank*.

- **[2026-06-07] Sprint 5 Completed (TELLER & MANAGER Modules):**
  - Mengubah Prisma schema dengan penambahan status `PENDING` pada `LoanStatus`.
  - Mengubah alur pengajuan pinjaman (`applyLoan`) agar membuat loan dengan status `PENDING` tanpa langsung mencairkan dana.
  - Membangun `TellerModule` untuk verifikasi KYC nasabah, memproses Top-up, dan melakukan Withdrawal.
  - Membangun `ManagerModule` untuk mengaktifkan/membekukan (*suspend*) akun nasabah, serta menyetujui (*approve*) atau menolak (*reject*) pinjaman.
  - Menambahkan method pendukung `settleTopUp`, `settleWithdrawal`, dan `settleLoanApproval` di `SettlementService`.
  - Integrasi NestJS sukses dan lolos uji kompilasi (`npm run build`).

- **[2026-06-07] Phase 2 (Frontend Integration & E2E Testing):**
  - Menerapkan arsitektur UI Next.js dengan Zustand dan Framer Motion.
  - Memperbaiki rute Fetch API Gateway (`/api/wallet/...` dan `/api/bank/...`) agar tidak mengembalikan 404.
  - Memperbaiki crash *token parsing* saat Login agar mengakses `loginRes.data.accessToken` yang benar.
  - Mengubah `/register` untuk menghapus pilihan dropdown Role agar pendaftar otomatis menjadi `RETAIL` (Nasabah).
  - Menyuntikkan kredensial dummy untuk `TELLER` dan `MANAGER` langsung ke konfigurasi *Mock DB* In-Memory dari Wallet Service, sehingga testing bisa langsung dilakukan dari UI login.
  - Memperbaiki payload request E2E Test pada simulasi transfer sehingga sinkron dengan Central Bank API.
  - Uji End-to-End Test (`e2e-test.js`) 100% PASS meliputi (Register, Login, KYC Verification, Top Up, Apply Loan, Approve Loan, Transfer, Suspend User, Fail Transfer Suspended, Activate User, Withdraw).

## 4. Notes & Constraints
- Dilarang mengganti *engine* database (harus menggunakan MySQL yang sudah ada dan tidak merusak data eksisting).
- Semua pengembangan fitur ke depannya wajib dikoordinasikan melalui API Gateway.
- Akun Teller dan Manager dummy harus tetap disiapkan oleh sistem atau backend, sementara halaman pendaftaran publik /register hanya bisa mendaftarkan profil nasabah (Retail).

## 5. Rencana Pengembangan Selanjutnya (Next Steps)
Untuk pengembangan di hari/sesi berikutnya, fokus pada langkah-langkah berikut:
1. **Pengecekan Keseluruhan API (End-to-End):** Gateway ke Wallet ke Central Bank berfungsi dengan sinkron, termasuk autentikasi role JWT terpusat dan perbaikan isu `Idempotency-Key` pada POST requests. Status pengecekan API E2E: **SELESAI (PASS 100%)**.
2. **Pembuatan Frontend (SELESAI - PASS)**
  - UI Frontend untuk login, pendaftaran khusus nasabah, dan Role-Based Dashboard telah selesai.
  - Endpoints untuk fungsionalitas nasabah (balance, transfer, apply loan), teller (kyc, topup, withdraw), dan manager (suspend, activate user, approve/reject loan) telah sepenuhnya dipetakan dan di-test integrasinya.
3. **Dokumentasi & Finalisasi**
  - Menyiapkan Dokumentasi Akhir / Panduan Penggunaan (*User Manual*) yang utuh dan jelas untuk diserahkan ke pengguna.



### Current Task
- **Selesai:** Fix payload frontend & E2E test, E2E test berhasil lolos tanpa eror, penyimpanan progress di `memory.md`.

- **[2026-06-08] Session Bug Fix (Teller Login, Customer Search, & Wallet Fallback Login):**
  - **Bug 1 - Teller Login 401:** Akun teller@test.com dan manager@test.com hanya ada di Central Bank MySQL, bukan di Wallet in-memory store. Fix: tambahkan `seedStaffAccounts()` di `Wallet/src/config/database.js` yang menyuntikkan akun staff ke in-memory store saat server start.
  - **Bug 2 - Customer Not Found in Teller:** `findCustomer()` di Central Bank hanya melakukan exact match untuk email. Fix: ubah ke `contains` match + sanitasi response (hapus `passwordHash`, `pinHash`) + konversi `BigInt` balance ke `Number`.
  - **Bug 3 - Login Unauthorized Setelah Wallet Restart:** Karena database in-memory, semua user hilang setelah server Wallet me-restart. Fix: Implementasi mekanisme **Fallback Login**. Jika email tidak ditemukan di `in-memory` store, Wallet akan mencoba memverifikasi kredensial langsung ke Central Bank API. Jika sukses, data dari Central Bank akan di-*decode* (beserta *role*, *kyc tier*, dan *wallet id*) lalu di-*cache* kembali ke in-memory store sehingga login tidak putus di tengah jalan.
  - **Semua perubahan telah di-commit ke Git.**

- **Selanjutnya:** Menyusun Panduan Pengguna (User Manual) dan dashboard Manager.

- **[2026-06-09] P0 Business Logic & Authorization Hardening:**
  - Menutup celah object-level authorization pada payment request: payer wallet saat membuat dan membayar payment request sekarang wajib dimiliki oleh user JWT yang terautentikasi.
  - Menutup celah repayment pinjaman: user tidak dapat memicu debit repayment untuk loan milik user lain.
  - Mengembalikan alur pinjaman ke proses approval yang benar: endpoint apply hanya membuat loan `PENDING`, sedangkan pencairan tetap dilakukan melalui Manager approval.
  - Menambahkan idempotency transaction pada proses pengajuan loan agar retry tidak membuat loan ganda.
  - Menghapus jalur produksi Wallet yang menulis langsung ke `wallet_accounts`, `transactions`, dan `ledger_entries` untuk top-up/stimulus. Operasi nyata wajib melalui CentralBank Core.
  - Memperbaiki startup Wallet dengan menambahkan import `config` yang sebelumnya hilang.
  - Menyelaraskan pesan Wallet agar pengajuan loan dinyatakan menunggu approval Manager.
  - Menambahkan regression test object ownership, unauthorized payer payment request, dan loan apply tanpa auto-disbursement.
  - Validasi: `nest build` PASS, TypeScript `--noEmit` PASS, regression test P0 6/6 PASS, syntax check Wallet PASS. Full Central-Bank test 8/9 suite PASS; suite RBAC lama gagal hanya karena MySQL lokal `127.0.0.1:3306` tidak berjalan. ESLint belum dapat dijalankan karena konfigurasi proyek belum dimigrasikan ke format ESLint 9.

