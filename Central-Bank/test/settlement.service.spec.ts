import { SettlementService } from '../src/modules/settlement/settlement.service';
import { AppError } from '../src/common/app-error';
import { ErrorCode } from '../src/common/error-codes';

describe('SettlementService primitives', () => {
  const service = new SettlementService({} as never, {} as never, {} as never, {} as never, {} as never, {} as never);

  it('prevents debit when balance is insufficient', () => {
    expect(() =>
      service.ensureDebitAllowed(
        {
          id: 'wallet',
          userId: 'user',
          accountCode: null,
          accountType: 'USER_WALLET',
          currency: 'CBDC_IDR',
          availableBalance: 5000n,
          holdBalance: 0n,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        10000n,
      ),
    ).toThrow(new AppError(ErrorCode.INSUFFICIENT_BALANCE, 'Saldo tidak mencukupi'));
  });

  it('retries deadlocks only up to the configured limit', async () => {
    await expect(
      service.withDeadlockRetry(async () => {
        throw new Error('Deadlock found when trying to get lock');
      }),
    ).rejects.toMatchObject({ code: ErrorCode.DEADLOCK_RETRY_EXCEEDED });
  });
});
