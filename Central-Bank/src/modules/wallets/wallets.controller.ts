import { Controller, Get } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../../common/current-user.decorator';
import { WalletAccountService } from './wallet-account.service';
import { Roles } from '../../common/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('wallets/me')
@Roles(UserRole.WALLET_USER)
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
