import { ManagerService } from '../src/modules/manager/manager.service';

describe('ManagerService audit trail', () => {
  it('records reason code when suspending a user wallet', async () => {
    const tx = {
      walletAccount: {
        update: jest.fn().mockResolvedValue({ id: 'wallet-1', status: 'FROZEN' }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const wallets = {
      getPrimaryWallet: jest.fn().mockResolvedValue({ id: 'wallet-1' }),
    };
    const audit = {
      record: jest.fn(),
    };
    const service = new ManagerService(prisma as never, {} as never, wallets as never, audit as never);

    await service.suspendUser({
      userId: 'user-1',
      actorUserId: 'manager-1',
      requestId: 'req-suspend',
      reasonCode: 'AML_REVIEW',
    });

    expect(tx.walletAccount.update).toHaveBeenCalledWith({
      where: { id: 'wallet-1' },
      data: { status: 'FROZEN' },
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'manager-1',
        action: 'USER_WALLET_SUSPENDED',
        reasonCode: 'AML_REVIEW',
        targetId: 'wallet-1',
      }),
    );
  });
});
