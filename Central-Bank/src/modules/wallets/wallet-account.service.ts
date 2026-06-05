import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalletAccountService {
  constructor(private readonly prisma: PrismaService) {}

  async getPrimaryWallet(userId: string) {
    return this.prisma.walletAccount.findFirstOrThrow({
      where: { userId, accountType: { in: ['USER_WALLET', 'MERCHANT_WALLET'] } },
    });
  }

  async getBalance(userId: string) {
    const wallet = await this.getPrimaryWallet(userId);
    return {
      wallet_id: wallet.id,
      currency: wallet.currency,
      available_balance: wallet.availableBalance,
      hold_balance: wallet.holdBalance,
    };
  }

  async getTransactions(userId: string) {
    const wallet = await this.getPrimaryWallet(userId);
    const transactions = await this.prisma.transaction.findMany({
      where: { OR: [{ payerWalletId: wallet.id }, { payeeWalletId: wallet.id }] },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return transactions.map((transaction) => ({
      transaction_id: transaction.id,
      transaction_type: transaction.transactionType,
      status: transaction.status,
      source_app: transaction.sourceApp,
      gross_amount: transaction.grossAmount,
      total_debit: transaction.totalDebit,
      fee_total: transaction.feeTotal,
      tax_total: transaction.taxTotal,
      created_at: transaction.createdAt,
      settled_at: transaction.settledAt,
      direction: transaction.payerWalletId === wallet.id ? 'OUT' : 'IN',
    }));
  }
}
