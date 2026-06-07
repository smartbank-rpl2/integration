import { responseHelper } from '../utils/response.js';

/**
 * Middleware untuk memvalidasi Role (RBAC).
 * Hanya memproses request jika role user (dari JWT/header) ada di dalam array allowedRoles.
 * @param {...string} allowedRoles - Role yang diizinkan, misalnya 'WALLET_USER', 'TELLER', 'MANAGER', 'CENTRAL_BANK_ADMIN'
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    // Role bisa didapat dari req.headers['x-user-role'] yang di-inject oleh API Gateway
    // atau dari req.user.role jika authMiddleware lokal mengekstraknya dari JWT.
    const userRole = req.headers['x-user-role'] || (req.user && req.user.role);

    if (!userRole) {
      return responseHelper.error(
        res,
        'FORBIDDEN',
        'Akses ditolak: Tidak ada role yang terdeteksi',
        403
      );
    }

    if (!allowedRoles.includes(userRole)) {
      return responseHelper.error(
        res,
        'FORBIDDEN',
        `Akses ditolak: Fitur ini tidak diizinkan untuk role ${userRole}`,
        403
      );
    }

    next();
  };
};
