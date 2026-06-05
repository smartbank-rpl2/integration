import { env } from '../config/env';
import type { ApiEnvelope, ApiResult } from './types';
import { getSessionToken, clearSession } from '../auth/session';
import { newRequestId } from '../lib/request-id';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  idempotencyKey?: string;
  requestId?: string;
  requireAuth?: boolean;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResult<T>> {
  const {
    method = 'GET',
    body,
    idempotencyKey,
    requestId = newRequestId(),
    requireAuth = true,
  } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Request-Id': requestId,
  };

  if (requireAuth) {
    const token = getSessionToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      // If auth is required but no token exists, we could redirect here or throw
      // For now, let the API return 401. But let's dispatch an event just in case.
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
  }

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  try {
    const response = await fetch(`${env.API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Handle 401 auto-logout
    if (response.status === 401) {
      clearSession();
      window.dispatchEvent(new Event('auth:unauthorized'));
    }

    let envelope: ApiEnvelope<T>;
    
    // Parse JSON
    try {
      envelope = await response.json() as ApiEnvelope<T>;
    } catch (parseError) {
      // Not valid JSON (e.g., 502 Bad Gateway html)
      throw new ApiError(response.status, 'INVALID_JSON_RESPONSE', 'Invalid response from server');
    }

    if (!response.ok || !envelope.success) {
      // Successful fetch but API returned an error envelope
      throw new ApiError(
        response.status,
        envelope.error?.code || 'UNKNOWN_ERROR',
        envelope.error?.message || 'An unknown error occurred',
        envelope.error?.details
      );
    }

    return {
      ok: true,
      status: response.status,
      envelope,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      // Re-throw standardized API errors
      return {
        ok: false,
        status: error.status,
        envelope: {
          success: false,
          data: null,
          error: {
            code: error.code,
            message: error.message,
            details: error.details || {},
          },
          meta: { request_id: requestId, timestamp: new Date().toISOString() },
        },
      };
    }

    // Network errors (e.g. CORS, offline)
    const fallback: ApiResult<T> = {
      ok: false,
      status: 0,
      envelope: {
        success: false,
        data: null,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network request failed',
          details: {},
        },
        meta: { request_id: requestId, timestamp: new Date().toISOString() },
      },
    };
    return fallback;
  }
}

export const client = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) => 
    apiRequest<T>(path, { ...options, method: 'GET' }),
    
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) => 
    apiRequest<T>(path, { ...options, method: 'POST', body }),
    
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) => 
    apiRequest<T>(path, { ...options, method: 'PUT', body }),
    
  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) => 
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
};
