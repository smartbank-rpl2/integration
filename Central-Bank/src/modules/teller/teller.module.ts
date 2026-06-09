import { Module } from '@nestjs/common';
import { TellerController } from './teller.controller';
import { TellerService } from './teller.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SettlementModule } from '../settlement/settlement.module';
import { WalletsModule } from '../wallets/wallets.module';
import { MoneyModule } from '../money/money.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, SettlementModule, WalletsModule, MoneyModule, AuditModule],
  controllers: [TellerController],
  providers: [TellerService],
})
export class TellerModule {}
