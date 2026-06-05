import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { config } from '../config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  if (config.db.useInMemory) {
    console.log('ℹ️ Mode Database In-Memory Aktif: Melewati migrasi MySQL.');
    return;
  }

  console.log('🚀 Menjalankan migrasi database MySQL...');
  
  try {
    const connection = await mysql.createConnection({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.name,
    });

    console.log('✅ Terhubung ke server MySQL.');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Split SQL commands to run them sequentially in MySQL
    const sqlCommands = schemaSql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0);

    for (const cmd of sqlCommands) {
      await connection.query(cmd);
    }
    console.log('✅ Tabel idempotency_keys & wallet_accounts_cache berhasil disinkronkan.');

    // Dynamic schema validation for shared users table
    const [columns] = await connection.query('SHOW COLUMNS FROM users');
    const columnNames = columns.map(c => c.Field);

    if (!columnNames.includes('phone')) {
      console.log('🔹 Menambahkan kolom `phone` ke tabel `users`...');
      await connection.query('ALTER TABLE users ADD COLUMN phone VARCHAR(50) UNIQUE NULL AFTER email');
    }
    if (!columnNames.includes('pin_hash')) {
      console.log('🔹 Menambahkan kolom `pin_hash` ke tabel `users`...');
      await connection.query('ALTER TABLE users ADD COLUMN pin_hash VARCHAR(191) NULL AFTER password_hash');
    }

    console.log('✅ Migrasi skema database terintegrasi selesai dengan sukses.');
    await connection.end();
  } catch (err) {
    console.error('❌ Gagal menjalankan migrasi database:', err.message);
    console.log('💡 Tips: Silakan aktifkan USE_IN_MEMORY_DB=true di file .env jika MySQL belum siap.');
  }
}

runMigrations();
