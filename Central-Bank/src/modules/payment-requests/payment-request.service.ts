import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AppError } from '../../common/app-error';
import { ErrorCode } from '../../common/error-codes';
import { FeeQuoteService } from '../fees/fee-quote.service';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { MoneyService } from '../money/money.service';
import { PrismaService } from '../prisma/prisma.service';

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value, (_key, current) => (typeof current === 'bigint' ? current.toString() : current)));
}

@Injectable()
export class PaymentRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fees: FeeQuoteService,
    private readonly money: MoneyService,
    private readonly idempotency: IdempotencyService,
  ) {}

  async create(input: {
    sourceApp: string;
    payerWalletId: string;
    payeeWalletId: string;
    grossAmount: bigint;
    description: string;
    metadata?: Record<string, unknown>;
    expiresAt: Date;
    idempotency: { key: string; route: string; actorId: string; requestHash: string };
  }) {
    this.money.assertPositive(input.grossAmount);
    if (input.expiresAt.getTime() <= Date.now()) throw new AppError(ErrorCode.VALIDATION_ERROR, 'expires_at harus di masa depan');
    return this.prisma.$transaction(async (tx) => {
      const idem = await this.idempotency.start(tx, input.idempotency);
      if (idem.replay) return idem.response;
      await tx.walletAccount.findUniqueOrThrow({ where: { id: input.payerWalletId } });
      await tx.walletAccount.findUniqueOrThrow({ where: { id: input.payeeWalletId } });
      const quote = await this.fees.quote({ tx, sourceApp: input.sourceApp, amount: input.grossAmount });
      const id = randomUUID();
      await tx.paymentRequest.create({
        data: {
          id,
          sourceApp: input.sourceApp,
          payerWalletId: input.payerWalletId,
          payeeWalletId: input.payeeWalletId,
          grossAmount: input.grossAmount,
          amountDue: quote.totalDebit,
          status: 'PENDING',
          description: input.description,
          metadata: input.metadata ? asJson(input.metadata) : undefined,
          expiresAt: input.expiresAt,
        },
      });
      const response = {
        payment_request_id: id,
        status: 'PENDING',
        gross_amount: input.grossAmount,
        amount_due: quote.totalDebit,
        fee_total: quote.feeTotal,
        tax_total: quote.taxTotal,
      };
      await this.idempotency.complete(tx, { ...input.idempotency, responseBody: asJson(response) });
      return response;
    });
  }
}
