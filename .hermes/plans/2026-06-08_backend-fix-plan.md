# Backend Fix Plan — SmartBank CBDC
> Tanggal: 8 Juni 2026 | Fokus: Backend Only | Approach: Shared DB (MySQL Central-Bank)

---

## Context Singkat
- MySQL sudah jalan, semua service bisa jalan
- Approach A: Wallet connect langsung ke MySQL Central-Bank (shared DB)
- Fokus ke backend saja, frontend nanti

---

## PHASE 1 — Arsitektur & Persistence (KRITIS)

### Task 1: Buat Root .env dengan JWT_SECRET统一

**File:** `C:\CODING\RPL 2\integration\.env`

**Isi:**
```env
# JWT Secret (harus sama di Gateway, Wallet, Central-Bank)
JWT_SECRET=supersecret-cbdc-smartbank-wallet-key-2026

# Central-Bank
DATABASE_URL=mysql://central_bank:central_bank_password@localhost:3306/central_bank_core
CENTRAL_BANK_CORE_PORT=8080

# Wallet
WALLET_PORT=3001

# Gateway
GATEWAY_PORT=4000
```

**Verification:**
```bash
# Test Central-Bank bisa connect MySQL
cd C:/CODING/RPL\ 2/integration/Central-Bank && npx prisma studio
```

---

### Task 2: Update Gateway JWT Middleware dengan Secret Benar

**File:** `Gateway/middleware/jwt.js`

**Change (baris 24):**
```javascript
// SEBELUM:
const secret = process.env.JWT_SECRET || 'fallback_secret_key';

// SESUDAH:
const secret = process.env.JWT_SECRET || 'supersecret-cbdc-smartbank-wallet-key-2026';
```

**Verification:**
```bash
# Restart Gateway, test token verification
curl -H "Authorization: Bearer <token>" http://localhost:4000/api/bank/health
```

---

### Task 3: Refactor Wallet DB — MySQL sebagai Primary, In-Memory HANYA untuk Staff Seed

**File:** `Wallet/src/config/database.js`

**Change Strategy:**
1. Hapus `USE_IN_MEMORY_DB` logic
2. Selalu gunakan MySQL pool untuk WALLET database
3. In-memory store tetap ada HANYA untuk seed staff accounts saat startup
4. Staff accounts (teller@test.com, manager@test.com) di-seed KE MYSQL juga

**Code Change:**
```javascript
// BARIS 58-59: Hapus seedStaffAccounts() yang insert ke inMemoryStore
// GANTI dengan fungsi seedStaffAccountsToMySQL()

import mysql from 'mysql2/promise';

async function seedStaffAccountsToMySQL() {
  const pool = await mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
  });

  const staffPassword = bcrypt.hashSync('password', 10);
  const staffAccounts = [
    { id: 'staff-teller-001', name: 'Teller SmartBank', email: 'teller@test.com', phone: '081100000001', role: 'TELLER' },
    { id: 'staff-manager-001', name: 'Manager SmartBank', email: 'manager@test.com', phone: '081100000002', role: 'MANAGER' }
  ];

  for (const acc of staffAccounts) {
    await pool.execute(
      `INSERT IGNORE INTO users (id, name, email, phone, password_hash, pin_hash, kyc_tier, status, role)
       VALUES (?, ?, ?, ?, ?, ?, 'VERIFIED', 'ACTIVE', ?)`,
      [acc.id, acc.name, acc.email, acc.phone, staffPassword, bcrypt.hashSync('123456', 10), acc.role]
    );
    console.log(`✅ Staff seeded: ${acc.email}`);
  }
}
```

**Change pool initialization (baris 61-82):**
```javascript
// HAPUS: if (!config.db.useInMemory) { ... } else { activeDatabaseType = 'In-Memory Mock'; }

// GANTI dengan:
let pool = null;
let activeDatabaseType = 'MySQL';

try {
  pool = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
  // Test connection
  await pool.query('SELECT 1');
  console.log('✅ Wallet connected to MySQL successfully');
} catch (err) {
  console.error('❌ FATAL: Cannot connect to MySQL. Exiting.', err.message);
  process.exit(1);
}

// Seed staff accounts after DB connection
seedStaffAccountsToMySQL().catch(console.error);
```

**Verification:**
```bash
# Cek user teller di MySQL
mysql -u central_bank -pcentral_bank_password central_bank_core -e "SELECT email, role FROM users WHERE email LIKE '%@test.com';"
# Should show: teller@test.com | TELLER, manager@test.com | MANAGER
```

---

### Task 4: Fix Fallback Login — Jangan Insert ke In-Memory

**File:** `Wallet/src/services/auth.service.js` (baris 99-165)

**Change:**
1. Jika user tidak ditemukan di local DB → try Central-Bank fallback
2. Jika fallback BERHASIL → return token + user data LANGSUNG (tanpa insert ulang)
3. Jangan re-hash password, jangan insert ke local DB

**Code Change (baris 99-165):**
```javascript
if (result.rowCount === 0) {
  // FALLBACK: coba login via Central Bank
  if (!config.centralBank.mock) {
    try {
      console.log(`🔄 [AUTH] Fallback ke Central Bank untuk: ${cleanEmail}`);
      const cbResponse = await fetch(`${config.centralBank.url}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password })
      });

      if (!cbResponse.ok) {
        throw new CustomError('UNAUTHORIZED', 'Email atau password yang Anda masukkan salah', 401);
      }

      const cbData = await cbResponse.json();
      // Central Bank response: { access_token, user_id, name, role, kyc_tier, wallet_id }
      const cbPayload = cbData.data || cbData;
      const cbToken = cbPayload.access_token || cbPayload.accessToken;

      // Extract user info
      let userId = cbPayload.user_id || cbPayload.userId;
      let userRole = cbPayload.role || 'WALLET_USER';
      let kycTier = cbPayload.kyc_tier || 'BASIC';
      let userName = cbPayload.name;
      let walletId = cbPayload.wallet_id || cbPayload.walletId;

      // Decode JWT if needed
      if (!userId && cbToken) {
        try {
          const payload = JSON.parse(Buffer.from(cbToken.split('.')[1], 'base64').toString('utf8'));
          userId = payload.sub || payload.userId;
          userRole = payload.role || userRole;
          userName = userName || payload.name;
          walletId = walletId || payload.walletId;
        } catch (e) { /* ignore */ }
      }

      if (!userId) userId = `usr_cb_${cleanEmail.replace(/[@.]/g, '_')}`;
      if (!userName) userName = cleanEmail.split('@')[0];
      if (!walletId) walletId = `wal_${userId.substring(0, 10)}`;
      if (userRole === 'WALLET_USER') userRole = 'RETAIL_CUSTOMER';

      console.log(`✅ [AUTH] Fallback berhasil: ${cleanEmail} (role: ${userRole})`);

      const tokens = tokenService.generateTokens({ userId, name: userName, email: cleanEmail, phone: null, walletId, role: userRole });

      return {
        user: { id: userId, name: userName, email: cleanEmail, phone: null, kycTier, walletId, role: userRole },
        ...tokens
      };
    } catch (fallbackErr) {
      if (fallbackErr instanceof CustomError) throw fallbackErr;
      throw new CustomError('UNAUTHORIZED', 'Email atau password yang Anda masukkan salah', 401);
    }
  }
  throw new CustomError('UNAUTHORIZED', 'Email atau password yang Anda masukkan salah', 401);
}
```

**Key Changes:**
- Hapus: `db.query('INSERT INTO users ...)` dari fallback login
- Hapus: `db.query('INSERT INTO wallet_accounts_cache ...)` dari fallback login
- Langsung return token + user info

**Verification:**
```bash
# Restart Wallet, login dengan user yang ada di Central-Bank tapi tidak di Wallet MySQL
# Harus bisa login tanpa error
```

---

### Task 5: Fix Register — Simpan Semua Data ke MySQL dengan Benar

**File:** `Wallet/src/services/auth.service.js` (baris 12-89)

**Change:**
1. Hapus logic `UPDATE users SET` untuk user yang sudah ada
2. Selalu INSERT baru (unique email constraint akan prevent duplikat)
3. Role dari register FORM DIHIRANKAN — hanya boleh RETAIL_CUSTOMER

**Code Change:**
```javascript
// DI service register(), override role jadi RETAIL_CUSTOMER
const allowedRole = 'RETAIL_CUSTOMER';  // Register selalu RETAIL

// Hapus: mapDbRole dari parameter role — tidak dipakai
// Hapus: semua logic "userExists" check dan UPDATE
// GANTI dengan:

// Langsung INSERT ke Central-Bank (via centralBankService)
let walletInfo;
try {
  walletInfo = await centralBankService.createAccount(name, cleanEmail, password);
} catch (err) {
  console.error('❌ Gagal membuat wallet di CentralBank Core:', err.message);
  throw new CustomError('INTERNAL_SERVER_ERROR', `Registrasi ditolak: ${err.message}`, 500);
}

const { user_id: cbUserId, wallet_id: walletId, initial_balance: cbInitialBalance } = walletInfo;
const initialBalance = cbInitialBalance ? parseInt(cbInitialBalance, 10) : 50000;

const pinHash = bcrypt.hashSync(pin.toString(), 10);
const passwordHash = bcrypt.hashSync(password, 10);

// INSERT ke Wallet MySQL
await db.query(
  `INSERT INTO users (id, name, email, phone, password_hash, pin_hash, kyc_tier, status, role)
   VALUES (?, ?, ?, ?, ?, ?, 'BASIC', 'ACTIVE', 'WALLET_USER')
   ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone), password_hash=VALUES(password_hash), pin_hash=VALUES(pin_hash)`,
  [cbUserId, name, cleanEmail, cleanPhone, passwordHash, pinHash]
);

// Update wallet cache
await db.query(
  `INSERT INTO wallet_accounts_cache (wallet_id, user_id, available_balance, currency)
   VALUES (?, ?, ?, 'CBDC_IDR')
   ON DUPLICATE KEY UPDATE available_balance=VALUES(available_balance)`,
  [walletId, cbUserId, initialBalance]
);

return { userId: cbUserId, name, email: cleanEmail, walletId, initialBalance, role: 'RETAIL_CUSTOMER' };
```

**Verification:**
```bash
# Register user baru via frontend
# Cek MySQL: SELECT * FROM users WHERE email='test@example.com';
# Harus ada record dengan role=WALLET_USER
```

---

### Task 6: Buat Tabel wallet_accounts_cache di MySQL

**File:** Buat migration SQL baru

```sql
-- Di database central_bank_core
CREATE TABLE IF NOT EXISTS wallet_accounts_cache (
    wallet_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    available_balance BIGINT DEFAULT 0,
    currency VARCHAR(16) DEFAULT 'CBDC_IDR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Verification:**
```bash
mysql -u central_bank -pcentral_bank_password central_bank_core -e "DESCRIBE wallet_accounts_cache;"
```

---

## PHASE 2 — Konsistensi Response Format

### Task 7: Seragamkan Response Central-Bank — camelCase

**File:** `Central-Bank/src/common/api-response.interceptor.ts`

**Check:** NestJS interceptor yang membungkus semua response. Cari tahu formatnya.

**Change (jika perlu):**
- Pastikan semua response menggunakan `data` key (sudah benar dari interceptor)
- Pastikan snake_case dari DB dikonversi ke camelCase di service layer

**Note:** Ini mungkin sudah benar. Verifikasi dulu dengan:
```bash
curl -X POST http://localhost:8080/api/v1/auth/login   -H "Content-Type: application/json"   -d '{"email":"teller@test.com","password":"password"}' | jq .
```

---

## PHASE 3 — Gateway Path Rewrite Fix

### Task 8: Verifikasi & Fix Gateway Route Mapping

**File:** `Gateway/server.js`

**Testing sebelum fix:**
```bash
# Test semua endpoint dari browser/curl
# Cek apakah /api/bank/* sampai ke Central-Bank dengan path benar
# Cek apakah /api/wallet/* sampai ke Wallet dengan path benar
```

**Potential Fix (jika perlu):**
```javascript
// GANTI pathRewrite dengan:
// '/api/bank' → '/api/v1' (CB sudah punya prefix /api/v1)
// '/api/wallet' → '/api' (Wallet sudah punya prefix /api)

// Current (mungkin sudah benar):
app.use('/api/bank', jwtMiddleware, createProxyMiddleware({
  target: CENTRAL_BANK_URL,       // http://localhost:8080
  changeOrigin: true,
  pathRewrite: { '^/': '/api/v1/' },
}));

app.use('/api/wallet', createProxyMiddleware({
  target: WALLET_URL,            // http://localhost:3001
  changeOrigin: true,
  pathRewrite: { '^/': '/api/' },
}));
```

---

## PHASE 4 — Security & RBAC Fixes

### Task 9: Wallet RBAC — Staff Roles Tidak bisa Akses WALLET_USER Routes

**File:** `Wallet/src/middleware/rbac.middleware.js`

**Change:**
- Staff accounts (TELLER, MANAGER) saat login harus dapat token dengan role BENAR
- Mereka tidak boleh bisa akses `/api/v1/wallets/me/*` (khusus WALLET_USER)
- Mereka harus pakai route `/api/bank/*` untuk operasi teller/manager

**Current:** `app.use('/api/v1/wallets/me', authMiddleware, requireRole('WALLET_USER'));` ✅ Ini sudah benar.

**Issue:** Staff accounts yang login via fallback mungkin tidak punya route yang tepat.

---

## PHASE 5 — Central-Bank Login Fix untuk Staff

### Task 10: Seed Staff Accounts ke Central-Bank MySQL

**File:** `Central-Bank/prisma/seed.js` (buat jika belum ada)

Staff accounts harus ADA di Central-Bank karena:
1. Teller/Manager perlu login via Central-Bank (untuk operasi admin)
2. Gateway JWT middleware memverifikasi token via JWT_SECRET
3. Token dari Wallet yang login sebagai TELLER harus bisa diakses di Central-Bank

```javascript
// Central-Bank prisma seed
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password', 10);
  const pin = await bcrypt.hash('123456', 10);

  // Teller
  await prisma.user.upsert({
    where: { email: 'teller@test.com' },
    update: {},
    create: {
      id: 'staff-teller-001',
      name: 'Teller SmartBank',
      email: 'teller@test.com',
      phone: '081100000001',
      passwordHash: password,
      pinHash: pin,
      role: UserRole.TELLER,
      kycTier: 'VERIFIED',
      status: 'ACTIVE',
    },
  });

  // Manager
  await prisma.user.upsert({
    where: { email: 'manager@test.com' },
    update: {},
    create: {
      id: 'staff-manager-001',
      name: 'Manager SmartBank',
      email: 'manager@test.com',
      phone: '081100000002',
      passwordHash: password,
      pinHash: pin,
      role: UserRole.MANAGER,
      kycTier: 'VERIFIED',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Staff accounts seeded');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Run:**
```bash
cd C:/CODING/RPL\ 2/integration/Central-Bank
node prisma/seed.js
# atau
npx prisma db seed
```

---

## Order Eksekusi (Harus Berurutan)

```
PHASE 1
  Task 6  → Buat tabel wallet_accounts_cache     (Foundation)
  Task 10 → Seed staff ke Central-Bank MySQL      (Staff accounts)
  Task 3  → Refactor Wallet DB (MySQL primary)   (Persistence fix)
  Task 5  → Fix Register (proper MySQL insert)    (Register fix)
  Task 4  → Fix Fallback Login (no phantom data)  (Login fix)
  Task 1  → Buat .env root (JWT_SECRET)           (Config)
  Task 2  → Fix Gateway JWT secret               (Token verification)

PHASE 2
  Task 7  → Verifikasi response format           (Optional - check first)

PHASE 3
  Task 8  → Verifikasi Gateway path rewrite      (Test all endpoints)

PHASE 4
  Task 9  → RBAC verification                    (Verify staff can't access user routes)
```

---

## Verification Checklist

Setelah SEMUA task selesai, test:

- [ ] `npm run start:dev` Central-Bank jalan
- [ ] `node src/server.js` Wallet jalan (bukan in-memory mode)
- [ ] `node server.js` Gateway jalan
- [ ] Login teller@test.com → token returned, role TELLER
- [ ] Login manager@test.com → token returned, role MANAGER
- [ ] Register new user → survives restart
- [ ] Login new user → survives restart
- [ ] Teller token bisa akses `/api/bank/teller/customer`
- [ ] Teller token CANNOT akses `/api/wallet/v1/wallets/me/balance`
- [ ] User token CANNOT akses `/api/bank/teller/*`

---

## Commit Strategy

Setiap task selesai → commit:
```bash
git add -A
git commit -m "fix: [task description]"
```

Setelah semua phase → push:
```bash
git push origin main
```
