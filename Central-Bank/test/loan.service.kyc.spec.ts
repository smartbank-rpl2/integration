import { AppError } from '../src/common/app-error';
import { ErrorCode } from '../src/common/error-codes';
import { LoanService } from '../src/modules/loans/loan.service';
import { MoneyService } from '../src/modules/money/money.service';

describe('LoanService KYC eligibility', () => {
  function buildService(kycTier: 'BASIC' | 'VERIFIED') {
    const tx = {
      walletAccount: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'wallet-1',
          user: { id: 'user-1', kycTier },
        }),
      },
      loan: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { principal: 0n, paidAmount: 0n } }),
        create: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const idempotency = {
      start: jest.fn().mockResolvedValue({ replay: false }),
      complete: jest.fn(),
    };
    return { service: new LoanService(prisma as never, new MoneyService(), idempotency as never), tx };
  }

  it('rejects loan applications from BASIC customers', async () => {
    const { service } = buildService('BASIC');
    await expect(service.applyLoan({
      borrowerWalletId: 'wallet-1',
      amount: 10000n,
      idempotency: { key: 'idem', route: 'route', actorId: 'user-1', requestHash: 'hash' },
    })).rejects.toEqual(new AppError(ErrorCode.FORBIDDEN, 'Pengajuan pinjaman hanya tersedia untuk nasabah yang sudah terverifikasi KYC.'));
  });

  it('creates a PENDING loan for VERIFIED customers', async () => {
    const { service, tx } = buildService('VERIFIED');
    const result = await service.applyLoan({
      borrowerWalletId: 'wallet-1',
      amount: 10000n,
      idempotency: { key: 'idem', route: 'route', actorId: 'user-1', requestHash: 'hash' },
    });
    expect(result).toMatchObject({ status: 'PENDING', principal: 10000n });
    expect(tx.loan.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'PENDING', principal: 10000n }),
    }));
  });
});
