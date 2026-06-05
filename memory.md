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

## 4. Notes & Constraints
- Dilarang mengganti *engine* database (harus menggunakan MySQL yang sudah ada dan tidak merusak data eksisting).
- Semua pengembangan fitur ke depannya wajib dikoordinasikan melalui API Gateway.

## 5. Rencana Pengembangan Selanjutnya (Next Steps)
Untuk pengembangan di hari/sesi berikutnya, fokus pada langkah-langkah berikut:
1. **Pemisahan Fitur Berdasarkan Role:** Mengimplementasikan spesifikasi fungsionalitas dan perizinan spesifik untuk masing-masing role (`NASABAH`, `ADMIN`, `MANAGER`, `TELLER`).
2. **Pengecekan Keseluruhan API:** Mengecek dan melakukan validasi keamanan serta fungsional pada semua *endpoint* API (Wallet & Central-Bank) yang dilewati oleh Gateway.
3. **Pembuatan Frontend:** Merancang dan membangun UI/UX antarmuka pengguna *(Frontend)* yang akan terhubung ke API Gateway untuk memvisualisasikan sistem.
