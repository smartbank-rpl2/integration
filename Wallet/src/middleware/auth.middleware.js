import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const requestId = req.id || req.headers['x-request-id'] || 'req_unknown';

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      data: null,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token otorisasi diperlukan di header Authorization',
        details: {}
      },
      meta: { request_id: requestId, timestamp: new Date().toISOString() }
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      data: null,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Format token harus berupa Bearer <token>',
        details: {}
      },
      meta: { request_id: requestId, timestamp: new Date().toISOString() }
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret, { issuer: config.jwt.issuer, audience: config.jwt.audience });
    req.user = decoded; // Attach user info (userId, name, email, walletId) to request
    next();
  } catch (err) {
    console.error({
      timestamp: new Date().toISOString(),
      request_id: requestId,
      action: 'jwt_verification_failed',
      error_type: err.name,
    });
    return res.status(401).json({
      success: false,
      data: null,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token kedaluwarsa atau tidak valid',
        details: {}
      },
      meta: { request_id: requestId, timestamp: new Date().toISOString() }
    });
  }
};
