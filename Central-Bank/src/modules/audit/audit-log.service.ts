import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: {
    tx?: Prisma.TransactionClient | PrismaClient;
    actorUserId?: string | null;
    serviceName: string;
    action: string;
    targetType: string;
    targetId: string;
    requestId: string;
    reasonCode?: string | null;
    metadata?: Prisma.InputJsonValue;
  }) {
    const client = input.tx ?? this.prisma;
    return client.auditLog.create({
      data: {
        id: randomUUID(),
        actorUserId: input.actorUserId ?? null,
        serviceName: input.serviceName,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        requestId: input.requestId,
        reasonCode: input.reasonCode ?? null,
        metadata: input.metadata ?? undefined,
      },
    });
  }
}
