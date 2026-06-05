import { Controller, Get } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../../common/current-user.decorator';
import { WalletAccountService } from './wallet-account.service';

@Controller('wallets/me')
export class WalletsController {
  constructor(private readonly wallets: WalletAccountService) {}

  @Get('balance')
  balance(@CurrentUser() user: RequestUser) {
    return this.wallets.getBalance(user.sub);
  }

  @Get('transactions')
  transactions(@CurrentUser() user: RequestUser) {
    return this.wallets.getTransactions(user.sub);
  }
}
