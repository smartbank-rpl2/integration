import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser, RequestUser } from '../../common/current-user.decorator';
import { requireIdempotencyKey, requestHash, requestId } from '../../common/request-utils';
import { MoneyService } from '../money/money.service';
import { SettlementService } from '../settlement/settlement.service';
import { CreatePaymentRequestDto } from './dto';
import { Roles } from '../../common/roles.decorator';
import { UserRole } from '@prisma/client';
import { PaymentRequestService } from './payment-request.service';

@Controller('payment-requests')
@Roles(UserRole.WALLET_USER)
export class PaymentRequestsController {
  constructor(
    private readonly service: PaymentRequestService,
    private readonly settlement: SettlementService,
    private readonly money: MoneyService,
  ) {}

  @Post()
  create(@Body() dto: CreatePaymentRequestDto, @Req() req: Request, @CurrentUser() user: RequestUser) {
    return this.service.create({
      sourceApp: dto.source_app,
      payerWalletId: dto.payer_wallet_id,
      payeeWalletId: dto.payee_wallet_id,
      grossAmount: this.money.parse(dto.gross_amount),
      description: dto.description,
      metadata: dto.metadata,
      expiresAt: new Date(dto.expires_at),
      idempotency: {
        key: requireIdempotencyKey(req),
        route: 'POST /api/v1/payment-requests',
        actorId: user.sub,
        requestHash: requestHash(dto),
      },
    });
  }

  @Post(':id/pay')
  pay(@Param('id') id: string, @Req() req: Request, @CurrentUser() user: RequestUser) {
    return this.settlement.settlePaymentRequest({
      paymentRequestId: id,
      actorUserId: user.sub,
      requestId: requestId(req),
      idempotency: {
        key: requireIdempotencyKey(req),
        route: `POST /api/v1/payment-requests/${id}/pay`,
        actorId: user.sub,
        requestHash: requestHash({ id }),
      },
    });
  }
}
