import { authService } from '../services/auth.service.js';
import { responseHelper } from '../utils/response.js';

export const authController = {
  
  // POST /api/v1/auth/register
  register: async (req, res, next) => {
    try {
      const { name, email, phone, password, pin, role } = req.body;

      if (typeof name !== 'string' || name.length > 120 || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 8 || password.length > 128 || !/^\d{6}$/.test(String(pin))) {
        return responseHelper.error(
          res, 
          'BAD_REQUEST', 
          'Data registrasi tidak valid. Gunakan email valid, password 8-128 karakter, dan PIN 6 digit.',
          400
        );
      }

      const result = await authService.register(name, email, phone, password, pin, role || 'RETAIL_CUSTOMER');
      console.log({ timestamp: new Date().toISOString(), request_id: req.id, user_id: result.userId, action: 'wallet_register_success', ip: req.ip });
      
      return responseHelper.success(res, result, 201);
    } catch (err) {
      console.warn({ timestamp: new Date().toISOString(), request_id: req.id, user_id: null, action: 'wallet_register_failed', ip: req.ip, error_type: err.name });
      next(err);
    }
  },

  // POST /api/v1/auth/login
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;

      if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length > 128) {
        return responseHelper.error(
          res, 
          'BAD_REQUEST', 
          'Email dan password wajib diisi', 
          400
        );
      }

      const result = await authService.login(email, password);
      console.log({ timestamp: new Date().toISOString(), request_id: req.id, user_id: result.user.id, action: 'wallet_login_success', ip: req.ip });
      
      return responseHelper.success(res, result, 200);
    } catch (err) {
      console.warn({ timestamp: new Date().toISOString(), request_id: req.id, user_id: null, action: 'wallet_login_failed', ip: req.ip, error_type: err.name });
      next(err);
    }
  }
};
