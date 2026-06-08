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
      error: 'UNAUTHORIZED',
      message: 'Token tidak ditemukan atau format salah'
    });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    // Note: In real app, secret should match what Central-Bank/Wallet uses
    const secret = process.env.JWT_SECRET || 'supersecret-cbdc-smartbank-wallet-key-2026';
    const decoded = jwt.verify(token, secret);
    
    // Pass user info to downstream via headers
    req.headers['x-user-id'] = decoded.userId || decoded.sub;
    req.headers['x-user-role'] = decoded.role;
    
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Token invalid atau expired'
    });
  }
};
