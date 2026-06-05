import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LoanService {
  constructor(private readonly prisma: PrismaService) {}

  getLoan(id: string) {
    return this.prisma.loan.findUniqueOrThrow({ where: { id } });
  }
}
