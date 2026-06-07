import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettlementService } from '../settlement/settlement.service';
import { AppError } from '../../common/app-error';
import { ErrorCode } from '../../common/error-codes';
import { WalletAccountService } from '../wallets/wallet-account.service';
import { AccountStatus } from '@prisma/client';

@Injectable()
export class ManagerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settlement: SettlementService,
    private readonly wallets: WalletAccountService,
  ) {}

  async suspendUser(userId: string) {
    const wallet = await this.wallets.getPrimaryWallet(userId);
    return this.prisma.walletAccount.update({
      where: { id: wallet.id },
      data: { status: AccountStatus.FROZEN },
    });
  }

  async activateUser(userId: string) {
    const wallet = await this.wallets.getPrimaryWallet(userId);
    return this.prisma.walletAccount.update({
      where: { id: wallet.id },
      data: { status: AccountStatus.ACTIVE },
    });
  }

  async approveLoan(input: {
    loanId: string;
    actorUserId: string;
    requestId: string;
    idempotencyKey: string;
  }) {
    return this.settlement.settleLoanApproval({
      loanId: input.loanId,
      actorUserId: input.actorUserId,
      requestId: input.requestId,
      idempotency: {
        key: input.idempotencyKey,
        route: 'POST /api/v1/manager/loans/approve',
        actorId: input.actorUserId,
        requestHash: input.loanId,
      },
    });
  }

  async rejectLoan(loanId: string) {
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) throw new AppError(ErrorCode.VALIDATION_ERROR, 'Loan tidak ditemukan');
    if (loan.status !== 'PENDING') throw new AppError(ErrorCode.VALIDATION_ERROR, 'Loan tidak dalam status PENDING');

    return this.prisma.loan.update({
      where: { id: loanId },
      data: { status: 'REJECTED' },
    });
  }
}
