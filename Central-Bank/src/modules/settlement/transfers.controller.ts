import { Body, Controller, Post, Req } from '@nestjs/common';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Request } from 'express';
import { CurrentUser, RequestUser } from '../../common/current-user.decorator';
import { requireIdempotencyKey, requestHash, requestId } from '../../common/request-utils';
import { Roles } from '../../common/roles.decorator';
import { UserRole } from '@prisma/client';
import { MoneyService } from '../money/money.service';
import { WalletAccountService } from '../wallets/wallet-account.service';
import { SettlementService } from './settlement.service';

class TransferDto {
  @IsNotEmpty()
  to_wallet_id!: string;

  @IsNotEmpty()
  amount!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

@Controller('transfers')
@Roles(UserRole.WALLET_USER)
export class TransfersController {
  constructor(
    private readonly settlement: SettlementService,
    private readonly wallets: WalletAccountService,
    private readonly money: MoneyService,
  ) {}

  @Post()
  async transfer(@Body() dto: TransferDto, @Req() req: Request, @CurrentUser() user: RequestUser) {
    const payerWallet = await this.wallets.getPrimaryWallet(user.sub);
    return this.settlement.settleTransfer({
      payerWalletId: payerWallet.id,
      payeeWalletId: dto.to_wallet_id,
      amount: this.money.parse(dto.amount),
      note: dto.note,
      actorUserId: user.sub,
      requestId: requestId(req),
      idempotency: {
        key: requireIdempotencyKey(req),
        route: 'POST /api/v1/transfers',
        actorId: user.sub,
        requestHash: requestHash(dto),
      },
    });
  }
}
