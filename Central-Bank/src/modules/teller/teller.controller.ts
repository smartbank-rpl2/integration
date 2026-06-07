import { Controller, Post, Body, Req } from '@nestjs/common';
import { TellerService } from './teller.service';
import { TellerActionDto, KycActionDto } from './dto';
import { Roles } from '../../common/roles.decorator';
import { UserRole } from '@prisma/client';
import { RequestUser, CurrentUser } from '../../common/current-user.decorator';
import { Request } from 'express';
import { requestId, requireIdempotencyKey } from '../../common/request-utils';
import { MoneyService } from '../money/money.service';

@Controller('teller')
@Roles(UserRole.TELLER, UserRole.MANAGER)
export class TellerController {
  constructor(
    private readonly teller: TellerService,
    private readonly money: MoneyService,
  ) {}

  @Post('kyc/verify')
  async verifyKyc(@Body() dto: KycActionDto) {
    return this.teller.verifyKyc(dto.userId);
  }

  @Post('top-up')
  async topUp(@Body() dto: TellerActionDto, @Req() req: Request, @CurrentUser() user: RequestUser) {
    return this.teller.topUp({
      userId: dto.userId,
      amount: this.money.parse(dto.amount),
      actorUserId: user.sub,
      requestId: requestId(req),
      idempotencyKey: requireIdempotencyKey(req),
    });
  }

  @Post('withdraw')
  async withdraw(@Body() dto: TellerActionDto, @Req() req: Request, @CurrentUser() user: RequestUser) {
    return this.teller.withdraw({
      userId: dto.userId,
      amount: this.money.parse(dto.amount),
      actorUserId: user.sub,
      requestId: requestId(req),
      idempotencyKey: requireIdempotencyKey(req),
    });
  }
}
