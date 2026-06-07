import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { AppError } from '../../common/app-error';
import { ErrorCode } from '../../common/error-codes';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettlementService } from '../settlement/settlement.service';

function jsonSafe(value: unknown) {
  return JSON.parse(JSON.stringify(value, (_key, current) => (typeof current === 'bigint' ? current.toString() : current)));
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly settlement: SettlementService,
    private readonly idempotency: IdempotencyService,
  ) {}

  async register(input: {
    name: string;
    email: string;
    password: string;
    requestId: string;
    idempotencyKey: string;
    requestHash: string;
  }) {
    const passwordHash = await bcrypt.hash(input.password, 10);
    const userId = randomUUID();
    const walletId = randomUUID();
    const registerIdempotency = {
      key: input.idempotencyKey,
      route: 'POST /api/v1/auth/register',
      actorId: input.email,
      requestHash: input.requestHash,
    };
    const existingResponse = await this.prisma.$transaction(async (tx) => {
      const idem = await this.idempotency.start(tx, registerIdempotency);
      if (idem.replay) return idem.response;
      await tx.user.create({
        data: {
          id: userId,
          name: input.name,
          email: input.email,
          passwordHash,
          role: 'WALLET_USER',
        },
      });
      await tx.walletAccount.create({
        data: {
          id: walletId,
          userId,
          accountType: 'USER_WALLET',
          accountCode: `USER_${userId}`,
        },
      });
      return null;
    });
    if (existingResponse) return existingResponse;
    const distribution = await this.settlement.settleInitialDistribution({
      walletId,
      actorUserId: userId,
      requestId: input.requestId,
      idempotency: {
        key: input.idempotencyKey,
        route: 'INITIAL_DISTRIBUTION',
        actorId: userId,
        requestHash: input.requestHash,
      },
    });
    const response = {
      user_id: userId,
      wallet_id: walletId,
      initial_distribution: distribution,
    };
    await this.prisma.$transaction((tx) =>
      this.idempotency.complete(tx, {
        ...registerIdempotency,
        responseBody: jsonSafe(response) as never,
      }),
    );
    return response;
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        wallets: {
          where: { accountType: 'USER_WALLET' },
          select: { id: true }
        }
      }
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Email atau password salah');
    }
    const token = this.jwt.sign({ sub: user.id, email: user.email, role: user.role, name: user.name });
    return {
      access_token: token,
      expires_in: 3600,
      user_id: user.id,
      name: user.name,
      role: user.role,
      kyc_tier: user.kycTier,
      wallet_id: user.wallets[0]?.id || null,
    };
  }
}
