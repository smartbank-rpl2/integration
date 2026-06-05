import { Injectable } from '@nestjs/common';
import { AppError } from '../../common/app-error';
import { ErrorCode } from '../../common/error-codes';

@Injectable()
export class MoneyService {
  parse(value: string | number | bigint): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') {
      if (!Number.isInteger(value)) throw new AppError(ErrorCode.VALIDATION_ERROR, 'Amount harus integer');
      return BigInt(value);
    }
    if (!/^\d+$/.test(value)) throw new AppError(ErrorCode.VALIDATION_ERROR, 'Amount harus integer positif');
    return BigInt(value);
  }

  assertPositive(amount: bigint) {
    if (amount <= 0n) throw new AppError(ErrorCode.VALIDATION_ERROR, 'Amount harus lebih besar dari 0');
  }

  bps(amount: bigint, basisPoints: number): bigint {
    return (amount * BigInt(basisPoints)) / 10000n;
  }

  tenPercent(amount: bigint): bigint {
    return this.bps(amount, 1000);
  }
}
