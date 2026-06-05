import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database.js';
import { centralBankService } from './centralBank.service.js';
import { tokenService } from './token.service.js';
import { CustomError } from '../utils/errors.js';

export const authService = {
  
  // 1. REGISTER NEW USER
  register: async (name, email, phone, password, pin, role = 'RETAIL_CUSTOMER') => {
    // Basic formatting
    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = phone ? phone.trim() : null;

    // Check if email already registered locally
    const emailCheck = await db.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (emailCheck.rowCount > 0) {
      throw new CustomError('BAD_REQUEST', 'Email sudah terdaftar di sistem', 400);
    }

    // Check if phone already registered locally (if phone provided)
    if (cleanPhone) {
      const phoneCheck = await db.query('SELECT id FROM users WHERE phone = $1', [cleanPhone]);
      if (phoneCheck.rowCount > 0) {
        throw new CustomError('BAD_REQUEST', 'Nomor telepon sudah terdaftar di sistem', 400);
      }
    }

    // Call Central Bank Core to open account & disburse initial stimulus
    let walletInfo;
    try {
      walletInfo = await centralBankService.createAccount(name, cleanEmail, password);
    } catch (err) {
      console.error('❌ Gagal membuat wallet di CentralBank Core:', err.message);
      throw new CustomError('INTERNAL_SERVER_ERROR', `Registrasi ditolak oleh Central Bank: ${err.message}`, 500);
    }

    const { user_id: cbUserId, wallet_id: walletId, initial_balance: cbInitialBalance } = walletInfo;
    const initialBalance = cbInitialBalance ? parseInt(cbInitialBalance, 10) : 50000;

    const pinHash = bcrypt.hashSync(pin.toString(), 10);
    const passwordHash = bcrypt.hashSync(password, 10);

    const mapDbRole = (r) => {
      const upper = (r || '').toUpperCase();
      if (['MERCHANT', 'SUPPLIER', 'ANALYTICS_VIEWER'].includes(upper)) return 'MERCHANT';
      if (['CENTRAL_BANK_ADMIN', 'AUDITOR', 'SYSTEM_SERVICE'].includes(upper)) return upper;
      return 'WALLET_USER';
    };

    const dbRole = mapDbRole(role);

    // Check if user row was already created by Central Bank Core
    const userExists = await db.query('SELECT id FROM users WHERE id = $1', [cbUserId]);

    if (userExists.rowCount > 0) {
      // In real integration mode: update existing user details (phone and pin_hash)
      await db.query(
        'UPDATE users SET phone = $1, pin_hash = $2, role = $3 WHERE id = $4',
        [cleanPhone, pinHash, dbRole, cbUserId]
      );
    } else {
      // In mock mode: create the user record manually
      await db.query(
        'INSERT INTO users (id, name, email, phone, password_hash, pin_hash, kyc_tier, status, role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [cbUserId, name, cleanEmail, cleanPhone, passwordHash, pinHash, 'BASIC', 'ACTIVE', dbRole]
      );
    }

    // Sync the read-model cache
    await db.query('DELETE FROM wallet_accounts_cache WHERE wallet_id = $1', [walletId]);
    await db.query(
      'INSERT INTO wallet_accounts_cache (wallet_id, user_id, available_balance, currency) VALUES ($1, $2, $3, $4)',
      [walletId, cbUserId, initialBalance, 'CBDC_IDR']
    );

    return {
      userId: cbUserId,
      name,
      email: cleanEmail,
      walletId,
      initialBalance,
      role
    };
  },

  // 2. LOGIN USER
  login: async (email, password) => {
    const cleanEmail = email.toLowerCase().trim();

    // Fetch user locally
    const result = await db.query('SELECT * FROM users WHERE email = $1', [cleanEmail]);
    if (result.rowCount === 0) {
      throw new CustomError('UNAUTHORIZED', 'Email atau password yang Anda masukkan salah', 401);
    }

    const user = result.rows[0];

    // Check status
    if (user.status !== 'ACTIVE') {
      throw new CustomError('UNAUTHORIZED', 'Akun Anda sedang dibekukan (SUSPENDED). Silakan hubungi Provider Admin.', 401);
    }

    // Verify Password
    const passwordMatch = bcrypt.compareSync(password, user.password_hash);
    if (!passwordMatch) {
      throw new CustomError('UNAUTHORIZED', 'Email atau password yang Anda masukkan salah', 401);
    }

    // Fetch associated Wallet ID from read-model cache
    let walletId = null;
    const walletResult = await db.query('SELECT wallet_id FROM wallet_accounts_cache WHERE user_id = $1', [user.id]);
    
    if (walletResult.rowCount > 0) {
      walletId = walletResult.rows[0].wallet_id;
    } else {
      // If missing in cache for some reason, re-attempt mock resolve
      walletId = `wal_res_${user.id.substring(4, 10)}`;
    }

    // Generate JWT access & refresh tokens
    const tokens = tokenService.generateTokens({
      userId: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      walletId: walletId,
      role: user.role
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        kycTier: user.kyc_tier,
        walletId,
        role: user.role
      },
      ...tokens
    };
  }
};
