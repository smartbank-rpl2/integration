import { PaymentRequestService } from '../src/modules/payment-requests/payment-request.service';
import { MoneyService } from '../src/modules/money/money.service';
import { ErrorCode } from '../src/common/error-codes';

describe('PaymentRequestService authorization', () => {
  it('rejects a payment request that names another user as payer', async () => {
    const tx = {
      walletAccount: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'victim-wallet',
          userId: 'victim-user',
        }),
      },
      paymentRequest: { create: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const idempotency = {
      start: jest.fn().mockResolvedValue({ replay: false }),
      complete: jest.fn(),
    };
    const fees = {
      quote: jest.fn(),
    };
    const service = new PaymentRequestService(prisma as never, fees as never, new MoneyService(), idempotency as never);

    await expect(
      service.create({
        sourceApp: 'MARKETPLACE',
        payerWalletId: 'victim-wallet',
        payeeWalletId: 'merchant-wallet',
        grossAmount: 1000n,
        description: 'Unauthorized invoice',
        expiresAt: new Date(Date.now() + 60_000),
        actorUserId: 'attacker-user',
        idempotency: {
          key: 'idem-1',
          route: 'POST /api/v1/payment-requests',
          actorId: 'attacker-user',
          requestHash: 'hash',
        },
      }),
    ).rejects.toMatchObject({ code: ErrorCode.FORBIDDEN });

    expect(tx.paymentRequest.create).not.toHaveBeenCalled();
    expect(fees.quote).not.toHaveBeenCalled();
  });
});
