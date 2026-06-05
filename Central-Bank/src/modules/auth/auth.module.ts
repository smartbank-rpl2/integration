import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { SettlementModule } from '../settlement/settlement.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'development-secret',
      signOptions: { expiresIn: '1h' },
    }),
    IdempotencyModule,
    SettlementModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule, AuthService],
})
export class AuthModule {}
