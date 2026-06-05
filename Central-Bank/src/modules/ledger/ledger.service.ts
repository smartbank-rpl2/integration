import { Injectable } from '@nestjs/common';
import { LedgerDirection, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AppError } from '../../common/app-error';
import { ErrorCode } from '../../common/error-codes';

export type LedgerPost = {
  accountId: string;
  direction: LedgerDirection;
  amount: bigint;
  description: string;
};

@Injectable()
export class LedgerService {
  validate(entries: LedgerPost[]) {
    if (entries.length < 2) throw new AppError(ErrorCode.LEDGER_IMBALANCE, 'Ledger wajib minimal dua entry');
    const debit = entries
      .filter((entry) => entry.direction === 'DEBIT')
      .reduce((sum, entry) => sum + entry.amount, 0n);
    const credit = entries
      .filter((entry) => entry.direction === 'CREDIT')
      .reduce((sum, entry) => sum + entry.amount, 0n);
    if (entries.some((entry) => entry.amount <= 0n)) {
      throw new AppError(ErrorCode.LEDGER_IMBALANCE, 'Semua ledger amount harus lebih besar dari 0');
    }
    if (debit !== credit) {
      throw new AppError(ErrorCode.LEDGER_IMBALANCE, 'Total debit dan credit ledger tidak balance');
    }
  }

  async post(
    tx: Prisma.TransactionClient,
    input: {
      transactionId: string;
      entries: Array<LedgerPost & { balanceAfter?: bigint }>;
    },
  ) {
    this.validate(input.entries);
    await tx.ledgerEntry.createMany({
      data: input.entries.map((entry, index) => ({
        id: randomUUID(),
        transactionId: input.transactionId,
        entryNo: index + 1,
        accountId: entry.accountId,
        direction: entry.direction,
        amount: entry.amount,
        balanceAfter: entry.balanceAfter,
        description: entry.description,
      })),
    });
  }
}
