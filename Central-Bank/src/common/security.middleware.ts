import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const SENSITIVE_KEYS = new Set(['password', 'pin', 'wallet_pin', 'token', 'refreshToken']);

type SecurityRequest = Request & { id?: string; user?: { sub?: string; userId?: string } };

export function requestContext(req: SecurityRequest, res: Response, next: NextFunction) {
  const suppliedId = req.header('x-request-id');
  req.id = suppliedId && REQUEST_ID_PATTERN.test(suppliedId) ? suppliedId : `req_${randomUUID()}`;
  req.headers['x-request-id'] = req.id;
  res.setHeader('X-Request-Id', req.id);
  next();
}

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('Content-Security-Policy', "default-src 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'none'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.removeHeader('X-Powered-By');
  next();
}

function sanitizeValue(value: unknown, key = ''): unknown {
  if (typeof value === 'string') {
    if (SENSITIVE_KEYS.has(key)) return value;
    return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F<>]/g, '').trim();
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, item]) => [childKey, sanitizeValue(item, childKey)]));
  }
  return value;
}

export function sanitizeInput(req: Request, _res: Response, next: NextFunction) {
  req.body = sanitizeValue(req.body);
  req.query = sanitizeValue(req.query) as Request['query'];
  req.params = sanitizeValue(req.params) as Request['params'];
  next();
}

export function auditRequests(req: SecurityRequest, res: Response, next: NextFunction) {
  const startedAt = Date.now();
  res.on('finish', () => {
    console.log({
      timestamp: new Date().toISOString(),
      request_id: req.id,
      user_id: req.user?.sub || req.user?.userId || null,
      action: `${req.method} ${req.originalUrl.split('?')[0]}`,
      ip: req.ip,
      status_code: res.statusCode,
      duration_ms: Date.now() - startedAt,
    });
  });
  next();
}

export function createRateLimiter(windowMs: number, limit: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: SecurityRequest, res: Response, next: NextFunction) => {
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
      res.status(429).json({
        success: false,
        data: null,
        error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Terlalu banyak permintaan. Silakan coba lagi nanti.', details: {} },
        meta: { request_id: req.id || 'req_unknown', timestamp: new Date().toISOString() },
      });
      return;
    }
    next();
  };
}
