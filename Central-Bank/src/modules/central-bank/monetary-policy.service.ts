import { Injectable } from '@nestjs/common';
import { AppError } from '../../common/app-error';
import { ErrorCode } from '../../common/error-codes';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MonetaryPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async supply() {
    const totalSupply = BigInt(process.env.TOTAL_MONEY_SUPPLY ?? '1000000000');
    const reserve = await this.prisma.walletAccount.findUniqueOrThrow({ where: { accountCode: 'CENTRAL_RESERVE' } });
    const sink = await this.prisma.walletAccount.findUniqueOrThrow({ where: { accountCode: 'BURN_OR_SINK_ACCOUNT' } });
    const circulating = await this.prisma.walletAccount.aggregate({
      where: {
        accountCode: { notIn: ['CENTRAL_RESERVE', 'BURN_OR_SINK_ACCOUNT'] },
        status: { not: 'CLOSED' },
      },
      _sum: { availableBalance: true },
    });
    const circulatingSupply = circulating._sum.availableBalance ?? 0n;
    const invariantTotal = reserve.availableBalance + circulatingSupply + sink.availableBalance;
    const valid = invariantTotal === totalSupply && totalSupply <= 1000000000n;
    return {
      total_supply: totalSupply,
      reserve_balance: reserve.availableBalance,
      circulating_supply: circulatingSupply,
      sink_or_burn_accounting: sink.availableBalance,
      invariant_total: invariantTotal,
      invariant_valid: valid,
    };
  }

  async assertSupplyInvariant() {
    const report = await this.supply();
    if (!report.invariant_valid) {
      throw new AppError(ErrorCode.SUPPLY_INVARIANT_VIOLATION, 'Supply invariant tidak valid', report);
    }
    return report;
  }

  async ledger(filters: { accountId?: string; transactionId?: string; from?: string; to?: string }) {
    return this.prisma.ledgerEntry.findMany({
      where: {
        accountId: filters.accountId,
        transactionId: filters.transactionId,
        createdAt:
          filters.from || filters.to
            ? {
                gte: filters.from ? new Date(filters.from) : undefined,
                lte: filters.to ? new Date(filters.to) : undefined,
              }
            : undefined,
      },
      orderBy: [{ createdAt: 'desc' }, { entryNo: 'asc' }],
      take: 200,
    });
  }
}
