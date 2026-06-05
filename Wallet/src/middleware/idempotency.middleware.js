import crypto from 'crypto';
import { db } from '../config/database.js';

export const idempotencyMiddleware = async (req, res, next) => {
  const key = req.headers['idempotency-key'];
  const requestId = req.headers['x-request-id'] || 'req_unknown';

  if (!key) {
    return res.status(400).json({
      success: false,
      data: null,
      error: {
        code: 'BAD_REQUEST',
        message: 'Header Idempotency-Key wajib disertakan untuk transaksi finansial guna mencegah double-spending',
        details: {}
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString()
      }
    });
  }

  try {
    // 1. Check if the key already exists in local database/cache
    const result = await db.query('SELECT * FROM idempotency_keys WHERE idempotency_key = $1', [key]);
    
    if (result.rowCount > 0) {
      const cached = result.rows[0];
      let wrapper;
      try {
        wrapper = typeof cached.response_body === 'string' 
          ? JSON.parse(cached.response_body) 
          : cached.response_body;
      } catch (parseErr) {
        wrapper = { statusCode: 200, body: cached.response_body };
      }
      
      const responseCode = wrapper?.statusCode || 200;
      const responseBody = wrapper?.body || cached.response_body;
      
      // Check if we already returned a successful result or a conflict
      // If we match exactly, return the cached result
      return res.status(responseCode).json({
        ...responseBody,
        meta: {
          ...responseBody.meta,
          request_id: requestId,
          idempotency_cached: true,
          idempotency_cached_at: cached.created_at
        }
      });
    }

    // 2. Intercept the standard res.json to save the response upon completion of the request
    const originalJson = res.json;
    res.json = function (body) {
      res.json = originalJson; // restore original res.json

      // Only save keys for completed or client-side issues, not random 500 server crashes
      if (res.statusCode < 500) {
        const payloadString = JSON.stringify(req.body || {});
        const hashPayload = crypto.createHash('sha256').update(payloadString).digest('hex');
        const clientId = req.user?.userId || 'anonymous';
        
        const wrapper = {
          statusCode: res.statusCode,
          body: body
        };

        db.query(
          'INSERT INTO idempotency_keys (id, idempotency_key, route, actor_id, request_hash, response_body, status, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [crypto.randomUUID(), key, req.originalUrl || req.path, clientId, hashPayload, JSON.stringify(wrapper), 'COMPLETED', new Date()]
        ).catch(err => {
          console.error('⚠️ Gagal menyimpan kunci idempotensi:', err.message);
        });
      }

      return res.json(body);
    };

    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'IDEMPOTENCY_CONFLICT',
        message: 'Gagal memverifikasi keunikan kunci idempotensi transaksi',
        details: { original_error: err.message }
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString()
      }
    });
  }
};
