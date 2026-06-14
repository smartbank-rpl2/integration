import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { ErrorCode } from './error-codes';

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : {};
    const typed = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
    const code = typeof typed.code === 'string' ? typed.code : ErrorCode.DATABASE_TRANSACTION_FAILED;
    const isServerError = status >= HttpStatus.INTERNAL_SERVER_ERROR;
    const message = isServerError
      ? 'Terjadi kesalahan sistem internal'
      : typeof typed.message === 'string'
        ? typed.message
        : 'Permintaan tidak dapat diproses';

    if (isServerError) {
      console.error({
        timestamp: new Date().toISOString(),
        request_id: request.header('x-request-id') ?? 'missing-request-id',
        action: 'unhandled_central_bank_error',
        error_type: exception instanceof Error ? exception.name : typeof exception,
      });
    }

    response.status(status).json({
      success: false,
      data: null,
      error: {
        code,
        message,
        details: isServerError ? {} : (typed.details ?? {}),
      },
      meta: {
        request_id: request.header('x-request-id') ?? randomUUID(),
        timestamp: new Date().toISOString(),
      },
    });
  }
}
