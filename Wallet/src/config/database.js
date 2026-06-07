import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { config } from './config.js';

// Local In-Memory Database Store for Fallback
const inMemoryStore = {
  users: [],
  idempotency_keys: [],
  wallet_accounts: [] // cached read-models
};

// Seed dummy staff accounts (Teller & Manager) for in-memory mode
// These accounts exist in Central Bank DB but not in Wallet DB
function seedStaffAccounts() {
  const staffPassword = bcrypt.hashSync('password', 10);
  const staffAccounts = [
    {
      id: 'staff-teller-001',
      name: 'Teller SmartBank',
      email: 'teller@test.com',
      phone: '081100000001',
      password_hash: staffPassword,
      pin_hash: bcrypt.hashSync('123456', 10),
      kyc_tier: 'VERIFIED',
      status: 'ACTIVE',
      role: 'TELLER',
      created_at: new Date()
    },
    {
      id: 'staff-manager-001',
      name: 'Manager SmartBank',
      email: 'manager@test.com',
      phone: '081100000002',
      password_hash: staffPassword,
      pin_hash: bcrypt.hashSync('123456', 10),
      kyc_tier: 'VERIFIED',
      status: 'ACTIVE',
      role: 'MANAGER',
      created_at: new Date()
    }
  ];

  for (const account of staffAccounts) {
    // Only insert if not already present
    if (!inMemoryStore.users.find(u => u.email === account.email)) {
      inMemoryStore.users.push(account);
      inMemoryStore.wallet_accounts.push({
        wallet_id: `wal_${account.id}`,
        user_id: account.id,
        available_balance: 0,
        currency: 'CBDC_IDR',
        created_at: new Date()
      });
    }
  }
}

// Run seed immediately
seedStaffAccounts();

let pool = null;
let activeDatabaseType = 'MySQL';

if (!config.db.useInMemory) {
  try {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.name,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  } catch (err) {
    console.warn('⚠️ Gagal membuat database pool MySQL, beralih ke Mode In-Memory: ', err.message);
    activeDatabaseType = 'In-Memory Mock';
  }
} else {
  activeDatabaseType = 'In-Memory Mock';
}

// Function to handle database queries
export const db = {
  getDatabaseType: () => activeDatabaseType,
  
  query: async (text, params = []) => {
    // If MySQL pool exists and is active, try running query
    if (activeDatabaseType === 'MySQL' && pool) {
      try {
        // Translate PostgreSQL parameterized queries ($1, $2) to MySQL (?)
        const mysqlText = text.replace(/\$\d+/g, '?');
        const [rows] = await pool.query(mysqlText, params);
        
        // Wrap result to mimic pg response structure (rows, rowCount)
        return { 
          rows: Array.isArray(rows) ? rows : [], 
          rowCount: Array.isArray(rows) ? rows.length : (rows.affectedRows || 0) 
        };
      } catch (err) {
        console.warn('⚠️ MySQL query error. Beralih otomatis ke In-Memory database untuk sesi ini.', err.message);
        activeDatabaseType = 'In-Memory Mock';
      }
    }

    // High fidelity In-Memory Fallback Engine
    const sql = text.trim().replace(/\s+/g, ' ');
    
    // --- 1. USERS HANDLERS ---
    if (sql.includes('SELECT * FROM users WHERE email = $1') || sql.includes('SELECT * FROM users WHERE email = ?')) {
      const email = params[0]?.toLowerCase();
      const rows = inMemoryStore.users.filter(u => u.email.toLowerCase() === email);
      return { rows, rowCount: rows.length };
    }

    if (sql.includes('SELECT * FROM users WHERE phone = $1') || sql.includes('SELECT * FROM users WHERE phone = ?')) {
      const phone = params[0];
      const rows = inMemoryStore.users.filter(u => u.phone === phone);
      return { rows, rowCount: rows.length };
    }

    if (sql.includes('SELECT * FROM users WHERE id = $1') || sql.includes('SELECT * FROM users WHERE id = ?')) {
      const id = params[0];
      const rows = inMemoryStore.users.filter(u => u.id === id);
      return { rows, rowCount: rows.length };
    }

    if (sql.includes('INSERT INTO users')) {
      // Params: id, name, email, phone, password_hash, pin_hash, kyc_tier, status, role
      const [id, name, email, phone, password_hash, pin_hash, kyc_tier, status, role] = params;
      const newUser = {
        id,
        name,
        email,
        phone,
        password_hash,
        pin_hash,
        kyc_tier: kyc_tier || 'BASIC',
        status: status || 'ACTIVE',
        role: role || 'RETAIL_CUSTOMER',
        created_at: new Date()
      };
      inMemoryStore.users.push(newUser);
      return { rows: [newUser], rowCount: 1 };
    }

    if (sql.includes('SELECT id FROM users WHERE phone = $1 AND id != $2') || sql.includes('SELECT id FROM users WHERE phone = ? AND id != ?')) {
      const [phone, id] = params;
      const rows = inMemoryStore.users.filter(u => u.phone === phone && u.id !== id);
      return { rows, rowCount: rows.length };
    }

    if (sql.includes('UPDATE users SET name = $1, phone = $2') || sql.includes('UPDATE users SET name = ?, phone = ?')) {
      const [name, phone, id] = params;
      const index = inMemoryStore.users.findIndex(u => u.id === id);
      if (index !== -1) {
        inMemoryStore.users[index].name = name;
        inMemoryStore.users[index].phone = phone;
        return { rows: [inMemoryStore.users[index]], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    if (sql.includes('UPDATE users SET role = $1, kyc_tier = $2') || sql.includes('UPDATE users SET role = ?, kyc_tier = ?')) {
      const [role, kyc_tier, id] = params;
      const index = inMemoryStore.users.findIndex(u => u.id === id);
      if (index !== -1) {
        inMemoryStore.users[index].role = role;
        inMemoryStore.users[index].kyc_tier = kyc_tier;
        return { rows: [inMemoryStore.users[index]], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    if (sql.includes('UPDATE users SET password_hash = $1') || sql.includes('UPDATE users SET password_hash = ?')) {
      const [password_hash, id] = params;
      const index = inMemoryStore.users.findIndex(u => u.id === id);
      if (index !== -1) {
        inMemoryStore.users[index].password_hash = password_hash;
        return { rows: [inMemoryStore.users[index]], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    if (sql.includes('UPDATE users SET pin_hash = $1') || sql.includes('UPDATE users SET pin_hash = ?')) {
      const [pin_hash, id] = params;
      const index = inMemoryStore.users.findIndex(u => u.id === id);
      if (index !== -1) {
        inMemoryStore.users[index].pin_hash = pin_hash;
        return { rows: [inMemoryStore.users[index]], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    // --- 2. IDEMPOTENCY KEY HANDLERS ---
    if (sql.includes('idempotency_keys WHERE key =') || sql.includes('idempotency_keys WHERE `key` =')) {
      const key = params[0];
      const rows = inMemoryStore.idempotency_keys.filter(k => k.key === key);
      return { rows, rowCount: rows.length };
    }

    if (sql.includes('INSERT INTO idempotency_keys')) {
      // Params: key, client_id, response_code, response_body, hash_payload
      const [key, client_id, response_code, response_body, hash_payload] = params;
      const newKey = {
        key,
        client_id,
        response_code,
        response_body: typeof response_body === 'string' ? response_body : JSON.stringify(response_body),
        hash_payload,
        created_at: new Date()
      };
      inMemoryStore.idempotency_keys.push(newKey);
      return { rows: [newKey], rowCount: 1 };
    }

    // --- 3. WALLET ACCOUNTS CACHE HANDLERS ---
    if (sql.includes('SELECT wallet_id FROM wallet_accounts_cache WHERE user_id = $1') || sql.includes('SELECT wallet_id FROM wallet_accounts_cache WHERE user_id = ?')) {
      const userId = params[0];
      const rows = inMemoryStore.wallet_accounts.filter(w => w.user_id === userId);
      return { rows, rowCount: rows.length };
    }

    if (sql.includes('INSERT INTO wallet_accounts_cache')) {
      // Params: wallet_id, user_id, available_balance, currency
      const [wallet_id, user_id, available_balance, currency] = params;
      const newCache = {
        wallet_id,
        user_id,
        available_balance: available_balance || 0,
        currency: currency || 'CBDC_IDR',
        created_at: new Date()
      };
      inMemoryStore.wallet_accounts.push(newCache);
      return { rows: [newCache], rowCount: 1 };
    }

    // Default empty result for unhandled queries (like setup/migration/cache reads)
    return { rows: [], rowCount: 0 };
  },
  
  getPool: () => pool
};
