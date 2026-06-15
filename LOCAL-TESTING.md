# SmartBank Local Testing Guide (Non-Docker / Laragon)

Panduan ini digunakan jika Anda ingin menjalankan proyek secara lokal tanpa Docker, dengan MySQL berjalan di Laragon/XAMPP.

## 1. Persiapan Database (Laragon)

1. Buka **Laragon** dan nyalakan **MySQL**.
2. Pastikan port MySQL adalah `3306`.
3. Buat database baru bernama `central_bank_core` dan `wallet_db` (bila diperlukan) atau gunakan user Laragon Anda (biasanya `root` dengan password kosong/`root`).
4. Pastikan `.env` di root folder (`C:\CODING\RPL 2\integration\.env`) memiliki konfigurasi database Laragon Anda:

```env
# Sesuaikan password dengan MySQL Laragon Anda
MYSQL_ROOT_PASSWORD=root
MYSQL_DATABASE=central_bank_core
MYSQL_USER=root
MYSQL_PASSWORD=root

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=central_bank_core

DATABASE_URL="mysql://root:root@127.0.0.1:3306/central_bank_core"
```

## 2. Copy `.env` ke masing-masing service

Beberapa service butuh `.env` lokalnya masing-masing. Jalankan perintah ini dari terminal root proyek:

**Windows PowerShell:**
```powershell
Copy-Item .env Central-Bank\.env
Copy-Item .env Wallet\.env
Copy-Item .env Gateway\.env
```

Untuk `frontend`, kita buat file `.env.local`:
```powershell
Set-Content frontend\.env.local "NEXT_PUBLIC_API_BASE_URL=http://localhost:4000"
```

*Di Wallet, pastikan di dalam `Wallet/.env` ada tambahan ini supaya URL-nya mengarah ke `localhost` bukan nama container Docker:*
```env
CENTRAL_BANK_CORE_URL=http://localhost:3000
```

*Di Gateway, pastikan di dalam `Gateway/.env` ada tambahan ini:*
```env
CENTRAL_BANK_URL=http://localhost:3000
WALLET_URL=http://localhost:6969
```

## 3. Menjalankan Migrasi Database

Lakukan migrate untuk membuat tabel di MySQL Laragon Anda menggunakan Prisma dari Central-Bank.
Jalankan perintah ini di root folder:

```bash
npm run cb:db-migrate
npm run cb:db-seed
```

*(Atau jalankan `npm run start:cb` sekali untuk inisiasi awal jika ada auto-migrate)*

## 4. Menjalankan Semua Service Sekaligus

Anda sudah dibuatkan command baru `start:local` di `package.json` yang menggunakan package `concurrently`. Anda bisa jalankan:

```bash
npm install
npm run start:local
```

Perintah di atas akan menjalankan 4 services secara paralel di Terminal Anda:
1. `Central-Bank` (Port 3000)
2. `Wallet` (Port 6969)
3. `Gateway` (Port 4000)
4. `Frontend` (Port 3001)

## 5. Cara Testing (Metode Testing)

Jika Anda ingin melakukan testing manual/otomatis:
1. Akses UI Frontend: Buka `http://localhost:3001` di browser Anda.
2. Akses API Gateway: `http://localhost:4000` (Gateway ke semua endpoit)
3. Akses Swagger Wallet API: `http://localhost:6969/api-docs` (jika tersedia/diatur)
4. Akses CB API: `http://localhost:3000/api/v1/health`

**Metode Test Otomatis Lokal:**
Jika Anda ingin mengetes per service, buka terminal baru dan jalankan:
- `npm --prefix Central-Bank run test`
- `npm --prefix Wallet run test`

Semua test akan mengeksekusi koneksi ke `127.0.0.1:3306` yaitu Laragon Anda.