import { LoansController } from '../src/modules/loans/loans.controller';
import { MoneyService } from '../src/modules/money/money.service';

describe('LoansController apply flow', () => {
  it('creates a pending application without immediately disbursing it', async () => {
    const settlement = {
      settleLoanApproval: jest.fn(),
    };
    const wallets = {
      getPrimaryWallet: jest.fn().mockResolvedValue({ id: 'borrower-wallet' }),
    };
    const loans = {
      applyLoan: jest.fn().mockResolvedValue({ loan_id: 'loan-1', status: 'PENDING' }),
    };
    const controller = new LoansController(settlement as never, wallets as never, new MoneyService(), loans as never);
    const req = {
      header: jest.fn((name: string) => {
        if (name === 'idempotency-key') return 'idem-loan';
        if (name === 'x-request-id') return 'req-loan';
        return undefined;
      }),
    };

    const result = await controller.apply({ amount: '50000' }, req as never, {
      sub: 'borrower-user',
      email: 'borrower@example.com',
      role: 'WALLET_USER',
    });

    expect(result).toEqual({ loan_id: 'loan-1', status: 'PENDING' });
    expect(loans.applyLoan).toHaveBeenCalledWith(
      expect.objectContaining({
        borrowerWalletId: 'borrower-wallet',
        amount: 50000n,
      }),
    );
    expect(settlement.settleLoanApproval).not.toHaveBeenCalled();
  });
});
