import { Body, Controller, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../../common/public.decorator';
import { requireIdempotencyKey, requestHash, requestId } from '../../common/request-utils';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.auth.register({
      ...dto,
      requestId: requestId(req),
      idempotencyKey: requireIdempotencyKey(req),
      requestHash: requestHash(dto),
      ip: req.ip ?? req.socket.remoteAddress ?? 'unknown',
    });
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto.email, dto.password, requestId(req), req.ip ?? req.socket.remoteAddress ?? 'unknown');
  }
}
