import { Module } from '@nestjs/common';
import { WalletAccountService } from './wallet-account.service';
import { WalletsController } from './wallets.controller';

@Module({
  controllers: [WalletsController],
  providers: [WalletAccountService],
  exports: [WalletAccountService],
})
export class WalletsModule {}
