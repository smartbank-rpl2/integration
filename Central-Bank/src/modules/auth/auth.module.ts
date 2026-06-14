import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuditModule } from '../audit/audit.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { SettlementModule } from '../settlement/settlement.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) throw new Error('JWT_SECRET environment variable is required');
        return {
          secret,
          signOptions: {
            expiresIn: '1h',
            issuer: config.get<string>('JWT_ISSUER') || 'smartbank',
            audience: config.get<string>('JWT_AUDIENCE') || 'smartbank-clients',
          },
          verifyOptions: {
            issuer: config.get<string>('JWT_ISSUER') || 'smartbank',
            audience: config.get<string>('JWT_AUDIENCE') || 'smartbank-clients',
          },
        };
      },
    }),
    AuditModule,
    IdempotencyModule,
    SettlementModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule, AuthService],
})
export class AuthModule {}
