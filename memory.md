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

## 4. Notes & Constraints
- Dilarang mengganti *engine* database (harus menggunakan MySQL yang sudah ada dan tidak merusak data eksisting).
- Semua pengembangan fitur ke depannya wajib dikoordinasikan melalui API Gateway.

## 5. Rencana Pengembangan Selanjutnya (Next Steps)
Untuk pengembangan di hari/sesi berikutnya, fokus pada langkah-langkah berikut:
1. **Pengecekan Keseluruhan API (End-to-End):** Mengecek dan melakukan validasi fungsional pada semua alur (*flow*) mulai dari Gateway, Wallet, hingga Central Bank secara utuh (E2E Integration).
2. **Pembuatan Frontend:** Merancang dan membangun UI/UX antarmuka pengguna *(Frontend)* dengan framework modern yang akan terhubung ke API Gateway untuk memvisualisasikan sistem Role yang sudah dibangun.
