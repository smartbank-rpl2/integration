import { ApiError } from '../api/client';
import type { ApiResult } from '../api/types';

function isApiResult(error: unknown): error is ApiResult {
  return Boolean(error && typeof error === 'object' && 'ok' in error && 'envelope' in error);
}

export function getErrorMessage(error: unknown): string {
  if (isApiResult(error)) {
    const code = error.envelope.error?.code;
    const message = error.envelope.error?.message;
    if (code === 'COOLDOWN_ACTIVE') {
      return 'Cooldown transaksi masih aktif. Tunggu beberapa detik sebelum mencoba lagi.';
    }
    if (code === 'DAILY_LIMIT_EXCEEDED') {
      return 'Limit transaksi harian sudah tercapai.';
    }
    if (code === 'INSUFFICIENT_BALANCE') {
      return 'Saldo tidak mencukupi untuk transaksi ini.';
    }
    if (code === 'IDEMPOTENCY_CONFLICT') {
      return 'Idempotency key pernah dipakai dengan payload berbeda. Gunakan request baru.';
    }
    return message || 'Request gagal diproses.';
  }

  if (error instanceof ApiError) {
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      return 'You are performing actions too quickly. Please wait 10 seconds before trying again.';
    }
    if (error.code === 'DAILY_LIMIT_EXCEEDED') {
      return 'You have reached the maximum allowed transactions for today.';
    }
    if (error.code === 'INSUFFICIENT_BALANCE') {
      return 'Saldo tidak mencukupi untuk transaksi ini.';
    }
    return error.message || 'An error occurred while processing your request.';
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred.';
}
