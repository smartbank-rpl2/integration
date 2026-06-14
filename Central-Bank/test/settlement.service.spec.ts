import { SettlementService } from '../src/modules/settlement/settlement.service';
import { AppError } from '../src/common/app-error';
import { ErrorCode } from '../src/common/error-codes';

describe('SettlementService primitives', () => {
  const service = new SettlementService({} as never, {} as never, {} as never, {} as never, {} as never, {} as never);
  const wallet = {
    id: 'wallet',
    userId: 'user',
    accountCode: null,
    accountType: 'USER_WALLET' as const,
    currency: 'CBDC_IDR',
    availableBalance: 5000n,
    holdBalance: 0n,
    status: 'ACTIVE' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('prevents debit when balance is insufficient', () => {
    expect(() => service.ensureDebitAllowed(wallet, 10000n)).toThrow(
      new AppError(ErrorCode.INSUFFICIENT_BALANCE, 'Saldo tidak mencukupi'),
    );
  });

  it('rejects object-level access when wallet belongs to another user', () => {
    expect(() => service.ensureWalletOwnedByActor(wallet, 'attacker')).toThrow(
      new AppError(ErrorCode.FORBIDDEN, 'Akses ke wallet ini tidak diizinkan'),
    );
  });

  it('allows object-level access for the wallet owner', () => {
    expect(() => service.ensureWalletOwnedByActor(wallet, 'user')).not.toThrow();
  });

  it('retries deadlocks only up to the configured limit', async () => {
    await expect(
      service.withDeadlockRetry(async () => {
        throw new Error('Deadlock found when trying to get lock');
      }),
    ).rejects.toMatchObject({ code: ErrorCode.DEADLOCK_RETRY_EXCEEDED });
  });
});

describe('SettlementService teller settlement classification', () => {
  function buildService() {
    const reserve = {
      id: 'reserve-wallet',
      userId: null,
      accountCode: 'CENTRAL_RESERVE',
      accountType: 'CENTRAL_RESERVE',
      currency: 'CBDC_IDR',
      availableBalance: 1_000_000n,
      holdBalance: 0n,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const wallet = {
      id: 'user-wallet',
      userId: 'user-1',
      accountCode: null,
      accountType: 'USER_WALLET',
      currency: 'CBDC_IDR',
      availableBalance: 100_000n,
      holdBalance: 0n,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const balances = new Map([
      [reserve.id, reserve.availableBalance],
      [wallet.id, wallet.availableBalance],
    ]);
    const tx = {
      $queryRaw: jest.fn(),
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'user-1', kycTier: 'VERIFIED' }),
      },
      walletAccount: {
        findUniqueOrThrow: jest.fn(({ where }) => {
          if (where.accountCode === 'CENTRAL_RESERVE') return Promise.resolve(reserve);
          if (where.id === wallet.id) return Promise.resolve(wallet);
          throw new Error('Unexpected lookup');
        }),
        findMany: jest.fn().mockResolvedValue([reserve, wallet]),
        update: jest.fn(({ where, data }) => {
          const next = (balances.get(where.id) ?? 0n) + data.availableBalance.increment;
          balances.set(where.id, next);
          return Promise.resolve({ ...(where.id === reserve.id ? reserve : wallet), availableBalance: next });
        }),
      },
      transaction: {
        create: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const ledger = {
      post: jest.fn(),
    };
    const idempotency = {
      start: jest.fn().mockResolvedValue({ replay: false }),
      complete: jest.fn(),
    };
    const audit = {
      record: jest.fn(),
    };

    return {
      service: new SettlementService(prisma as never, ledger as never, {} as never, idempotency as never, audit as never, {} as never),
      tx,
      audit,
    };
  }

  it('records teller top-up as TOP_UP, not initial distribution', async () => {
    const { service, tx, audit } = buildService();

    await service.settleTopUp({
      walletId: 'user-wallet',
      amount: 10_000n,
      actorUserId: 'teller-1',
      requestId: 'req-top-up',
      reasonCode: 'CASH_COUNTER_TOP_UP',
      idempotency: {
        key: 'idem-top-up',
        route: 'POST /api/v1/teller/top-up',
        actorId: 'teller-1',
        requestHash: 'hash',
      },
    });

    expect(tx.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ transactionType: 'TOP_UP' }),
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TELLER_TOP_UP_SETTLED',
        reasonCode: 'CASH_COUNTER_TOP_UP',
      }),
    );
  });

  it('records teller withdrawal as WITHDRAWAL, not generic transfer', async () => {
    const { service, tx, audit } = buildService();

    await service.settleWithdrawal({
      walletId: 'user-wallet',
      amount: 10_000n,
      actorUserId: 'teller-1',
      requestId: 'req-withdraw',
      reasonCode: 'CASH_COUNTER_WITHDRAWAL',
      idempotency: {
        key: 'idem-withdraw',
        route: 'POST /api/v1/teller/withdraw',
        actorId: 'teller-1',
        requestHash: 'hash',
      },
    });

    expect(tx.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ transactionType: 'WITHDRAWAL' }),
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TELLER_WITHDRAWAL_SETTLED',
        reasonCode: 'CASH_COUNTER_WITHDRAWAL',
      }),
    );
  });
});
