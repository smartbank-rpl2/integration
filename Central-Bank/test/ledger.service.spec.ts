import { LedgerService } from '../src/modules/ledger/ledger.service';

describe('LedgerService', () => {
  it('accepts balanced double-entry ledger', () => {
    const service = new LedgerService();
    expect(() =>
      service.validate([
        { accountId: 'a', direction: 'DEBIT', amount: 100n, description: 'debit' },
        { accountId: 'b', direction: 'CREDIT', amount: 100n, description: 'credit' },
      ]),
    ).not.toThrow();
  });

  it('rejects ledger imbalance', () => {
    const service = new LedgerService();
    expect(() =>
      service.validate([
        { accountId: 'a', direction: 'DEBIT', amount: 100n, description: 'debit' },
        { accountId: 'b', direction: 'CREDIT', amount: 90n, description: 'credit' },
      ]),
    ).toThrow('Total debit dan credit ledger tidak balance');
  });
});
