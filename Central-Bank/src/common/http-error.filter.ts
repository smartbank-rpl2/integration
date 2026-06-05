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
    const message =
      typeof typed.message === 'string'
        ? typed.message
        : exception instanceof Error
          ? exception.message
          : 'Terjadi kesalahan internal';

    response.status(status).json({
      success: false,
      data: null,
      error: {
        code,
        message,
        details: typed.details ?? {},
      },
      meta: {
        request_id: request.header('x-request-id') ?? randomUUID(),
        timestamp: new Date().toISOString(),
      },
    });
  }
}
