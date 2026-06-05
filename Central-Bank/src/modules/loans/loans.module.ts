import { Module } from '@nestjs/common';
import { MoneyModule } from '../money/money.module';
import { SettlementModule } from '../settlement/settlement.module';
import { WalletsModule } from '../wallets/wallets.module';
import { LoansController } from './loans.controller';
import { LoanService } from './loan.service';

@Module({
  imports: [MoneyModule, SettlementModule, WalletsModule],
  controllers: [LoansController],
  providers: [LoanService],
  exports: [LoanService],
})
export class LoansModule {}
