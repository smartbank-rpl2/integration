import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database.js';
import { centralBankService } from './centralBank.service.js';
import { tokenService } from './token.service.js';
import { CustomError } from '../utils/errors.js';
import { config } from '../config/config.js';

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
      if (['MERCHANT', 'SUPPLIER'].includes(upper)) return 'MERCHANT';
      if (['ANALYTICS_VIEWER', 'MANAGER'].includes(upper)) return 'MANAGER';
      if (['CASHIER', 'POS_OPERATOR', 'TELLER'].includes(upper)) return 'TELLER';
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

    // Fetch user locally (in-memory or MySQL)
    const result = await db.query('SELECT * FROM users WHERE email = $1', [cleanEmail]);
    
    if (result.rowCount === 0) {
      // --- FALLBACK: user mungkin terdaftar di Central Bank tapi belum di cache lokal ---
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
          // CB login response sekarang mengandung: access_token, user_id, name, role, kyc_tier, wallet_id
          const cbPayload = cbData.data || cbData;
          const cbToken = cbPayload.access_token;

          // Decode JWT juga sebagai fallback
          let userId = cbPayload.user_id;
          let userRole = cbPayload.role || 'RETAIL_CUSTOMER';
          let kycTier = cbPayload.kyc_tier || 'BASIC';
          let userName = cbPayload.name;
          let walletId = cbPayload.wallet_id;

          // Fallback: decode dari JWT jika field tidak ada di response
          if (!userId && cbToken) {
            try {
              const payload = JSON.parse(Buffer.from(cbToken.split('.')[1], 'base64').toString('utf8'));
              userId = payload.sub || payload.userId;
              userRole = payload.role || userRole;
              if (!userName) userName = payload.name;
            } catch (e) { /* ignore */ }
          }

          if (!userId) userId = `usr_cb_${cleanEmail.replace(/[@.]/g, '_')}`;
          if (!userName) userName = cleanEmail.split('@')[0];
          if (!walletId) walletId = `wal_res_${userId.substring(0, 10)}`;
          if (userRole === 'WALLET_USER') userRole = 'RETAIL_CUSTOMER';

          // Cache ke in-memory store agar request berikutnya tidak perlu fallback lagi
          const passwordHash = bcrypt.hashSync(password, 10);
          await db.query(
            'INSERT INTO users (id, name, email, phone, password_hash, pin_hash, kyc_tier, status, role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [userId, userName, cleanEmail, null, passwordHash, null, kycTier, 'ACTIVE', userRole]
          );
          await db.query(
            'INSERT INTO wallet_accounts_cache (wallet_id, user_id, available_balance, currency) VALUES ($1, $2, $3, $4)',
            [walletId, userId, 0, 'CBDC_IDR']
          );

          console.log(`✅ [AUTH] Fallback berhasil: ${cleanEmail} (role: ${userRole}, wallet: ${walletId})`);

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
