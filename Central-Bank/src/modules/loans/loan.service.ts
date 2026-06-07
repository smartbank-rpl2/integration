import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { MoneyService } from '../money/money.service';

@Injectable()
export class LoanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly money: MoneyService,
  ) {}

  getLoan(id: string) {
    return this.prisma.loan.findUniqueOrThrow({ where: { id } });
  }

  async applyLoan(borrowerWalletId: string, amount: bigint) {
    this.money.assertPositive(amount);
    if (amount > 100000n) throw new Error('Limit pinjaman maksimal 100000');
    
    const outstanding = await this.prisma.loan.aggregate({
      where: { borrowerWalletId, status: { in: ['PENDING', 'DISBURSED', 'PARTIAL_PAID'] } },
      _sum: { principal: true, paidAmount: true },
    });
    
    const currentOutstanding = (outstanding._sum.principal ?? 0n) - (outstanding._sum.paidAmount ?? 0n);
    if (currentOutstanding + amount > 100000n) {
      throw new Error('Outstanding loan melebihi limit');
    }

    const interest = this.money.tenPercent(amount);
    const totalDue = amount + interest;
    const loanId = randomUUID();

    await this.prisma.loan.create({
      data: {
        id: loanId,
        borrowerWalletId,
        principal: amount,
        interestAmount: interest,
        totalDue,
        paidAmount: 0n,
        status: 'PENDING',
      },
    });

    return {
      loan_id: loanId,
      principal: amount,
      interest_amount: interest,
      total_due: totalDue,
      status: 'PENDING',
    };
  }
}
