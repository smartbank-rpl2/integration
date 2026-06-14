import { createHash } from 'crypto';
import { Request } from 'express';
import { AppError } from './app-error';
import { ErrorCode } from './error-codes';

export function requireIdempotencyKey(req: Request): string {
  const key = req.header('idempotency-key');
  if (!key) throw new AppError(ErrorCode.IDEMPOTENCY_KEY_REQUIRED, 'Header Idempotency-Key wajib dikirim');
  return key;
}

export function requestHash(body: unknown): string {
  return createHash('sha256').update(JSON.stringify(body ?? {})).digest('hex');
}

export function requestId(req: Request): string {
  return (req as Request & { id?: string }).id ?? req.header('x-request-id') ?? 'missing-request-id';
}
