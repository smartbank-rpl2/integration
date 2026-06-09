import { Module } from '@nestjs/common';
import { ManagerController } from './manager.controller';
import { ManagerService } from './manager.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SettlementModule } from '../settlement/settlement.module';
import { WalletsModule } from '../wallets/wallets.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, SettlementModule, WalletsModule, AuditModule],
  controllers: [ManagerController],
  providers: [ManagerService],
})
export class ManagerModule {}
