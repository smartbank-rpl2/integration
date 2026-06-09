import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { config } from './config.js';

// ─────────────────────────────────────────────────────────────
// 1.  MySQL Connection Pool
// ─────────────────────────────────────────────────────────────
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
    namedPlaceholders: false,          // We use ? placeholders
  });

  // Test connection immediately
  await pool.query('SELECT 1');
  console.log('✅ Wallet connected to MySQL successfully');
} catch (err) {
  console.error('❌ FATAL: Cannot connect to MySQL. Exiting.', err.message);
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────
// 2.  Seed Staff Accounts to MySQL
// ─────────────────────────────────────────────────────────────
async function seedStaffAccountsToMySQL() {
  if (!config.security.enableStaffSeed) {
    console.log('ℹ️  Staff account seeding disabled (ENABLE_STAFF_SEED=false)');
    return;
  }
  const staffPassword = bcrypt.hashSync('password', 10);
  const pinHash = bcrypt.hashSync('123456', 10);
  const staffAccounts = [
    {
      id: 'staff-teller-001',
      name: 'Teller SmartBank',
      email: 'teller@test.com',
      phone: '081100000001',
      role: 'TELLER',
    },
    {
      id: 'staff-manager-001',
      name: 'Manager SmartBank',
      email: 'manager@test.com',
      phone: '081100000002',
      role: 'MANAGER',
    },
  ];

  for (const acc of staffAccounts) {
    try {
      await pool.execute(
        `INSERT INTO users (id, name, email, phone, password_hash, pin_hash, kyc_tier, status, role, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'VERIFIED', 'ACTIVE', ?, CURRENT_TIMESTAMP(3))
         ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone), password_hash=VALUES(password_hash), updated_at=CURRENT_TIMESTAMP(3)`,
        [acc.id, acc.name, acc.email, acc.phone, staffPassword, pinHash, acc.role]
      );
      console.log(`✅ Staff seeded: ${acc.email}`);
    } catch (err) {
      if (err.code !== 'ER_DUP_ENTRY') {
        console.error(`⚠️ Failed to seed ${acc.email}:`, err.message);
      }
    }
  }
}

// Run seed after connection is ready
seedStaffAccountsToMySQL().catch(console.error);

// ─────────────────────────────────────────────────────────────
// 3.  db wrapper — MySQL only (no in-memory fallback)
// ─────────────────────────────────────────────────────────────
export const db = {
  getDatabaseType: () => activeDatabaseType,

  /**
   * Execute a SQL query.
   * - Uses ? placeholders (PostgreSQL $1-style translated to ?).
   * - Always runs on MySQL pool.
   * - Throws on connection error (no silent in-memory fallback).
   */
  query: async (text, params = []) => {
    if (activeDatabaseType !== 'MySQL' || !pool) {
      throw new Error('MySQL is not active — cannot execute queries');
    }

    // Translate PostgreSQL $1, $2 … placeholders to ?
    const mysqlText = text.replace(/\$\d+/g, '?');

    try {
      const [rows] = await pool.query(mysqlText, params);

      return {
        rows: Array.isArray(rows) ? rows : [],
        rowCount: Array.isArray(rows) ? rows.length : (rows.affectedRows || 0),
      };
    } catch (err) {
      console.error(`❌ MySQL query error: ${err.message}\n  SQL: ${mysqlText}`);
      throw err; // Fatal — do NOT silently fall back to in-memory
    }
  },

  getPool: () => pool,
};
