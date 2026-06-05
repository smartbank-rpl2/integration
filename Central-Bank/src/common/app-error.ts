import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes';

const STATUS_BY_CODE: Partial<Record<ErrorCode, HttpStatus>> = {
  [ErrorCode.UNAUTHORIZED]: HttpStatus.UNAUTHORIZED,
  [ErrorCode.FORBIDDEN]: HttpStatus.FORBIDDEN,
  [ErrorCode.VALIDATION_ERROR]: HttpStatus.BAD_REQUEST,
  [ErrorCode.IDEMPOTENCY_KEY_REQUIRED]: HttpStatus.BAD_REQUEST,
  [ErrorCode.IDEMPOTENCY_CONFLICT]: HttpStatus.CONFLICT,
  [ErrorCode.INSUFFICIENT_BALANCE]: HttpStatus.BAD_REQUEST,
  [ErrorCode.ACCOUNT_FROZEN]: HttpStatus.FORBIDDEN,
  [ErrorCode.PAYMENT_REQUEST_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.INVALID_PAYMENT_STATUS]: HttpStatus.BAD_REQUEST,
  [ErrorCode.PAYMENT_EXPIRED]: HttpStatus.BAD_REQUEST,
  [ErrorCode.DAILY_LIMIT_EXCEEDED]: HttpStatus.TOO_MANY_REQUESTS,
  [ErrorCode.COOLDOWN_ACTIVE]: HttpStatus.TOO_MANY_REQUESTS,
  [ErrorCode.LEDGER_IMBALANCE]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCode.SUPPLY_INVARIANT_VIOLATION]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCode.LOAN_LIMIT_EXCEEDED]: HttpStatus.BAD_REQUEST,
  [ErrorCode.REVERSAL_NOT_ALLOWED]: HttpStatus.BAD_REQUEST,
  [ErrorCode.DATABASE_TRANSACTION_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCode.DEADLOCK_RETRY_EXCEEDED]: HttpStatus.CONFLICT,
};

export class AppError extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super({ code, message, details }, STATUS_BY_CODE[code] ?? HttpStatus.BAD_REQUEST);
  }
}
