import crypto from 'crypto';
import { responseHelper } from '../utils/response.js';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const SENSITIVE_KEYS = new Set(['password', 'pin', 'wallet_pin', 'token', 'refreshToken']);

export const requestContextMiddleware = (req, res, next) => {
  const suppliedId = req.headers['x-request-id'];
  req.id = typeof suppliedId === 'string' && REQUEST_ID_PATTERN.test(suppliedId)
    ? suppliedId
    : `req_${crypto.randomUUID()}`;
  req.headers['x-request-id'] = req.id;
  res.setHeader('X-Request-Id', req.id);
  next();
};

export const securityHeadersMiddleware = (_req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.removeHeader('X-Powered-By');
  next();
};

const sanitizeValue = (value, key = '') => {
  if (typeof value === 'string') {
    if (SENSITIVE_KEYS.has(key)) return value;
    return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F<>]/g, '').trim();
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, item]) => [childKey, sanitizeValue(item, childKey)]));
  }
  return value;
};

export const sanitizeInputMiddleware = (req, _res, next) => {
  req.body = sanitizeValue(req.body);
  req.query = sanitizeValue(req.query);
  req.params = sanitizeValue(req.params);
  next();
};

export const auditRequestMiddleware = (req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    console.log({
      timestamp: new Date().toISOString(),
      request_id: req.id,
      user_id: req.user?.userId || null,
      action: `${req.method} ${req.originalUrl.split('?')[0]}`,
      ip: req.ip,
      status_code: res.statusCode,
      duration_ms: Date.now() - startedAt,
    });
  });
  next();
};

export const createRateLimiter = ({ windowMs, limit, action }) => {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const current = hits.get(key);
    const entry = !current || current.resetAt <= now
      ? { count: 1, resetAt: now + windowMs }
      : { count: current.count + 1, resetAt: current.resetAt };
    hits.set(key, entry);
    res.setHeader('RateLimit-Policy', `${limit};w=${Math.ceil(windowMs / 1000)}`);
    res.setHeader('RateLimit-Remaining', Math.max(0, limit - entry.count));
    if (entry.count > limit) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      console.warn({ timestamp: new Date().toISOString(), request_id: req.id, action, ip: key });
      return responseHelper.error(res, 'RATE_LIMIT_EXCEEDED', 'Terlalu banyak permintaan. Silakan coba lagi nanti.', 429);
    }
    next();
  };
};
