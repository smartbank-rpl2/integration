import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettlementService } from '../settlement/settlement.service';
import { AppError } from '../../common/app-error';
import { ErrorCode } from '../../common/error-codes';
import { WalletAccountService } from '../wallets/wallet-account.service';
import { AccountStatus, UserStatus } from '@prisma/client';
import { AuditLogService } from '../audit/audit-log.service';

@Injectable()
export class ManagerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settlement: SettlementService,
    private readonly wallets: WalletAccountService,
    private readonly audit: AuditLogService,
  ) {}

  async suspendUser(input: {
    userId: string;
    actorUserId: string;
    requestId: string;
    reasonCode?: string;
  }) {
    const wallet = await this.wallets.getPrimaryWallet(input.userId);
    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: input.userId },
        data: { status: UserStatus.SUSPENDED },
      });
      const updated = await tx.walletAccount.update({
        where: { id: wallet.id },
        data: { status: AccountStatus.FROZEN },
      });
      await this.audit.record({
        tx,
        actorUserId: input.actorUserId,
        serviceName: 'centralbank-core',
        action: 'USER_WALLET_SUSPENDED',
        targetType: 'wallet',
        targetId: wallet.id,
        requestId: input.requestId,
        reasonCode: input.reasonCode ?? 'SUSPICIOUS_ACTIVITY',
        metadata: { user_id: input.userId },
      });
      return updated;
    });
  }

  async activateUser(input: {
    userId: string;
    actorUserId: string;
    requestId: string;
    reasonCode?: string;
  }) {
    const wallet = await this.wallets.getPrimaryWallet(input.userId);
    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: input.userId },
        data: { status: UserStatus.ACTIVE },
      });
      const updated = await tx.walletAccount.update({
        where: { id: wallet.id },
        data: { status: AccountStatus.ACTIVE },
      });
      await this.audit.record({
        tx,
        actorUserId: input.actorUserId,
        serviceName: 'centralbank-core',
        action: 'USER_WALLET_ACTIVATED',
        targetType: 'wallet',
        targetId: wallet.id,
        requestId: input.requestId,
        reasonCode: input.reasonCode ?? 'ACCOUNT_REACTIVATED',
        metadata: { user_id: input.userId },
      });
      return updated;
    });
  }

  async approveLoan(input: {
    loanId: string;
    actorUserId: string;
    requestId: string;
    idempotencyKey: string;
    reasonCode?: string;
  }) {
    return this.settlement.settleLoanApproval({
      loanId: input.loanId,
      actorUserId: input.actorUserId,
      requestId: input.requestId,
      reasonCode: input.reasonCode,
      idempotency: {
        key: input.idempotencyKey,
        route: 'POST /api/v1/manager/loans/approve',
        actorId: input.actorUserId,
        requestHash: input.loanId,
      },
    });
  }

  async listPendingLoans() {
    const loans = await this.prisma.loan.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: {
        borrowerWallet: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                kycTier: true,
                status: true,
                identityDocumentType: true,
                identityDocumentNumber: true,
                identityDocumentName: true,
                identityDocumentUploadedAt: true,
              },
            },
          },
        },
      },
    });

    return loans.map((loan) => ({
      id: loan.id,
      borrower_wallet_id: loan.borrowerWalletId,
      principal: loan.principal,
      interest_amount: loan.interestAmount,
      total_due: loan.totalDue,
      paid_amount: loan.paidAmount,
      status: loan.status,
      created_at: loan.createdAt,
      borrower: loan.borrowerWallet.user,
      wallet: {
        id: loan.borrowerWallet.id,
        available_balance: loan.borrowerWallet.availableBalance,
        status: loan.borrowerWallet.status,
      },
    }));
  }

  async rejectLoan(input: {
    loanId: string;
    actorUserId: string;
    requestId: string;
    reasonCode?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({ where: { id: input.loanId } });
      if (!loan) throw new AppError(ErrorCode.VALIDATION_ERROR, 'Loan tidak ditemukan');
      if (loan.status !== 'PENDING') throw new AppError(ErrorCode.VALIDATION_ERROR, 'Loan tidak dalam status PENDING');

      const updated = await tx.loan.update({
        where: { id: input.loanId },
        data: { status: 'REJECTED' },
      });
      await this.audit.record({
        tx,
        actorUserId: input.actorUserId,
        serviceName: 'centralbank-core',
        action: 'LOAN_REJECTED',
        targetType: 'loan',
        targetId: input.loanId,
        requestId: input.requestId,
        reasonCode: input.reasonCode ?? 'LOAN_REJECTED',
      });
      return updated;
    });
  }
}
