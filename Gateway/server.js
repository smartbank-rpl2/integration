import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import { jwtMiddleware } from './middleware/jwt.js';
import { auditRequests, createRateLimiter, requestContext, securityHeaders } from './middleware/security.js';

dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const app = express();
const PORT = process.env.PORT || 4000;

const CENTRAL_BANK_URL = process.env.CENTRAL_BANK_URL || 'http://localhost:3000';
const WALLET_URL = process.env.WALLET_URL || 'http://localhost:3001';

// SSRF Protection: Validate upstream URLs
try {
  const cbUrl = new URL(CENTRAL_BANK_URL);
  const walletUrl = new URL(WALLET_URL);
  const allowedHosts = ['localhost', '127.0.0.1', 'central-bank', 'wallet', 'api.smartbank.local'];
  if (!allowedHosts.includes(cbUrl.hostname) && !cbUrl.hostname.endsWith('.internal')) {
    console.warn(`⚠️ Warning: Unrecognized CENTRAL_BANK_URL host: ${cbUrl.hostname}`);
  }
} catch (err) {
  throw new Error('Invalid CENTRAL_BANK_URL or WALLET_URL environment variable');
}

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3001,http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const proxyErrorHandler = (err, req, res) => {
  console.error({ timestamp: new Date().toISOString(), request_id: req.id, action: 'proxy_upstream_error', error_type: err.name });
  res.status(502).json({
    success: false,
    data: null,
    error: { code: 'UPSTREAM_UNAVAILABLE', message: 'Service tujuan sementara tidak tersedia', details: {} },
    meta: { request_id: req.id || 'req_unknown', timestamp: new Date().toISOString() },
  });
};

app.set('trust proxy', process.env.TRUST_PROXY === 'true');
app.use(requestContext);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin tidak diizinkan oleh kebijakan CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key', 'X-Request-Id', 'X-Wallet-Pin', 'x-request-id', 'x-wallet-pin'],
  maxAge: 86400,
}));
// Make sure Vary: Origin is explicitly handled
app.use((req, res, next) => {
  res.setHeader('Vary', 'Origin');
  next();
});
app.use(securityHeaders);
app.use(auditRequests);
app.use(createRateLimiter({ windowMs: 60_000, limit: 100 }));
app.use((req, _res, next) => {
  delete req.headers['x-user-id'];
  delete req.headers['x-user-role'];
  next();
});

// Handle preflight OPTIONS before proxy
app.options('/api/bank', (req, res) => { res.status(204).end(); });
app.options('/api/wallet', (req, res) => { res.status(204).end(); });

// Parse bodies explicitly to validate size
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: false }));

// Proxy to Central Bank
app.use('/api/bank', jwtMiddleware, createProxyMiddleware({
  target: CENTRAL_BANK_URL,
  changeOrigin: true,
  proxyTimeout: 30000,
  on: {
    error: proxyErrorHandler,
    proxyReq: (proxyReq) => proxyReq.setTimeout(30000)
  },
  pathRewrite: {
    '^/api/bank': '/api/v1', // rewrite path
  },
}));

// Proxy to Wallet
app.use('/api/wallet', jwtMiddleware, createProxyMiddleware({
  target: WALLET_URL,
  changeOrigin: true,
  proxyTimeout: 30000,
  on: {
    error: proxyErrorHandler,
    proxyReq: (proxyReq) => proxyReq.setTimeout(30000)
  },
  pathRewrite: {
    '^/api/wallet': '/api', // rewrite path
  },
}));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: { status: 'OK', message: 'API Gateway is running' },
    error: null,
    meta: { request_id: req.id, timestamp: new Date().toISOString() },
  });
});

app.use((err, req, res, _next) => {
  console.error({ timestamp: new Date().toISOString(), request_id: req.id, action: 'gateway_error', error_type: err.name });
  res.status(500).json({
    success: false,
    data: null,
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan sistem internal', details: {} },
    meta: { request_id: req.id || 'req_unknown', timestamp: new Date().toISOString() },
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });
