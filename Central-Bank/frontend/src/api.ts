export type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  error: null | {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
  meta: {
    request_id: string;
    timestamp: string;
  };
};

export type ApiResult<T = unknown> = {
  ok: boolean;
  status: number;
  envelope: ApiEnvelope<T>;
};

const DEFAULT_API_BASE_URL = 'http://localhost:3000/api/v1';

export function apiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
}

export function newRequestId() {
  return crypto.randomUUID();
}

export function newIdempotencyKey(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST';
    token?: string | null;
    body?: unknown;
    idempotencyKey?: string;
    requestId?: string;
  } = {},
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Request-Id': options.requestId ?? newRequestId(),
  };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

  const response = await fetch(`${apiBaseUrl()}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const envelope = (await response.json()) as ApiEnvelope<T>;
  return { ok: response.ok && envelope.success, status: response.status, envelope };
}

export function decodeJwtUser(token: string | null) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { sub: string; email: string; role: string };
    return payload;
  } catch {
    return null;
  }
}

export function formatAmount(value?: string | number | null) {
  if (value === undefined || value === null || value === '') return '0';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return new Intl.NumberFormat('id-ID').format(numeric);
}
