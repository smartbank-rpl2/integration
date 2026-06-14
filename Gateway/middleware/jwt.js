import jwt from 'jsonwebtoken';

export const jwtMiddleware = (req, res, next) => {
  // Public routes that don't need token (e.g. login, register)
  const publicRoutes = ['/api/bank/auth/login', '/api/bank/auth/register'];
  
  if (publicRoutes.some(route => req.originalUrl.startsWith(route))) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      data: null,
      error: { code: 'UNAUTHORIZED', message: 'Token tidak ditemukan atau format salah', details: {} },
      meta: { request_id: req.id || 'req_unknown', timestamp: new Date().toISOString() },
    });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    // Note: In real app, secret should match what Central-Bank/Wallet uses
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET wajib dikonfigurasi');
    const decoded = jwt.verify(token, secret, {
      issuer: process.env.JWT_ISSUER || 'smartbank',
      audience: process.env.JWT_AUDIENCE || 'smartbank-clients',
    });
    req.user = decoded;
    
    // Pass user info to downstream via headers
    req.headers['x-user-id'] = decoded.userId || decoded.sub;
    req.headers['x-user-role'] = decoded.role;
    
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      data: null,
      error: { code: 'UNAUTHORIZED', message: 'Token tidak valid atau kedaluwarsa', details: {} },
      meta: { request_id: req.id || 'req_unknown', timestamp: new Date().toISOString() },
    });
  }
};
