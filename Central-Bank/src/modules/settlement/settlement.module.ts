import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FeesModule } from '../fees/fees.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { LedgerModule } from '../ledger/ledger.module';
import { MoneyModule } from '../money/money.module';
import { WalletsModule } from '../wallets/wallets.module';
import { SettlementService } from './settlement.service';
import { TransfersController } from './transfers.controller';

@Module({
  imports: [AuditModule, FeesModule, IdempotencyModule, LedgerModule, MoneyModule, WalletsModule],
  controllers: [TransfersController],
  providers: [SettlementService],
  exports: [SettlementService],
})
export class SettlementModule {}
