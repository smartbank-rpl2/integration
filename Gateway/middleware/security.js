import crypto from 'crypto';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export const requestContext = (req, res, next) => {
  const suppliedId = req.headers['x-request-id'];
  req.id = typeof suppliedId === 'string' && REQUEST_ID_PATTERN.test(suppliedId)
    ? suppliedId
    : `req_${crypto.randomUUID()}`;
  req.headers['x-request-id'] = req.id;
  res.setHeader('X-Request-Id', req.id);
  next();
};

export const securityHeaders = (_req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'none'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.removeHeader('X-Powered-By');
  next();
};

export const auditRequests = (req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    console.log({
      timestamp: new Date().toISOString(),
      request_id: req.id,
      user_id: req.user?.userId || req.user?.sub || null,
      action: `${req.method} ${req.originalUrl.split('?')[0]}`,
      ip: req.ip,
      status_code: res.statusCode,
      duration_ms: Date.now() - startedAt,
    });
  });
  next();
};

export const createRateLimiter = ({ windowMs, limit }) => {
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
      return res.status(429).json({
        success: false,
        data: null,
        error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Terlalu banyak permintaan. Silakan coba lagi nanti.', details: {} },
        meta: { request_id: req.id, timestamp: new Date().toISOString() },
      });
    }
    next();
  };
};
