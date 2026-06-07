import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { CentralBankModule } from './modules/central-bank/central-bank.module';
import { FeesModule } from './modules/fees/fees.module';
import { HealthModule } from './modules/health/health.module';
import { IdempotencyModule } from './modules/idempotency/idempotency.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { LoansModule } from './modules/loans/loans.module';
import { MoneyModule } from './modules/money/money.module';
import { PaymentRequestsModule } from './modules/payment-requests/payment-requests.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { SettlementModule } from './modules/settlement/settlement.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { OptionalAuthGuard } from './common/optional-auth.guard';
import { RolesGuard } from './common/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    MoneyModule,
    AuditModule,
    LedgerModule,
    FeesModule,
    IdempotencyModule,
    SettlementModule,
    AuthModule,
    WalletsModule,
    PaymentRequestsModule,
    LoansModule,
    CentralBankModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: OptionalAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
