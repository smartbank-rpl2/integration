import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser, RequestUser } from '../../common/current-user.decorator';
import { requireIdempotencyKey, requestHash, requestId } from '../../common/request-utils';
import { SettlementService } from '../settlement/settlement.service';
import { Roles } from '../../common/roles.decorator';
import { UserRole } from '@prisma/client';
import { ReversalDto } from './dto';
import { MonetaryPolicyService } from './monetary-policy.service';

@Controller('central-bank')
@Roles(UserRole.CENTRAL_BANK_ADMIN)
export class CentralBankController {
  constructor(
    private readonly monetary: MonetaryPolicyService,
    private readonly settlement: SettlementService,
  ) {}

  @Get('supply')
  supply() {
    return this.monetary.assertSupplyInvariant();
  }

  @Get('ledger')
  ledger(
    @Query('account_id') accountId?: string,
    @Query('transaction_id') transactionId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.monetary.ledger({ accountId, transactionId, from, to });
  }

  @Post('reversals')
  reversal(@Body() dto: ReversalDto, @Req() req: Request, @CurrentUser() user: RequestUser) {
    return this.settlement.reverseTransaction({
      originalTransactionId: dto.original_transaction_id,
      reasonCode: dto.reason_code,
      actorUserId: user.sub,
      requestId: requestId(req),
      idempotency: {
        key: requireIdempotencyKey(req),
        route: 'POST /api/v1/central-bank/reversals',
        actorId: user.sub,
        requestHash: requestHash(dto),
      },
    });
  }
}
