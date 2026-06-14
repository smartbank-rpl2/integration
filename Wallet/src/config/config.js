import dotenv from 'dotenv';
dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export const config = {
  port: parseInt(process.env.PORT || '6969', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  trustProxy: process.env.TRUST_PROXY === 'true',
  jwt: {
    secret: process.env.JWT_SECRET,
    accessExpires: parseInt(process.env.JWT_ACCESS_EXPIRES || '3600', 10),
    refreshExpires: parseInt(process.env.JWT_REFRESH_EXPIRES || '604800', 10),
    issuer: process.env.JWT_ISSUER || 'smartbank',
    audience: process.env.JWT_AUDIENCE || 'smartbank-clients',
  },
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'central_bank',
    password: process.env.DB_PASSWORD || 'central_bank_password',
    name: process.env.DB_NAME || 'central_bank_core',
    useInMemory: process.env.USE_IN_MEMORY_DB === 'true',
  },
  centralBank: {
    url: process.env.CENTRAL_BANK_CORE_URL || 'http://localhost:3000',
    mock: process.env.MOCK_CENTRAL_BANK === 'true',
  },
  cbdc: {
    cooldownSeconds: parseInt(process.env.COOLDOWN_SECONDS || '10', 10),
    dailyLimitCount: parseInt(process.env.DAILY_LIMIT_COUNT || '10', 10),
    maxTransferPerTx: parseInt(process.env.MAX_TRANSFER_PER_TX || '50000', 10),
  },
  security: {
    enableStaffSeed: process.env.ENABLE_STAFF_SEED === 'true',
  },
  cors: {
    allowedOrigins: process.env.CORS_ALLOWED_ORIGINS
      ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim())
      : ['http://localhost:3001', 'http://localhost:6969', 'http://localhost:5173'],
  },
};
