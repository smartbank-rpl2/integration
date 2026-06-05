import { MoneyService } from '../src/modules/money/money.service';

describe('MoneyService', () => {
  it('calculates fees with floor basis points', () => {
    const money = new MoneyService();
    expect(money.bps(100000n, 100)).toBe(1000n);
    expect(money.bps(100000n, 50)).toBe(500n);
    expect(money.bps(100000n, 200)).toBe(2000n);
    expect(money.bps(333n, 100)).toBe(3n);
  });
});
