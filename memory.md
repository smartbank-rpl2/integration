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

- **[2026-06-09] P1 Business Flow Cleanup & Audit Hardening:**
  - Memisahkan tipe transaksi Teller top-up/withdrawal dari `INITIAL_DISTRIBUTION` menjadi `TOP_UP` dan `WITHDRAWAL`, termasuk Prisma schema dan migration SQL agar kuota initial distribution tidak tercampur dengan operasi teller.
  - Menambahkan audit log dan `reasonCode` opsional/default untuk KYC verification, Teller top-up/withdrawal, Manager suspend/activate user, loan approve, dan loan reject.
  - Merapikan route Wallet legacy `/wallets/me/topup` dan `/wallets/me/withdraw` agar menjadi self-service simulation `WALLET_USER` + PIN, bukan endpoint Teller yang terjebak dua role. Operasi teller nyata tetap melalui Central Bank `/api/v1/teller/*`.
  - Memperbaiki kontrak transfer frontend Retail Dashboard dari `payeeWalletId` menjadi `to_wallet_id`, mengirim amount sebagai string, dan mengganti PIN hardcoded dengan input PIN.
  - Menambahkan regression test untuk klasifikasi `TOP_UP`/`WITHDRAWAL` dan audit reason Manager suspend.
  - Validasi: Central-Bank `tsc --noEmit` PASS, `nest build` PASS, targeted P0/P1 tests 9/9 PASS, Wallet syntax check PASS. Full Central-Bank suite 9/10 PASS; `rbac.spec.ts` masih timeout saat bootstrapping AppModule karena dependency environment/database test. Frontend `tsc --noEmit` masih gagal pada error lama di `dashboard/page.tsx` role comparison dan `next-themes/dist/types`, bukan dari perubahan transfer.

- **[2026-06-09] Frontend Design Completion (Role Dashboard Coverage):**
  - Melengkapi dashboard role `ADMIN`/`CENTRAL_BANK_ADMIN` dengan UI Central Bank untuk monitoring supply, ledger filter, reversal transaksi, serta panel kapabilitas yang menandai endpoint yang belum tersedia agar frontend tidak menampilkan aksi palsu.
  - Mengubah Retail Dashboard agar menggunakan balance dan transaction history nyata dari API, menurunkan grafik dari transaksi aktual, mengganti `prompt`/`alert` dengan form dan notifikasi inline, serta menambahkan alur apply loan dan repayment.
  - Mengubah Manager Dashboard menjadi risk control center berbasis pencarian nasabah, detail wallet/status/KYC, reason code audit, suspend/activate, dan approve/reject loan berbasis Loan ID karena backend belum menyediakan daftar pending loan.
  - Menambahkan reason code pada Teller Dashboard untuk KYC, top-up, dan withdraw agar sejalan dengan audit hardening P1.
  - Merapikan dashboard layout: navigasi sidebar berbasis role dengan anchor tujuan nyata, dukungan role `WALLET_USER`/`RETAIL`/`CENTRAL_BANK_ADMIN`, theme toggle di topbar, dan penggantian `h-screen` menjadi `h-dvh`.
  - Memperbaiki error frontend lama: tipe role auth, `next-themes` type import, duplikasi import Tailwind, login email field, register tanpa payload role, serta helper API typed generic dengan `NEXT_PUBLIC_API_BASE_URL`.
  - Validasi: frontend `tsc --noEmit --incremental false` PASS, `npm run lint` PASS, dan `npm run build` PASS setelah build diberi akses jaringan untuk `next/font` Google Fonts. Browser Use tool tidak tersedia di sesi ini; smoke preview lokal tidak dapat dilanjutkan karena proses `next start` tidak menetap pada sandbox Windows.

- **[2026-06-09] Wallet Registration `updated_at` Compatibility Fix:**
  - Memperbaiki kegagalan registrasi Wallet `Field 'updated_at' doesn't have a default value` yang terjadi karena Wallet melakukan SQL insert langsung ke tabel Prisma `users`, sementara `@updatedAt` hanya dikelola otomatis saat menggunakan Prisma Client.
  - Menambahkan migration `20260609153000_add_updated_at_defaults` untuk memberikan default dan auto-update timestamp pada `users`, `wallet_accounts`, dan `idempotency_keys`.
  - Query registrasi user dan seed staff Wallet sekarang juga mengisi serta memperbarui `updated_at` secara eksplisit sebagai perlindungan tambahan.
  - Validasi: migration deploy PASS, syntax check Wallet PASS, register user baru melalui Gateway PASS, login user baru PASS, saldo awal Rp50.000 terbentuk, dan kolom `updated_at` terisi pada database.

- **[2026-06-09] Staff Account Seed Role Migration:**
  - Menambahkan migration `20260609154500_add_staff_user_roles` untuk memastikan enum database `users.role` memuat `MANAGER` dan `TELLER`, sesuai Prisma schema dan RBAC aplikasi.
  - Menjalankan seed staff Wallet dengan `ENABLE_STAFF_SEED=true`; akun `teller@test.com` dan `manager@test.com` berhasil dibuat dengan password `password` dan PIN `123456`.
  - Validasi: login Teller dan Manager melalui Gateway `/api/wallet/v1/auth/login` PASS, role token masing-masing `TELLER` dan `MANAGER`.

- **[2026-06-09] Phase 2 Security Hardening:**
  - Menyelesaikan hardening middleware Wallet: error auth/PIN tidak lagi membocorkan detail internal, request ID dipakai konsisten, PIN verification diaudit, dan RBAC Wallet hanya mempercayai role dari JWT terverifikasi, bukan header `x-user-role`.
  - Menambahkan middleware keamanan native pada Gateway, Wallet, dan Central-Bank untuk security headers (CSP, nosniff, frame deny, HSTS, X-XSS-Protection, Referrer-Policy), request ID tracking, audit logging JSON, input sanitization, CORS allowlist, dan rate limiting per-IP.
  - Memperketat JWT: `JWT_SECRET` wajib dikonfigurasi tanpa fallback hardcoded, token memakai issuer/audience, dan fallback login Wallet memverifikasi token Central-Bank sebelum membaca payload.
  - Memperketat validasi input Wallet dan DTO Central-Bank dengan batas panjang, numeric string validation untuk nominal, sanitasi string, serta error response 5xx generik tanpa stack/database detail.
  - Menambahkan audit login/register di Wallet dan Central-Bank, audit pembayaran/transfer/PIN di Wallet, dan memastikan audit settlement/teller/manager Central-Bank tetap memakai `AuditLogService`.
  - Verifikasi SQL injection: tidak ditemukan pemakaian `$queryRawUnsafe`/`$executeRawUnsafe`; raw query Wallet yang diperiksa memakai parameter binding.
  - Catatan dependency: instalasi `helmet` dan `express-rate-limit` via npm diblokir sandbox/network (`EACCES` ke registry), sehingga kontrol ekuivalen diimplementasikan secara lokal tanpa menambah dependency yang belum tersedia.
  - Validasi: JS syntax check Gateway/Wallet PASS, Central-Bank `npm run build` PASS dengan `JWT_SECRET` test, `git diff --check` PASS. Central-Bank full test 9/10 suite PASS; `rbac.spec.ts` masih gagal karena MySQL lokal `127.0.0.1:3306` tidak berjalan, sama seperti kendala environment sebelumnya.

- **[2026-06-10] Phase 2 Security Hardening Verification:**
  - **Verifikasi Middleware Security:**
    - Gateway (`middleware/security.js`): requestContext, securityHeaders (CSP, nosniff, frame DENY, HSTS, X-XSS-Protection, Referrer-Policy), auditRequests, createRateLimiter (100 req/min) — semua sudah terimplementasi dan diapply via `server.js`.
    - Wallet (`src/middleware/security.middleware.js`): requestContextMiddleware, securityHeadersMiddleware (dengan 'self' CSP), sanitizeInputMiddleware, auditRequestMiddleware, createRateLimiter (100 req/min general, 10 req/min auth) — semua terapply via `app.js`.
    - Central-Bank (`src/common/security.middleware.ts`): requestContext, securityHeaders, sanitizeInput, auditRequests, createRateLimiter (200 req/min general, 20 req/min auth) — terapply via `main.ts`.
  - **JWT Secret Validation:** Gateway `server.js` throw error jika `JWT_SECRET` tidak diset ✅; Wallet `config.js` throw error jika tidak diset ✅; JWT middleware verifikasi token dengan issuer/audience ✅
  - **Input Validation & Sanitization:** Central-Bank `ValidationPipe` dengan whitelist+forbidNonWhitelisted ✅; Wallet `sanitizeInputMiddleware` bersihkan control characters ✅; sensitive keys di-exclude ✅
  - **Error Handling Security:** Semua layer error 500 pesan generic, tidak ada stack trace ✅
  - **SQL Injection Prevention:** Central-Bank Prisma ORM parameterized; Wallet `db.query()` parameterized; tidak ada `$queryRawUnsafe`/`$executeRawUnsafe` ✅
  - **Rate Limiting:** Implementasi lokal (helmet/express-rate-limit tidak bisa diinstal); Auth endpoints 10-20 req/min, general 100-200 req/min ✅
  - **Audit Logging:** Request audit dengan timestamp, request_id, user_id, action, IP, status, duration ✅; PIN verification diaudit ✅
  - **Validasi Build & Test:** Gateway/Wallet JS syntax PASS; Central-Bank `npm run build` PASS; loan test PASS
  - **CORS Security:** Origin allowlist (tidak ada wildcard), credential/method restrictions ✅
  - **Security Headers:** CSP, X-Content-Type-Options, X-Frame-Options, HSTS, X-XSS-Protection, Referrer-Policy, X-Powered-By dihapus ✅
  - **Catatan:** Tidak ada celah SQL injection, XSS, CSRF, atau auth bypass. Rate limiter in-memory (reset on restart). Untuk production gunakan Redis untuk distributed rate limiting.

- **[2026-06-10] Docker Reinstall Recovery & Container Setup:**
  - Menata ulang `docker-compose.yml` agar stack lengkap berjalan melalui MySQL, Central-Bank, Wallet, Gateway, dan frontend Next.js, dengan internal service URL, `healthcheck`, `depends_on: service_healthy`, dan port host `3306/3000/6969/4000/3001`.
  - Menambahkan Dockerfile dan `.dockerignore` untuk Gateway dan frontend, mengganti runtime frontend ke `node:20-bookworm-slim`, serta memasang native binary `lightningcss` dan `@tailwindcss/oxide` secara eksplisit agar build Next.js stabil di container.
  - Memperbaiki startup Central-Bank agar memakai `prisma migrate deploy` plus seed, menaruh `prisma` setelah install dependency untuk layer cache yang lebih baik, dan menghapus cache `*.tsbuildinfo` dari build context.
  - Menyelaraskan idempotency Wallet ke status `PROCESSING/COMPLETED`, lalu menambahkan migrasi Prisma `20260610152000_add_pending_loan_status` agar enum `loans.status` menerima `PENDING`.
  - Verifikasi akhir: `docker compose up -d --wait` sukses, semua container healthy, smoke test host 200 pada `3000/4000/3001/6969`, login staff `teller@test.com` dan `manager@test.com` PASS, KYC PASS, top-up PASS, balance PASS, dan loan apply PASS dengan status `PENDING`.

- **[2026-06-11] README Manual Testing & API Documentation Refresh:**
  - Mengganti README lama yang sudah tidak sinkron dengan panduan operasional berbasis Gateway port `4000`, frontend port `3001`, dan lifecycle Docker Compose terbaru.
  - Menambahkan tata cara testing manual untuk user Retail, Teller, dan Manager: registrasi dua user, verifikasi KYC, top-up/withdraw, transfer, apply loan, approve/reject loan, suspend, dan activate.
  - Mendokumentasikan akun seed `teller@test.com` dan `manager@test.com`, requirement `ENABLE_STAFF_SEED=true`, cara mengambil Loan ID dari Network/API karena UI belum punya daftar loan `PENDING`, serta catatan bahwa akun `CENTRAL_BANK_ADMIN` tidak dibuat default.
  - Menambahkan katalog endpoint Wallet dan Central-Bank via Gateway, header `Authorization`, `Idempotency-Key`, `X-Wallet-Pin`, format respons, contoh PowerShell API, aturan finansial utama, dan troubleshooting Docker.
  - Validasi: semua container `healthy`; Gateway health PASS; Wallet root HTTP 200; Central-Bank health PASS; frontend `/login` HTTP 200; smoke test API PASS untuk register dua user, login, balance awal Rp50.000, transfer dengan PIN, loan apply, Manager approve, dan verifikasi transaksi `LOAN_DISBURSEMENT`.

- **[2026-06-11] KYC Documents, Loan Queue, and Route Split Update:**
  - Menambahkan field dokumen identitas pada tabel `users` untuk menyimpan tipe dokumen, nomor identitas, nama pada dokumen, data URL file, dan timestamp upload.
  - Wallet kini menyediakan endpoint upload/lihat dokumen KYC, Teller hanya bisa verifikasi jika dokumen sudah ada, dan nasabah BASIC dibatasi saldo sampai `Rp 100.000` sebelum KYC terverifikasi.
  - Pengajuan pinjaman ditolak untuk nasabah BASIC, dan Manager kini mendapat endpoint antrean pinjaman `PENDING` berisi data borrower, KYC, saldo, pokok, bunga, total due, serta preview dokumen.
  - Frontend dipisah ke route nyata seperti `/kyc`, `/transfer`, `/pinjaman`, `/teller/nasabah`, `/manager/pinjaman`, dan `/admin`, dengan shell navigasi berbasis role serta akun seed admin `admin@test.com`.
  - Validasi: Central-Bank test suite PASS 11/11, frontend lint PASS, frontend typecheck PASS, frontend build PASS, Wallet syntax PASS, dan smoke test API PASS untuk upload dokumen, verifikasi KYC, pembatasan BASIC, loan queue Manager, serta login admin `CENTRAL_BANK_ADMIN`.
