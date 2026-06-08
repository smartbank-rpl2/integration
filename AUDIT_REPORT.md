# 🔍 AUDIT REPORT — SmartBank CBDC Ecosystem

> **Auditor:** Senior Fullstack Developer (Bank Central & E-Wallet Domain)  
> **Tanggal:** 8 Juni 2026  
> **Status:** Brainstorming & Audit — BELUM EKSEKUSI  
> **Cakupan:** Central-Bank (NestJS), Wallet (Express), Gateway (Express), Frontend (Next.js)

---

## DAFTAR ISI

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Arsitektur & Alur Data Saat Ini](#2-arsitektur--alur-data-saat-ini)
3. [BAGIAN A: Bug Login & Register (KRITIS)](#3-bagian-a-bug-login--register-kritis)
4. [BAGIAN B: Gap Analysis Frontend](#4-bagian-b-gap-analysis-frontend)
5. [BAGIAN C: Isu Arsitektur & Keamanan](#5-bagian-c-isu-arsitektur--keamanan)
6. [BAGIAN D: Isu Database & Data Consistency](#6-bagian-d-isu-database--data-consistency)
7. [BAGIAN E: Kepatuhan Terhadap Context CBDC](#7-bagian-e-kepatuhan-terhadap-context-cbdc)
8. [Prioritas & Rekomendasi Eksekusi](#8-prioritas--rekomendasi-eksekusi)
9. [Checklist Verifikasi](#9-checklist-verifikasi)

---

## 1. Ringkasan Eksekutif

Sistem SmartBank CBDC adalah prototype akademik two-tier CBDC dengan tiga service backend (Central-Bank NestJS, Wallet Express, Gateway Express) dan frontend Next.js. Secara umum arsitektur sudah baik — two-tier model terimplementasi, double-entry ledger ada, RBAC multi-role tersedia. Namun, terdapat **bug kritis pada flow login/register** yang membuat data tidak tersinkron dengan benar antara in-memory store dan MySQL, ditambah **frontend yang baru ~40% selesai** (Admin dashboard belum ada).

---

## 2. Arsitektur & Alur Data Saat Ini

```
Browser (Next.js :3000)
    │
    ▼
Gateway (Express :4000)  ──► /api/wallet/*  ──►  Wallet (Express :3001)
    │                         /api/bank/*    ──►  Central-Bank (NestJS :8080)
    │
    ├── JWT Middleware (verify token, pass x-user-id, x-user-role)
    ├── Path Rewrite: /api/wallet → /api/, /api/bank → /api/v1/
    │
    ▼
Wallet Service (:3001)
    ├── In-Memory Store (primary) + MySQL (fallback)
    ├── Auth Service → login / register
    ├── CentralBank Service → proxy ke Central-Bank atau Mock
    │
    ▼
Central-Bank (:8080)
    ├── Prisma ORM → MySQL (central_bank_core)
    ├── Auth, Teller, Manager, Settlement modules
    ├── Double-entry ledger
```

### Alur Register:
1. Frontend → `POST /api/wallet/v1/auth/register` (via Gateway :4000)
2. Gateway → forward ke Wallet :3001 `/api/v1/auth/register`
3. Wallet `authController.register()` → `authService.register()`
4. Wallet cek duplikasi email di **local DB** (MySQL / in-memory)
5. Wallet panggil `centralBankService.createAccount()` → Central-Bank `POST /api/v1/auth/register`
6. Central-Bank buat User + WalletAccount di MySQL via Prisma
7. Wallet insert/re-update user di local DB dan wallet_accounts_cache

### Alur Login:
1. Frontend → `POST /api/wallet/v1/auth/login`
2. Wallet cari user di **local DB** (in-memory store)
3. Jika tidak ditemukan → **Fallback** ke Central-Bank login API
4. Jika ditemukan → verifikasi bcrypt password, ambil wallet_id dari cache

---

## 3. BAGIAN A: Bug Login & Register (KRITIS)

### 🔴 A.1 — In-Memory Store sebagai Primary Database

**File:** `Wallet/src/config/database.js` (baris 6-10, 60-244)

**Masalah:**
Wallet menggunakan **in-memory array** sebagai primary data store. MySQL hanya digunakan sebagai fallback. Ketika `USE_IN_MEMORY_DB` tidak diset ke `false`, atau koneksi MySQL gagal, sistem otomatis fallback ke in-memory. **Setiap Wallet restart, semua data hilang.**

**Dampak:**
- User yang sudah register tidak bisa login setelah Wallet restart
- Staff account (teller@test.com, manager@test.com) hanya di-seed via `seedStaffAccounts()` — tapi seed ini hanya berjalan saat server start
- Tidak ada persistensi nyata untuk operasi production-like

**Root Cause:**
Desain database.js menggunakan dual-mode (MySQL + in-memory) dengan in-memory sebagai primary. Pattern ini rawan data loss.

**Rekomendasi:**
```
1. Gunakan MySQL sebagai PRIMARY, in-memory hanya caching (bukan store utama)
2. Hapus `USE_IN_MEMORY_DB` — selalu gunakan MySQL
3. Jika MySQL gagal, throw error fatal, jangan silent fallback ke in-memory
4. Seed staff account langsung ke MySQL, bukan in-memory
```

---

### 🔴 A.2 — Fallback Login: Resiko Data Phantom

**File:** `Wallet/src/services/auth.service.js` (baris 99-165)

**Masalah:**
Ketika user tidak ditemukan di in-memory store, Wallet melakukan **fallback login** ke Central-Bank API. Jika sukses, data user langsung di-insert ke in-memory store. Tapi:

1. **Password disimpan ulang**: Baris 141: `const passwordHash = bcrypt.hashSync(password, 10)` — ini membuat hash baru dari password yang sudah ada. Tapi di baris 143, hash ini disimpan ke in-memory. Jika user yang sama login lagi setelah restart, data di in-memory akan punya hash berbeda dari MySQL.
2. **Data tidak sinkron dengan MySQL**: Insert ke in-memory (baris 142-149) tidak menjamin data ada di MySQL Wallet. Central-Bank sudah punya user di MySQL-nya, tapi Wallet DB (MySQL) mungkin tidak punya.
3. **Wallet ID generik**: Jika `wallet_id` tidak ada di response, fallback membuat ID palsu: `wal_res_${userId.substring(0, 10)}` — ini tidak match dengan wallet_id asli di Central-Bank.

**Dampak:**
- Transfer/balance query gagal karena wallet_id mismatch
- Password tidak konsisten antara session

**Rekomendasi:**
```
1. Fallback login seharusnya TIDAK insert ke in-memory — langsung return token saja
2. Atau, fallback login memicu sync penuh: tarik data user DARI Central-Bank, simpan ke MySQL Wallet
3. Wallet ID harus diambil dari Central-Bank API response, bukan dibuat generik
```

---

### 🔴 A.3 — Frontend Mengirim `role` Field ke Register

**File:** `frontend/src/app/register/page.tsx` (baris 14-21, 37-39)

**Masalah:**
Frontend mengirim `formData` dengan field `role: "RETAIL"` ke backend:
```typescript
const [formData, setFormData] = useState({
    name: "", email: "", phone: "", password: "", pin: "", role: "RETAIL"
});
// ...
body: JSON.stringify(formData)
```

**Wallet auth.service.js** menerima role ini (baris 12): `register: async (name, email, phone, password, pin, role = 'RETAIL_CUSTOMER')` — dan kemudian memetakan melalui `mapDbRole()`.

**Masalah:** Role `"RETAIL"` tidak ada dalam mapping `mapDbRole()`:
```javascript
if (['MERCHANT', 'SUPPLIER'].includes(upper)) return 'MERCHANT';
if (['ANALYTICS_VIEWER', 'MANAGER'].includes(upper)) return 'MANAGER';
if (['CASHIER', 'POS_OPERATOR', 'TELLER'].includes(upper)) return 'TELLER';
if (['CENTRAL_BANK_ADMIN', 'AUDITOR', 'SYSTEM_SERVICE'].includes(upper)) return upper;
return 'WALLET_USER';  // ← RETAIL fallback ke sini
```

Sejauh ini RETAIL → WALLET_USER (karena tidak match apapun), tapi mapping ini fragile.

**Rekomendasi:**
```
1. Hapus field role dari form register frontend — user retail hanya bisa daftar sebagai RETAIL_CUSTOMER
2. Atau tambahkan "RETAIL" → "WALLET_USER" secara eksplisit di mapDbRole
3. Backend harus strict: hanya izinkan role RETAIL_CUSTOMER dari endpoint register publik
```

---

### 🟡 A.4 — Frontend Login: Label & Placeholder Membingungkan

**File:** `frontend/src/app/login/page.tsx` (baris 14, 77, 84)

**Masalah:**
- Variable state bernama `phone` tapi sebenarnya menampung **email** (baris 14, 28)
- Label form: "Email / User ID" tapi placeholder: "manager@test.com" (email)
- Ikon yang digunakan: `<Phone>` — seharusnya `<Mail>`

**Dampak:** UX membingungkan, tapi tidak menyebabkan bug fungsional karena backend menerima field `email`.

**Rekomendasi:**
```
1. Rename state `phone` → `email`
2. Ganti ikon Phone → Mail
3. Placeholder tetap email (manager@test.com)
```

---

### 🟡 A.5 — Gateway JWT Middleware: Secret Tidak Sinkron

**File:** `Gateway/middleware/jwt.js` (baris 24)

**Masalah:**
```javascript
const secret = process.env.JWT_SECRET || 'fallback_secret_key';
```

Wallet menggunakan JWT_SECRET: `'supersecret-cbdc-smartbank-wallet-key-2026'` (dari config.js). Central-Bank menggunakan secret dari environment variable sendiri. Ketiga secret ini **harus identik** agar token yang dibuat Wallet bisa diverifikasi Gateway.

Jika Gateway memakai fallback `'fallback_secret_key'`, token dari Wallet akan selalu invalid → **semua request ke /api/bank/* akan 401**.

**Rekomendasi:**
```
1. Gunakan JWT_SECRET yang sama di Gateway, Wallet, dan Central-Bank
2. Masukkan ke .env di root project
3. Atau: Gateway forward token ke backend tanpa verifikasi (backend yang verifikasi)
```

---

### 🟡 A.6 — Response Envelope Mismatch: Frontend vs Wallet vs Central-Bank

**Masalah Inkonsistensi Response Format:**

| Layer | Format Response |
|-------|----------------|
| **Wallet** | `{ success: true, data: {...}, error: null, meta: {...} }` |
| **Central-Bank** | `{ data: {...} }` (NestJS global interceptor) |
| **Frontend fetchApi** | Expects `response.data.accessToken`, `response.data.user` |

**Login Response dari Wallet** (auth.service.js baris 203-214):
```javascript
return {
    user: { id, name, email, phone, kycTier, walletId, role },
    ...tokens   // accessToken, refreshToken, expiresIn
};
```
Ini akan dibungkus responseHelper menjadi:
```json
{
    "success": true,
    "data": {
        "user": { ... },
        "accessToken": "...",
        "refreshToken": "...",
        "expiresIn": 3600
    }
}
```

**Frontend login** (baris 31): `const token = loginRes.data.accessToken;` — ✅ ini benar karena `data.accessToken` ada.

Tapi **Central-Bank login response** punya format berbeda:
```json
{
    "access_token": "...",   // ← snake_case!
    "expires_in": 3600,
    "user_id": "...",
    "name": "...",
    "role": "...",
    "kyc_tier": "...",
    "wallet_id": "..."
}
```

Fallback login (auth.service.js baris 113-153) mencoba parsing `cbPayload.access_token` (snake_case) — ini benar.

**Rekomendasi:**
```
1. Seragamkan response format: semua pakai camelCase ATAU snake_case
2. Rekomendasi: semua pakai camelCase (accessToken, userId, walletId) untuk konsistensi frontend
3. Tambahkan response transform layer di Wallet/Central-Bank
```

---

## 4. BAGIAN B: Gap Analysis Frontend

### Status Halaman Saat Ini

| Halaman | Status | Catatan |
|---------|--------|---------|
| Landing Page (`/`) | ✅ Ada | `frontend/src/app/page.tsx` |
| Login (`/login`) | ✅ Ada | Dengan dummy accounts |
| Register (`/register`) | ✅ Ada | Hanya untuk nasabah |
| Dashboard Retail | ✅ Ada | Balance, Transfer, Loan, Mock activity |
| Dashboard Teller | ✅ Ada | Search customer, KYC verify, Top-up, Withdraw |
| Dashboard Manager | ✅ Ada | Suspend/Activate user, Approve/Reject loan (basic) |
| **Dashboard Admin CB** | ❌ **BELUM ADA** | **Prioritas utama!** |
| **User Guide (`/guide`)** | ✅ Ada | OnboardingTour component |

### Detail Frontend yang Perlu Dibuat/Diperbaiki:

#### 🔴 B.1 — Central Bank Admin Dashboard (BELUM ADA)

File yang perlu dibuat: `frontend/src/components/dashboards/AdminDashboard.tsx`

**Fitur yang HARUS ada (sesuai context CBDC 01_deskripsi, roles_permissions.txt):**
1. **Dashboard Moneter** — total supply, reserve, circulating supply, fee/tax collected
2. **Issuance & Distribution** — admin membuat distribution batch dari RESERVE
3. **Ledger Audit** — read-only query ledger dengan filter
4. **Reversal Transaction** — batalkan transaksi dengan reason code
5. **Fee/Tax Configuration** — atur persentase biaya global
6. **Freeze/Unfreeze Wallet** — dengan reason code
7. **Money Supply Control** — Issuance/Burn CBDC
8. **Audit Log Viewer** — semua aksi admin

**Endpoint yang sudah ada di backend untuk Admin CB:**
- Central-Bank Admin endpoints behind `@Roles(CENTRAL_BANK_ADMIN)` guard
- Perlu mapping route Gateway: `/api/bank/admin/*`

#### 🟡 B.2 — Retail Dashboard: Fitur yang Tidak sesuai

**File:** `frontend/src/components/dashboards/RetailDashboard.tsx`

| Masalah | Detail |
|---------|--------|
| Chart statis | `mockChartData` hardcoded, tidak fetch real transaction history |
| Activity feed statis | Baris 186-216 hardcoded "Top-up from Teller", "Transfer to 0822222222" |
| Transfer form | Placeholder "Payee Wallet ID" — harusnya mencari berdasarkan phone/email, bukan wallet ID mentah |
| PIN hardcoded | `pin: '123456'` di transfer form (baris 50) — harusnya prompt PIN |
| Loan apply | `prompt()` untuk input amount — tidak proper UI |

**Rekomendasi:**
```
1. Fetch transaction history dari API /api/wallet/v1/wallets/me/transactions
2. Ganti mock activity dengan data real
3. Transfer form: cari recipient by phone/email dulu, baru transfer
4. PIN input: modal/dialog khusus PIN sebelum transaksi
5. Loan apply: dialog/modal dengan slider amount
```

#### 🟡 B.3 — Manager Dashboard: Fitur Minimal

**File:** `frontend/src/components/dashboards/ManagerDashboard.tsx`

Fitur yang ada: Suspend/Activate user by ID, Approve/Reject loan by ID.

**Fitur yang kurang:**
- List pending loans (tidak perlu input manual loan ID)
- Search user (seperti Teller dashboard)
- Daily transaction limit adjustment per user
- View user detail sebelum suspend/activate

#### 🟡 B.4 — Sidebar Dashboard: Role-based Menu

**File:** `frontend/src/app/dashboard/layout.tsx`

**Masalah:**
- Sidebar menu items statis per role — tidak ada navigasi fungsional
- Menu items cuma dekoratif (tidak link ke sub-page)
- Tidak ada menu untuk ADMIN role

**Yang perlu ditambah:**
```typescript
case "ADMIN":
case "CENTRAL_BANK_ADMIN":
    return [
        { name: "Monetary Dashboard", icon: <LayoutDashboard />, href: "/dashboard/admin" },
        { name: "Ledger Audit", icon: <FileText />, href: "/dashboard/admin/ledger" },
        { name: "User Management", icon: <Users />, href: "/dashboard/admin/users" },
    ];
```

---

## 5. BAGIAN C: Isu Arsitektur & Keamanan

### 🔴 C.1 — Gateway Path Rewrite Salah Konfigurasi

**File:** `Gateway/server.js` (baris 24-39)

```javascript
// Proxy ke Central Bank
app.use('/api/bank', jwtMiddleware, createProxyMiddleware({
    target: CENTRAL_BANK_URL,        // http://localhost:8080
    changeOrigin: true,
    pathRewrite: { '^/': '/api/v1/' },  // ← REWRITE INI MASALAH
}));

// Proxy ke Wallet
app.use('/api/wallet', createProxyMiddleware({
    target: WALLET_URL,              // http://localhost:3001
    changeOrigin: true,
    pathRewrite: { '^/': '/api/' },     // ← REWRITE INI MASALAH
}));
```

**Analisis Path Rewrite:**

Frontend memanggil: `GET /api/bank/teller/customer?query=...`
- Request masuk Gateway: `/api/bank/teller/customer`
- Setelah strip prefix `/api/bank`: `teller/customer`
- Path rewrite `'^/': '/api/v1/'` artinya: **prefix SELURUH remaining path dengan `/api/v1/`**
- Hasil: `http://localhost:8080/api/v1/teller/customer` ✅ **Benar** (karena NestJS prefix global `/api/v1`)

Frontend memanggil: `POST /api/wallet/v1/auth/login`
- Request masuk Gateway: `/api/wallet/v1/auth/login`
- Setelah strip prefix `/api/wallet`: `v1/auth/login`
- Path rewrite `'^/': '/api/'`: **prefix dengan `/api/`**
- Hasil: `http://localhost:3001/api/v1/auth/login` 
- Wallet routes: `app.post('/api/v1/auth/login', ...)` ✅ **Benar**

Tapi: Frontend RetailDashboard memanggil `GET /api/wallet/v1/wallets/me/balance`
- Request masuk Gateway: `/api/wallet/v1/wallets/me/balance`
- Setelah strip: `v1/wallets/me/balance`
- Rewrite: `/api/v1/wallets/me/balance`
- Wallet routes: `app.get('/api/v1/wallets/me/balance', ...)` ✅

**MASALAH untuk endpoint TELLER di Central-Bank:**
Frontend TellerDashboard memanggil `GET /api/bank/teller/customer?query=...`
- Ini ke Gateway → Central-Bank → NestJS `TellerController`
- Tapi **Central-Bank Teller controller** ada di path apa?

Perlu dicek: `Central-Bank/src/modules/teller/teller.controller.ts`

**Simpulan:** Path rewrite MUNGKIN bekerja, tapi sangat fragile. Harus diverifikasi endpoint-by-endpoint.

**Rekomendasi:**
```
1. Ganti ke proxy yang lebih explicit:
   /api/wallet/* → Wallet (tanpa rewrite path, Wallet handle full path)
   /api/bank/*   → Central-Bank (tanpa rewrite path, NestJS handle /api/bank prefix)
2. Atau buat tabel mapping endpoint yang lengkap
```

---

### 🟡 C.2 — Tidak Ada Validasi Idempotency di Frontend

**File:** `frontend/src/lib/api.ts` (baris 37-41)

Frontend SUDAH mengirim `Idempotency-Key` header, tapi hanya untuk POST/PUT/PATCH:
```typescript
if (options.method && ['POST', 'PUT', 'PATCH'].includes(options.method.toUpperCase())) {
    if (!headers.has('Idempotency-Key')) {
        headers.set('Idempotency-Key', crypto.randomUUID());
    }
}
```

✅ Ini sudah benar. Tapi **Gateway tidak mem-forward header kustom**. `http-proxy-middleware` default-nya mem-forward semua header, jadi harusnya aman.

---

### 🟡 C.3 — CORS & Security Headers

Gateway sudah pakai `cors()` middleware (baris 15). Tapi tidak ada:
- Rate limiting
- Helmet (security headers)
- Request size limiting

Untuk prototype akademik ini bisa diterima, tapi perlu dicatat.

---

### 🟡 C.4 — Tidak Ada Unit Test untuk Wallet

Central-Bank punya unit test (Jest). Wallet & Gateway **tidak punya unit test**. E2E test (`e2e-test.js`) ada, tapi unit test untuk auth service tidak ada.

---

## 6. BAGIAN D: Isu Database & Data Consistency

### 🔴 D.1 — Dual Database: In-Memory vs MySQL

Wallet menggunakan in-memory store sebagai primary. Ini adalah **akar masalah terbesar**.

**File:** `Wallet/src/config/database.js`

| Mode | Kapan Aktif | Data Survive Restart? |
|------|-------------|----------------------|
| MySQL | `USE_IN_MEMORY_DB !== 'true'` dan koneksi sukses | ✅ Ya |
| In-Memory | `USE_IN_MEMORY_DB === 'true'` ATAU MySQL gagal | ❌ Tidak |

**Rekomendasi:**
```
1. Hapus mode in-memory sebagai primary. Gunakan MySQL.
2. In-memory HANYA untuk caching read-model (opsional)
3. Tambahkan health check MySQL saat startup — jika gagal, throw fatal error
4. Buat migration script untuk ensure tabel users, wallet_accounts_cache ada
```

---

### 🔴 D.2 — Central-Bank & Wallet: Duplikasi Data User

**Masalah Arsitektur:** User disimpan di DUA tempat:

| Lokasi | Tabel | Data |
|--------|-------|------|
| Central-Bank MySQL | `users` | id, name, email, passwordHash, role, kycTier, status, phone, pinHash |
| Wallet (MySQL/in-memory) | `users` | id, name, email, phone, password_hash, pin_hash, kyc_tier, status, role |

Ini melanggar prinsip **Single Source of Truth**. Central-Bank context secara eksplisit menyatakan: *"CentralBank Core adalah single source of truth untuk saldo dan ledger."*

Tapi untuk autentikasi, siapa yang jadi sumber kebenaran? Wallet atau Central-Bank?

**Pattern yang benar (two-tier):**
- **Central-Bank** = source of truth untuk USER dan WALLET
- **Wallet** = membaca dari Central-Bank via API, tidak menyimpan user secara independen

**Rekomendasi:**
```
1. Wallet seharusnya TIDAK menyimpan user. Wallet hanya forward auth ke Central-Bank.
2. Atau: Wallet menyimpan data user TAPI harus sync dari Central-Bank (event-driven)
3. Jangan ada dua source password — pakai salah satu
```

---

### 🟡 D.3 — Prisma Schema: wallet_accounts_cache Tidak Ada

File `Wallet/src/config/database.js` mereferensikan tabel `wallet_accounts_cache` (untuk in-memory), tapi di Prisma schema Central-Bank **tidak ada model `WalletAccountsCache`**.

Jika MySQL Wallet ingin menggunakan tabel ini, harus dibuat manual. Tapi karena Wallet tidak punya Prisma, tabel ini tidak pernah dibuat di MySQL.

**Dampak:** Query `SELECT wallet_id FROM wallet_accounts_cache WHERE user_id = $1` selalu return kosong di MySQL → login selalu fallback ke Central-Bank.

---

## 7. BAGIAN E: Kepatuhan Terhadap Context CBDC

Berdasarkan file context di folder `context/`:

| Aturan Context | Status | Catatan |
|---------------|--------|---------|
| Two-tier model | ✅ | Central-Bank (Tier 1) + Wallet (Tier 2) |
| Single source of truth | ⚠️ | Ada duplikasi user di Wallet + CB |
| Double-entry ledger | ✅ | LedgerEntry model dengan DEBIT/CREDIT |
| Idempotency key | ✅ | Ada di semua layer |
| Programmable payments (bukan money) | ✅ | Tidak ada field token_condition |
| Integer amount | ⚠️ | CB pakai BigInt, Wallet mock pakai Number |
| Money supply invariant | ⚠️ | Belum ada pengecekan invariant di dashboard |
| Reserve ≥ 98% | ⚠️ | Mock CB menginisialisasi 980M, tidak ada enforcement |
| Tidak klaim institusi nyata | ✅ | Semua dummy, academic prototype |
| Fee rules (bank 1%, gateway 0.5%, tax 2%) | ⚠️ | Mock CB hardcode, belum pakai FeeRule table |
| Cooldown & daily limit | ✅ | Diimplementasi di mock CB |
| Audit log admin actions | ⚠️ | Model AuditLog ada, tapi tidak dipakai di semua action |

---

## 8. Prioritas & Rekomendasi Eksekusi

### 🚨 PRIORITAS 1 — KRITIS (Harus Diperbaiki Dulu)

| # | Item | File |
|---|------|------|
| 1 | **Fix in-memory sebagai primary DB** — selalu gunakan MySQL | `Wallet/src/config/database.js` |
| 2 | **Fix fallback login** — jangan insert ke in-memory dengan data inkonsisten | `Wallet/src/services/auth.service.js` |
| 3 | **Sync JWT_SECRET** di Gateway, Wallet, CB | `.env` files |
| 4 | **Buat tabel wallet_accounts_cache** di MySQL Wallet | Migration / manual SQL |
| 5 | **Fix Gateway path rewrite** — verifikasi semua endpoint | `Gateway/server.js` |

### 🟡 PRIORITAS 2 — PENTING (Frontend & UX)

| # | Item | File |
|---|------|------|
| 6 | **Buat Admin Dashboard (Central Bank)** | `frontend/src/components/dashboards/AdminDashboard.tsx` |
| 7 | **Perbaiki Retail Dashboard** — fetch real data, bukan mock | `RetailDashboard.tsx` |
| 8 | **Perbaiki Login UI** — rename phone→email, ganti ikon | `login/page.tsx` |
| 9 | **Hapus role dari register form** | `register/page.tsx` |
| 10 | **Tambahkan menu ADMIN di dashboard layout** | `dashboard/layout.tsx` |
| 11 | **Perbaiki Manager Dashboard** — list pending loans | `ManagerDashboard.tsx` |

### 🟢 PRIORITAS 3 — NICE TO HAVE

| # | Item |
|---|------|
| 12 | Tambahkan rate limiting di Gateway |
| 13 | Unit test untuk Wallet auth service |
| 14 | Seragamkan response format (camelCase) |
| 15 | Buat seed script untuk system accounts (RESERVE, FEE, TAX, LOAN_POOL) |
| 16 | Implementasi FeeRule table untuk mengganti hardcode |

---

## 9. Checklist Verifikasi

Setelah perbaikan, verifikasi dengan checklist ini:

### Login/Register:
- [ ] Register user baru via frontend → bisa login setelahnya
- [ ] Register user baru → restart Wallet → masih bisa login
- [ ] Staff account (teller@test.com, manager@test.com) bisa login
- [ ] Staff account bisa login setelah Wallet restart
- [ ] Cek data user di MySQL Wallet (bukan in-memory) setelah register
- [ ] Cek data user di MySQL Central-Bank setelah register

### Frontend:
- [ ] Retail Dashboard menampilkan balance real (bukan mock)
- [ ] Retail Dashboard menampilkan transaksi real
- [ ] Transfer berhasil dengan input PIN (bukan hardcode)
- [ ] Teller bisa mencari nasabah by email/phone
- [ ] Teller bisa verifikasi KYC
- [ ] Teller bisa top-up dan withdraw
- [ ] Manager bisa suspend/activate user
- [ ] Manager bisa approve/reject loan
- [ ] **Admin CB Dashboard berfungsi penuh** ← TARGET UTAMA

### End-to-End:
- [ ] Semua endpoint melalui Gateway tidak 404/504
- [ ] JWT token dari Wallet diterima Central-Bank (via Gateway)
- [ ] Response format konsisten di semua layer

---

> **Kesimpulan:** Sistem memiliki fondasi arsitektur yang solid untuk prototype akademik. Masalah utama adalah data persistence (in-memory store), inkonsistensi response format, dan frontend yang belum lengkap. Setelah perbaikan prioritas 1, sistem dapat berfungsi dengan baik untuk demo.

---

*Dokumen ini adalah hasil brainstorming dan audit. Belum ada kode yang diubah. Eksekusi akan dilakukan pada sesi berikutnya setelah konfirmasi.*