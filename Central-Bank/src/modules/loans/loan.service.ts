import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { MoneyService } from '../money/money.service';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { Prisma } from '@prisma/client';
import { AppError } from '../../common/app-error';
import { ErrorCode } from '../../common/error-codes';

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value, (_key, current) => (typeof current === 'bigint' ? current.toString() : current)));
}

@Injectable()
export class LoanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly money: MoneyService,
    private readonly idempotency: IdempotencyService,
  ) {}

  getLoan(id: string) {
    return this.prisma.loan.findUniqueOrThrow({ where: { id } });
  }

  async applyLoan(input: {
    borrowerWalletId: string;
    amount: bigint;
    idempotency: { key: string; route: string; actorId: string; requestHash: string };
  }) {
    this.money.assertPositive(input.amount);
    if (input.amount > 100000n) throw new AppError(ErrorCode.LOAN_LIMIT_EXCEEDED, 'Limit pinjaman maksimal 100000');

    return this.prisma.$transaction(async (tx) => {
      const idem = await this.idempotency.start(tx, input.idempotency);
      if (idem.replay) return idem.response;

      const wallet = await tx.walletAccount.findUnique({
        where: { id: input.borrowerWalletId },
        include: { user: true },
      });
      if (!wallet?.user) throw new AppError(ErrorCode.VALIDATION_ERROR, 'Wallet peminjam tidak valid');
      if (wallet.user.kycTier !== 'VERIFIED') {
        throw new AppError(
          ErrorCode.FORBIDDEN,
          'Pengajuan pinjaman hanya tersedia untuk nasabah yang sudah terverifikasi KYC.',
        );
      }

      const outstanding = await tx.loan.aggregate({
        where: { borrowerWalletId: input.borrowerWalletId, status: { in: ['PENDING', 'DISBURSED', 'PARTIAL_PAID'] } },
        _sum: { principal: true, paidAmount: true },
      });

      const currentOutstanding = (outstanding._sum.principal ?? 0n) - (outstanding._sum.paidAmount ?? 0n);
      if (currentOutstanding + input.amount > 100000n) {
        throw new AppError(ErrorCode.LOAN_LIMIT_EXCEEDED, 'Outstanding loan melebihi limit');
      }

      const interest = this.money.tenPercent(input.amount);
      const totalDue = input.amount + interest;
      const loanId = randomUUID();

      await tx.loan.create({
        data: {
          id: loanId,
          borrowerWalletId: input.borrowerWalletId,
          principal: input.amount,
          interestAmount: interest,
          totalDue,
          paidAmount: 0n,
          status: 'PENDING',
        },
      });

      const response = {
        loan_id: loanId,
        principal: input.amount,
        interest_amount: interest,
        total_due: totalDue,
        status: 'PENDING',
      };
      await this.idempotency.complete(tx, { ...input.idempotency, responseBody: asJson(response) });
      return response;
    });
  }
}
