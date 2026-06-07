import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import { jwtMiddleware } from './middleware/jwt.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

const CENTRAL_BANK_URL = process.env.CENTRAL_BANK_URL || 'http://localhost:3000';
const WALLET_URL = process.env.WALLET_URL || 'http://localhost:3001';

app.use(cors());

// Global logging middleware
app.use((req, res, next) => {
  console.log(`[GATEWAY] ${req.method} ${req.originalUrl}`);
  next();
});

// Proxy to Central Bank
app.use('/api/bank', jwtMiddleware, createProxyMiddleware({
  target: CENTRAL_BANK_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/': '/api/v1/', // rewrite path because /api/bank is stripped
  },
}));

// Proxy to Wallet
app.use('/api/wallet', createProxyMiddleware({
  target: WALLET_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/': '/api/', // rewrite path because /api/wallet is stripped
  },
}));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'API Gateway is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
});
