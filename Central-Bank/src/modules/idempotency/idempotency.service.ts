import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AppError } from '../../common/app-error';
import { ErrorCode } from '../../common/error-codes';

@Injectable()
export class IdempotencyService {
  async start(
    tx: Prisma.TransactionClient,
    input: { key: string; route: string; actorId: string; requestHash: string },
  ): Promise<{ replay: false } | { replay: true; response: unknown }> {
    const existing = await tx.idempotencyKey.findUnique({
      where: {
        idempotencyKey_route_actorId: {
          idempotencyKey: input.key,
          route: input.route,
          actorId: input.actorId,
        },
      },
    });
    if (existing) {
      if (existing.requestHash !== input.requestHash) {
        throw new AppError(ErrorCode.IDEMPOTENCY_CONFLICT, 'Idempotency-Key dipakai dengan body berbeda');
      }
      if (existing.status === 'COMPLETED') return { replay: true, response: existing.responseBody };
      throw new AppError(ErrorCode.IDEMPOTENCY_CONFLICT, 'Request dengan Idempotency-Key ini masih diproses');
    }
    await tx.idempotencyKey.create({
      data: {
        id: randomUUID(),
        idempotencyKey: input.key,
        route: input.route,
        actorId: input.actorId,
        requestHash: input.requestHash,
        status: 'PROCESSING',
        lockedUntil: new Date(Date.now() + 60_000),
      },
    });
    return { replay: false };
  }

  async complete(
    tx: Prisma.TransactionClient,
    input: { key: string; route: string; actorId: string; responseBody: Prisma.InputJsonValue },
  ) {
    await tx.idempotencyKey.update({
      where: {
        idempotencyKey_route_actorId: {
          idempotencyKey: input.key,
          route: input.route,
          actorId: input.actorId,
        },
      },
      data: {
        status: 'COMPLETED',
        responseBody: input.responseBody,
        lockedUntil: null,
      },
    });
  }
}
