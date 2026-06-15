import crypto from 'crypto';
import { db } from '../config/database.js';

/**
 * Idempotency Middleware
 *
 * Guarantees that the same Idempotency-Key + request payload combination
 * executes exactly ONCE. Replays with a different payload are REJECTED.
 *
 * Flow:
 *  1. Lookup existing key → if found & payload matches → return cached response
 *  2. If found & payload MISMATCHES → REJECT (replay attack prevention)
 *  3. If not found → INSERT a PROCESSING record (acts as a lock via UNIQUE constraint)
 *     - On duplicate key error from race: re-query and return cached response
 *  4. Proceed to handler which calls res.json()
 *  5. Intercepted res.json() updates the PROCESSING record to COMPLETED
 */
export const idempotencyMiddleware = async (req, res, next) => {
  const key = req.headers['idempotency-key'];
  const requestId = req.id || req.headers['x-request-id'] || 'req_unknown';

  if (typeof key !== 'string' || !/^[A-Za-z0-9._:-]{8,191}$/.test(key)) {
    return res.status(400).json({
      success: false,
      data: null,
      error: {
        code: 'BAD_REQUEST',
        message: 'Header Idempotency-Key wajib disertakan untuk transaksi finansial guna mencegah double-spending',
        details: {},
      },
      meta: { request_id: requestId, timestamp: new Date().toISOString() },
    });
  }

  // Compute request payload hash for replay validation
  const payloadString = JSON.stringify(req.body || {});
  const hashPayload = crypto.createHash('sha256').update(payloadString).digest('hex');
  const clientId = req.user?.userId || 'anonymous';
  const route = req.originalUrl || req.path;

  try {
    // Step 1: Check if key already exists
    const existing = await db.query(
      'SELECT * FROM idempotency_keys WHERE idempotency_key = ?',
      [key]
    );

    if (existing.rowCount > 0) {
      const cached = existing.rows[0];

      // Step 2: Reject replay if payload hash differs (prevents same-key-different-request attack)
      if (cached.request_hash !== hashPayload) {
        return res.status(409).json({
          success: false,
          data: null,
          error: {
            code: 'IDEMPOTENCY_CONFLICT',
            message: 'Idempotency-Key sudah digunakan dengan payload yang berbeda. Penolakan untuk menghindari inkonsistensi.',
            details: {},
          },
          meta: { request_id: requestId, timestamp: new Date().toISOString() },
        });
      }

      // Step 3: Same key + same payload → return cached response
      let wrapper;
      try {
        wrapper = typeof cached.response_body === 'string'
          ? JSON.parse(cached.response_body)
          : cached.response_body;
      } catch {
        wrapper = { statusCode: 200, body: cached.response_body };
      }

      const responseCode = wrapper?.statusCode || 200;
      const responseBody = wrapper?.body || cached.response_body;

      return res.status(responseCode).json({
        ...responseBody,
        meta: {
          ...(responseBody.meta || {}),
          request_id: requestId,
          idempotency_cached: true,
          idempotency_cached_at: cached.created_at,
        },
      });
    }

    // Step 4: Key not found → try to acquire lock via INSERT
    // The UNIQUE constraint on idempotency_key makes this atomic:
    // if two concurrent requests race, the second gets a duplicate-key error
    try {
      await db.query(
        `INSERT INTO idempotency_keys
          (id, idempotency_key, route, actor_id, request_hash, response_body, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(), key, route, clientId, hashPayload,
          JSON.stringify({ statusCode: 0, body: null }),
          'PROCESSING', new Date(), new Date(),
        ]
      );
    } catch (insertErr) {
      if (insertErr.code === 'ER_DUP_ENTRY') {
        // Another request won the race — re-query and return its cached response
        const raced = await db.query(
          'SELECT * FROM idempotency_keys WHERE idempotency_key = ?',
          [key]
        );
        if (raced.rowCount > 0) {
          const cached = raced.rows[0];
          let wrapper;
          try {
            wrapper = typeof cached.response_body === 'string'
              ? JSON.parse(cached.response_body)
              : cached.response_body;
          } catch {
            wrapper = { statusCode: 200, body: cached.response_body };
          }
          const responseCode = wrapper?.statusCode || 200;
          const responseBody = wrapper?.body || cached.response_body;
          return res.status(responseCode).json({
            ...responseBody,
            meta: {
              ...(responseBody.meta || {}),
              request_id: requestId,
              idempotency_cached: true,
              idempotency_raced: true,
            },
          });
        }
      }
      throw insertErr; // Unexpected error — propagate
    }

    // Step 5: Wrap res.json() to save response on completion
    // Use promise + finally to guarantee UPDATE even if serialization throws.
    // This eliminates the race where PROCESSING lock stuck on partial failures.
    const originalJson = res.json.bind(res);
    let capturedBody = null;
    res.json = function (body) {
      capturedBody = body;
      return originalJson(body);
    };

    // settled only when stream is fully flushed — covers success AND error path
    const finalize = (statusOverride) => {
      const code = statusOverride ?? res.statusCode;
      if (code >= 500) return; // don't cache 5xx

      const wrapper = { statusCode: code, body: capturedBody };
      db.query(
        `UPDATE idempotency_keys
           SET response_body = ?, status = 'COMPLETED', updated_at = ?
         WHERE idempotency_key = ? AND status = 'PROCESSING'`,
        [JSON.stringify(wrapper), new Date(), key]
      ).catch((err) => console.error('⚠️ Gagal mengupdate idempotency record:', err.message));
    };

    res.on('finish', () => finalize());
    res.on('close', () => {
      if (!res.writableEnded) finalize(); // stream aborted before finish
    });

    next();
  } catch (err) {
    console.error('❌ Idempotency middleware error:', err.message);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'IDEMPOTENCY_ERROR',
        message: 'Gagal memeriksa idempotency key',
        details: {},
      },
      meta: { request_id: requestId, timestamp: new Date().toISOString() },
    });
  }
};
