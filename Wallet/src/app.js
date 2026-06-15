import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';

import { authController } from './controllers/auth.controller.js';
import { walletController } from './controllers/wallet.controller.js';
import { transferController } from './controllers/transfer.controller.js';
import { paymentController } from './controllers/payment.controller.js';
import { loanController } from './controllers/loan.controller.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import { pinMiddleware } from './middleware/pin.middleware.js';
import { idempotencyMiddleware } from './middleware/idempotency.middleware.js';
import { requireRole } from './middleware/rbac.middleware.js';
import {
  auditRequestMiddleware,
  createRateLimiter,
  requestContextMiddleware,
  sanitizeInputMiddleware,
  securityHeadersMiddleware,
} from './middleware/security.middleware.js';
import { responseHelper } from './utils/response.js';
import { db } from './config/database.js';
import { config } from './config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const swaggerDocument = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'config/swagger.json'), 'utf8')
);

const app = express();
app.set('trust proxy', config.trustProxy);
app.use(requestContextMiddleware);

// CORS — explicit allowlist only (no wildcard)
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.cors.allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin tidak diizinkan oleh kebijakan CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-Id', 'X-Wallet-Pin', 'x-request-id', 'x-wallet-pin'],
  credentials: true,
  maxAge: 86400,
}));
app.use(securityHeadersMiddleware);
app.use(express.json({ limit: '750kb' }));
app.use(sanitizeInputMiddleware);
app.use(auditRequestMiddleware);
app.use(createRateLimiter({ windowMs: 60_000, limit: 100, action: 'wallet_general_rate_limit' }));
app.use(express.static('src/public'));

// Serve Interactive Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// --- PUBLIC ROUTES ---
app.get('/', (req, res) => {
  return res.status(200).json({
    app: 'SmartBank Wallet Backend',
    version: '1.0.0',
    status: 'ONLINE',
    database: db.getDatabaseType(),
    documentation: '/api-docs'
  });
});

const authRateLimiter = createRateLimiter({ windowMs: 60_000, limit: 10, action: 'wallet_auth_rate_limit' });
app.post('/api/v1/auth/register', authRateLimiter, authController.register);
app.post('/api/v1/auth/login', authRateLimiter, authController.login);

// --- PROTECTED ROUTES ---
app.use('/api/v1/wallets/me', authMiddleware, requireRole('WALLET_USER'));
app.get('/api/v1/wallets/me/balance', walletController.getBalance);
app.get('/api/v1/wallets/me/transactions', walletController.getTransactions);
app.get('/api/v1/wallets/me/kyc-document', walletController.getKycDocument);
app.put('/api/v1/wallets/me/kyc-document', walletController.updateKycDocument);

// P0 Security: Gate test invoice helper to development environment only
if (config.nodeEnv !== 'production') {
  app.post('/api/v1/wallets/me/invoice/generate-test', authMiddleware, requireRole('MANAGER', 'TELLER', 'CENTRAL_BANK_ADMIN'), walletController.generateTestInvoice);
}

// Legacy self-service simulation routes. Real teller operations use Central Bank /api/v1/teller/*.
app.post('/api/v1/wallets/me/topup', pinMiddleware, walletController.topUp);
app.post('/api/v1/wallets/me/withdraw', pinMiddleware, walletController.withdraw);

// P0 Security: claim-stimulus requires PIN validation (WALLET_USER can claim but must provide PIN)
app.post('/api/v1/wallets/me/claim-stimulus', pinMiddleware, walletController.claimStimulus);

app.put('/api/v1/wallets/me/profile', walletController.updateProfile);
app.put('/api/v1/wallets/me/security', walletController.updateSecurity);
app.put('/api/v1/wallets/me/upgrade', walletController.upgradeAccount);
app.post('/api/v1/wallets/me/subscribe-insight', walletController.subscribeInsight);

// Financial Transactions: Requires JWT Auth + PIN Validation + Idempotency Protection + RBAC
app.post('/api/v1/transfers', authMiddleware, requireRole('WALLET_USER'), idempotencyMiddleware, pinMiddleware, transferController.createTransfer);
app.post('/api/v1/payment-requests/:id/pay', authMiddleware, requireRole('WALLET_USER'), idempotencyMiddleware, pinMiddleware, paymentController.payInvoice);

// Loans Subsystem: Requires JWT Auth + Idempotency Protection + RBAC
app.post('/api/v1/loans/apply', authMiddleware, requireRole('WALLET_USER'), idempotencyMiddleware, loanController.applyLoan);
app.post('/api/v1/loans/:loan_id/repay', authMiddleware, requireRole('WALLET_USER'), idempotencyMiddleware, loanController.repayLoan);

// 404 Route handler
app.use((req, res) => {
  return responseHelper.error(res, 'NOT_FOUND', `Rute ${req.method} ${req.originalUrl} tidak ditemukan`, 404);
});

// Centralized Global Error Handler Middleware
app.use((err, req, res, next) => {
  const statusCode = Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode < 600
    ? err.statusCode
    : 500;
  const isServerError = statusCode >= 500;
  console.error({
    timestamp: new Date().toISOString(),
    request_id: req.id,
    user_id: req.user?.userId || null,
    action: 'unhandled_wallet_error',
    error_type: err.name,
  });

  return responseHelper.error(
    res,
    isServerError ? 'INTERNAL_SERVER_ERROR' : (err.code || 'BAD_REQUEST'),
    isServerError ? 'Terjadi kesalahan sistem internal' : (err.message || 'Permintaan tidak dapat diproses'),
    statusCode,
  );
});

export default app;
