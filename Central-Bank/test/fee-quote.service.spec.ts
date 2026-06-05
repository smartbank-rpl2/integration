import { FeeQuoteService } from '../src/modules/fees/fee-quote.service';
import { MoneyService } from '../src/modules/money/money.service';

describe('FeeQuoteService', () => {
  it('quotes marketplace amount 100000 with bank, gateway, tax, and marketplace fees', async () => {
    const prisma = {
      feeRule: {
        findMany: jest.fn().mockResolvedValue([
          { feeType: 'BANK', bps: 100, flatAmount: null, destinationAccountId: 'fee-bank' },
          { feeType: 'GATEWAY', bps: 50, flatAmount: null, destinationAccountId: 'fee-gateway' },
          { feeType: 'TAX', bps: 200, flatAmount: null, destinationAccountId: 'tax' },
          { feeType: 'MARKETPLACE', bps: 200, flatAmount: null, destinationAccountId: 'fee-marketplace' },
        ]),
      },
    };
    const service = new FeeQuoteService(prisma as never, new MoneyService());
    const quote = await service.quote({ sourceApp: 'MARKETPLACE', amount: 100000n });
    expect(quote.components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'BANK', amount: 1000n }),
        expect.objectContaining({ type: 'GATEWAY', amount: 500n }),
        expect.objectContaining({ type: 'TAX', amount: 2000n }),
        expect.objectContaining({ type: 'MARKETPLACE', amount: 2000n }),
      ]),
    );
    expect(quote.feeTotal).toBe(3500n);
    expect(quote.taxTotal).toBe(2000n);
    expect(quote.totalDebit).toBe(105500n);
  });

  it('uses flat logistics fee of 5000', async () => {
    const prisma = {
      feeRule: {
        findMany: jest.fn().mockResolvedValue([
          { feeType: 'LOGISTICS', bps: null, flatAmount: 5000n, destinationAccountId: 'fee-logistics' },
        ]),
      },
    };
    const service = new FeeQuoteService(prisma as never, new MoneyService());
    const quote = await service.quote({ sourceApp: 'LOGISTICS', amount: 100000n });
    expect(quote.components).toEqual([expect.objectContaining({ type: 'LOGISTICS', amount: 5000n })]);
    expect(quote.totalDebit).toBe(105000n);
  });
});
