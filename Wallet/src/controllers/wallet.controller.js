import bcrypt from 'bcryptjs';
import { db } from '../config/database.js';
import { centralBankService } from '../services/centralBank.service.js';
import { responseHelper } from '../utils/response.js';
import { CustomError } from '../utils/errors.js';

export const walletController = {
  
  // GET /api/v1/wallets/me/balance
  getBalance: async (req, res, next) => {
    try {
      const { walletId } = req.user;
      const token = req.headers['authorization']?.split(' ')[1];
      
      const balanceInfo = await centralBankService.getBalance(walletId, token);
      
      return responseHelper.success(res, balanceInfo, 200);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/wallets/me/transactions
  getTransactions: async (req, res, next) => {
    try {
      const { walletId } = req.user;
      const token = req.headers['authorization']?.split(' ')[1];
      
      const transactions = await centralBankService.getTransactions(walletId, token);
      
      return responseHelper.success(res, transactions, 200);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/wallets/me/kyc-document
  getKycDocument: async (req, res, next) => {
    try {
      const { userId } = req.user;
      const result = await db.query(
        `SELECT kyc_tier, identity_document_type, identity_document_number, identity_document_name,
                identity_document_data_url, identity_document_uploaded_at
         FROM users WHERE id = ?`,
        [userId]
      );

      if (result.rowCount === 0) {
        return responseHelper.error(res, 'NOT_FOUND', 'Pengguna tidak ditemukan', 404);
      }

      const row = result.rows[0];
      return responseHelper.success(res, {
        kycTier: row.kyc_tier,
        documentType: row.identity_document_type,
        documentNumber: row.identity_document_number,
        documentName: row.identity_document_name,
        documentDataUrl: row.identity_document_data_url,
        uploadedAt: row.identity_document_uploaded_at,
        hasDocument: Boolean(row.identity_document_data_url),
      }, 200);
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/wallets/me/kyc-document
  updateKycDocument: async (req, res, next) => {
    try {
      const { userId } = req.user;
      const { documentType, documentNumber, documentName, documentDataUrl } = req.body;
      const allowedTypes = ['KTP', 'SIM', 'PASSPORT'];
      const dataUrlPattern = /^data:(image\/(png|jpeg|webp)|application\/pdf);base64,[A-Za-z0-9+/=]+$/;

      if (!allowedTypes.includes(documentType)) {
        return responseHelper.error(res, 'BAD_REQUEST', 'Jenis dokumen harus KTP, SIM, atau PASSPORT', 400);
      }
      if (typeof documentNumber !== 'string' || !/^[A-Za-z0-9.-]{6,32}$/.test(documentNumber.trim())) {
        return responseHelper.error(res, 'BAD_REQUEST', 'Nomor dokumen harus 6-32 karakter alfanumerik', 400);
      }
      if (typeof documentName !== 'string' || documentName.trim().length < 3 || documentName.trim().length > 120) {
        return responseHelper.error(res, 'BAD_REQUEST', 'Nama pada dokumen wajib diisi 3-120 karakter', 400);
      }
      if (typeof documentDataUrl !== 'string' || documentDataUrl.length > 650000 || !dataUrlPattern.test(documentDataUrl)) {
        return responseHelper.error(res, 'BAD_REQUEST', 'File dokumen harus berupa PNG, JPG, WEBP, atau PDF maksimal sekitar 500KB', 400);
      }

      const update = await db.query(
        `UPDATE users
         SET identity_document_type = ?,
             identity_document_number = ?,
             identity_document_name = ?,
             identity_document_data_url = ?,
             identity_document_uploaded_at = CURRENT_TIMESTAMP(3),
             kyc_tier = 'BASIC',
             updated_at = CURRENT_TIMESTAMP(3)
         WHERE id = ?`,
        [documentType, documentNumber.trim(), documentName.trim(), documentDataUrl, userId]
      );

      if (update.rowCount === 0) {
        return responseHelper.error(res, 'NOT_FOUND', 'Pengguna tidak ditemukan', 404);
      }

      return responseHelper.success(res, {
        message: 'Dokumen identitas berhasil diunggah dan menunggu verifikasi Teller',
        kycTier: 'BASIC',
        documentType,
        documentNumber: documentNumber.trim(),
        documentName: documentName.trim(),
      }, 200);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/wallets/me/invoice/generate-test (Convenience testing helper)
  generateTestInvoice: async (req, res, next) => {
    try {
      const { walletId } = req.user;
      const token = req.headers['authorization']?.split(' ')[1];
      
      const newInvoice = await centralBankService.generateTestInvoice(walletId, token);
      
      return responseHelper.success(
        res, 
        {
          message: 'Berhasil membuat invoice simulasi untuk pengujian bayar tagihan',
          invoice: newInvoice
        }, 
        201
      );
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/wallets/me/topup
  topUp: async (req, res, next) => {
    try {
      const { walletId } = req.user;
      const { amount } = req.body;
      
      if (amount === undefined) {
        return responseHelper.error(res, 'BAD_REQUEST', 'Nominal top up wajib disertakan', 400);
      }
      
      const topUpAmount = parseInt(amount, 10);
      if (isNaN(topUpAmount) || topUpAmount <= 0) {
        return responseHelper.error(res, 'BAD_REQUEST', 'Nominal top up harus berupa angka bulat positif', 400);
      }
      
      const receipt = await centralBankService.topUp(walletId, topUpAmount);
      return responseHelper.success(res, { message: 'Top up simulasi berhasil', receipt }, 200);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/wallets/me/withdraw
  withdraw: async (req, res, next) => {
    try {
      const { walletId } = req.user;
      const { amount } = req.body;
      
      if (amount === undefined) {
        return responseHelper.error(res, 'BAD_REQUEST', 'Nominal tarik tunai wajib disertakan', 400);
      }
      
      const wdAmount = parseInt(amount, 10);
      if (isNaN(wdAmount) || wdAmount <= 0) {
        return responseHelper.error(res, 'BAD_REQUEST', 'Nominal tarik tunai harus berupa angka bulat positif', 400);
      }
      
      const token = req.headers['authorization']?.split(' ')[1];
      const receipt = await centralBankService.withdraw(walletId, wdAmount, token);
      return responseHelper.success(res, { message: 'Tarik tunai simulasi berhasil', receipt }, 200);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/wallets/me/claim-stimulus
  claimStimulus: async (req, res, next) => {
    try {
      const { walletId } = req.user;
      
      const receipt = await centralBankService.claimStimulus(walletId);
      return responseHelper.success(res, { message: 'Stimulus berhasil diklaim!', receipt }, 200);
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/wallets/me/profile
  updateProfile: async (req, res, next) => {
    try {
      const { userId } = req.user;
      const { name, phone } = req.body;
      
      if (!name) {
        return responseHelper.error(res, 'BAD_REQUEST', 'Nama Lengkap wajib diisi', 400);
      }
      
      const cleanPhone = phone ? phone.trim() : null;
      
      // Check phone uniqueness if changing
      if (cleanPhone) {
        const phoneCheck = await db.query(
          'SELECT id FROM users WHERE phone = $1 AND id != $2', 
          [cleanPhone, userId]
        );
        if (phoneCheck.rowCount > 0) {
          return responseHelper.error(res, 'BAD_REQUEST', 'Nomor HP sudah terdaftar oleh pengguna lain', 400);
        }
      }
      
      await db.query(
        'UPDATE users SET name = $1, phone = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [name, cleanPhone, userId]
      );
      
      return responseHelper.success(res, { message: 'Profil berhasil diperbarui' }, 200);
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/wallets/me/security
  updateSecurity: async (req, res, next) => {
    try {
      const { userId } = req.user;
      const { password, pin } = req.body;
      
      if (!password && !pin) {
        return responseHelper.error(res, 'BAD_REQUEST', 'Silakan isi password atau PIN transaksi untuk diperbarui', 400);
      }
      
      if (password) {
        const passwordHash = bcrypt.hashSync(password, 10);
        await db.query(
          'UPDATE users SET password_hash = $1 WHERE id = $2',
          [passwordHash, userId]
        );
      }
      
      if (pin) {
        const pinStr = pin.toString();
        if (pinStr.length !== 6 || isNaN(parseInt(pinStr, 10))) {
          return responseHelper.error(res, 'BAD_REQUEST', 'PIN transaksi baru harus berupa 6 digit angka', 400);
        }
        
        const pinHash = bcrypt.hashSync(pinStr, 10);
        await db.query(
          'UPDATE users SET pin_hash = $1 WHERE id = $2',
          [pinHash, userId]
        );
      }
      
      return responseHelper.success(res, { message: 'Pengaturan keamanan berhasil diperbarui' }, 200);
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/wallets/me/upgrade
  upgradeAccount: async (req, res, next) => {
    try {
      const { userId } = req.user;
      const { role, businessName, nik } = req.body;

      if (!role || !businessName || !nik) {
        return responseHelper.error(res, 'BAD_REQUEST', 'Peran Bisnis, Nama Bisnis, dan NIK wajib diisi untuk pengajuan upgrade', 400);
      }

      const validRoles = ['MERCHANT', 'CASHIER', 'SUPPLIER', 'LOGISTICS', 'ANALYTICS_VIEWER'];
      if (!validRoles.includes(role)) {
        return responseHelper.error(res, 'BAD_REQUEST', 'Peran Bisnis yang diajukan tidak valid', 400);
      }

      if (nik.trim().length !== 16 || isNaN(parseInt(nik, 10))) {
        return responseHelper.error(res, 'BAD_REQUEST', 'Nomor NIK harus berupa 16-digit angka dummy', 400);
      }

      const mapDbRole = (r) => {
        const upper = (r || '').toUpperCase();
        if (['MERCHANT', 'SUPPLIER', 'ANALYTICS_VIEWER'].includes(upper)) return 'MERCHANT';
        if (['CENTRAL_BANK_ADMIN', 'AUDITOR', 'SYSTEM_SERVICE'].includes(upper)) return upper;
        return 'WALLET_USER';
      };
      const dbRole = mapDbRole(role);

      // Update in PostgreSQL (or mock in-memory store)
      const updateResult = await db.query(
        'UPDATE users SET role = $1, kyc_tier = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [dbRole, 'VERIFIED', userId]
      );

      if (updateResult.rowCount === 0) {
        return responseHelper.error(res, 'NOT_FOUND', 'Pengguna tidak ditemukan', 404);
      }

      console.log(`🚀 [UPGRADE PROCESS] User ${userId} successfully upgraded to role ${role} (KYC: VERIFIED)`);

      return responseHelper.success(res, { 
        message: `Akun Anda berhasil ditingkatkan menjadi ${role}!`,
        role,
        kycTier: 'VERIFIED'
      }, 200);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/wallets/me/subscribe-insight
  subscribeInsight: async (req, res, next) => {
    try {
      const { walletId } = req.user;
      
      const token = req.headers['authorization']?.split(' ')[1];
      const receipt = await centralBankService.subscribeInsight(walletId, token);
      
      return responseHelper.success(res, {
        message: 'Pembayaran langganan premium UMKM Insight berhasil diselesaikan',
        receipt
      }, 200);
    } catch (err) {
      next(err);
    }
  }
};
