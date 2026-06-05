describe('Financial invariants', () => {
  it('documents supply equation used by CentralBank Core', () => {
    const totalSupply = 1_000_000_000n;
    const reserve = 990_000_000n;
    const circulating = 10_000_000n;
    const sink = 0n;
    expect(reserve + circulating + sink).toBe(totalSupply);
  });

  it('documents initial distribution cap', () => {
    const totalSupply = 1_000_000_000n;
    const maxInitialDistribution = (totalSupply * 200n) / 10000n;
    expect(maxInitialDistribution).toBe(20_000_000n);
    expect(50_000n * 400n).toBe(maxInitialDistribution);
  });
});
