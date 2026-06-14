import { responseHelper } from '../utils/response.js';

/**
 * Middleware RBAC.
 *
 * Aturan keamanan:
 * - Source of truth untuk role adalah `req.user.role` yang berasal dari JWT terverifikasi oleh `authMiddleware`.
 * - Header `x-user-role` dari client atau gateway TIDAK dipercaya untuk authorization.
 *   Header tersebut hanya boleh dipakai untuk logging/audit, bukan untuk keputusan akses.
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole) {
      return responseHelper.error(
        res,
        'FORBIDDEN',
        'Akses ditolak: Role tidak terverifikasi di token.',
        403
      );
    }

    if (!allowedRoles.includes(userRole)) {
      return responseHelper.error(
        res,
        'FORBIDDEN',
        'Akses ditolak: Anda tidak memiliki izin untuk fitur ini.',
        403
      );
    }

    next();
  };
};
