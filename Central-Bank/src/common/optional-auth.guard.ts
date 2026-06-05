import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';
import { AppError } from './app-error';
import { ErrorCode } from './error-codes';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const req = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const header = req.header('authorization');
    if (!header) {
      if (isPublic) return true;
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Authorization token wajib dikirim');
    }
    const [, token] = header.split(' ');
    try {
      req.user = this.jwt.verify(token);
      return true;
    } catch {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Token tidak valid');
    }
  }
}
