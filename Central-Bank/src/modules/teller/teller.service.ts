import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettlementService } from '../settlement/settlement.service';
import { AppError } from '../../common/app-error';
import { ErrorCode } from '../../common/error-codes';
import { WalletAccountService } from '../wallets/wallet-account.service';
import { MoneyService } from '../money/money.service';
import { AuditLogService } from '../audit/audit-log.service';

@Injectable()
export class TellerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settlement: SettlementService,
    private readonly wallets: WalletAccountService,
    private readonly money: MoneyService,
    private readonly audit: AuditLogService,
  ) {}

  async verifyKyc(input: {
    userId: string;
    actorUserId: string;
    requestId: string;
    reasonCode?: string;
  }) {
    const user = await this.prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) throw new AppError(ErrorCode.VALIDATION_ERROR, 'User tidak ditemukan');
    if (!user.identityDocumentDataUrl || !user.identityDocumentNumber || !user.identityDocumentType) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Dokumen identitas nasabah belum diunggah. Teller wajib memeriksa dokumen sebelum verifikasi KYC.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: input.userId },
        data: { kycTier: 'VERIFIED' },
      });
      await this.audit.record({
        tx,
        actorUserId: input.actorUserId,
        serviceName: 'centralbank-core',
        action: 'KYC_VERIFIED',
        targetType: 'user',
        targetId: input.userId,
        requestId: input.requestId,
        reasonCode: input.reasonCode ?? 'KYC_VERIFIED',
        metadata: {
          document_type: user.identityDocumentType,
          document_number: user.identityDocumentNumber,
          document_name: user.identityDocumentName,
        },
      });
      return updated;
    });
  }

  async findCustomer(query: string) {
    if (!query || query.length > 191) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Query pencarian tidak boleh kosong');
    }

    // Allow partial email match (contains) OR exact id/phone match
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { id: query },
          { email: { contains: query } },
          { phone: query }
        ]
      },
      include: {
        wallets: {
          where: {
            accountType: 'USER_WALLET'
          }
        }
      }
    });
    if (!user) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Nasabah tidak ditemukan');
    }

    // Sanitize: strip sensitive fields before returning
    const { passwordHash: _pw, pinHash: _pin, ...safeUser } = user as any;
    return {
      ...safeUser,
      wallets: user.wallets.map((w) => ({
        id: w.id,
        accountType: w.accountType,
        currency: w.currency,
        availableBalance: Number(w.availableBalance),
        holdBalance: Number(w.holdBalance),
        status: w.status,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      })),
    };
  }

  async topUp(input: {
    userId: string;
    amount: bigint;
    actorUserId: string;
    requestId: string;
    idempotencyKey: string;
    reasonCode?: string;
  }) {
    this.money.assertPositive(input.amount);
    const wallet = await this.wallets.getPrimaryWallet(input.userId);
    
    return this.settlement.settleTopUp({
      walletId: wallet.id,
      amount: input.amount,
      actorUserId: input.actorUserId,
      requestId: input.requestId,
      reasonCode: input.reasonCode,
      idempotency: {
        key: input.idempotencyKey,
        route: 'POST /api/v1/teller/top-up',
        actorId: input.actorUserId,
        requestHash: `${input.userId}-${input.amount.toString()}`,
      },
    });
  }

  async withdraw(input: {
    userId: string;
    amount: bigint;
    actorUserId: string;
    requestId: string;
    idempotencyKey: string;
    reasonCode?: string;
  }) {
    this.money.assertPositive(input.amount);
    const wallet = await this.wallets.getPrimaryWallet(input.userId);
    
    return this.settlement.settleWithdrawal({
      walletId: wallet.id,
      amount: input.amount,
      actorUserId: input.actorUserId,
      requestId: input.requestId,
      reasonCode: input.reasonCode,
      idempotency: {
        key: input.idempotencyKey,
        route: 'POST /api/v1/teller/withdraw',
        actorId: input.actorUserId,
        requestHash: `${input.userId}-${input.amount.toString()}`,
      },
    });
  }
}
