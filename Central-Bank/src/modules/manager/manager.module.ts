import { Module } from '@nestjs/common';
import { ManagerController } from './manager.controller';
import { ManagerService } from './manager.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SettlementModule } from '../settlement/settlement.module';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [PrismaModule, SettlementModule, WalletsModule],
  controllers: [ManagerController],
  providers: [ManagerService],
})
export class ManagerModule {}
