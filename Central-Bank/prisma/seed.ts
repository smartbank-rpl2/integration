import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const totalSupply = 1_000_000_000n;
const loanPoolFunding = 10_000_000n;

const systemAccounts = [
  ['CENTRAL_RESERVE', 'CENTRAL_RESERVE'],
  ['ISSUANCE_ACCOUNT', 'ISSUANCE_ACCOUNT'],
  ['FEE_BANK', 'FEE_BANK'],
  ['FEE_GATEWAY', 'FEE_GATEWAY'],
  ['FEE_MARKETPLACE', 'FEE_MARKETPLACE'],
  ['FEE_POS', 'FEE_POS'],
  ['FEE_SUPPLIER', 'FEE_SUPPLIER'],
  ['FEE_LOGISTICS', 'FEE_LOGISTICS'],
  ['TAX_SINK', 'TAX_SINK'],
  ['LOAN_POOL_ACCOUNT', 'LOAN_POOL_ACCOUNT'],
  ['BURN_OR_SINK_ACCOUNT', 'BURN_OR_SINK_ACCOUNT'],
  ['CLEARING_ACCOUNT', 'CLEARING_ACCOUNT'],
] as const;

async function upsertSystemAccounts() {
  for (const [accountCode, accountType] of systemAccounts) {
    await prisma.walletAccount.upsert({
      where: { accountCode },
      update: {},
      create: {
        id: randomUUID(),
        accountCode,
        accountType,
        availableBalance: accountCode === 'CENTRAL_RESERVE' ? totalSupply : 0n,
      },
    });
  }
}

async function seedLoanPoolFunding() {
  const existing = await prisma.transaction.findFirst({ where: { transactionType: 'LOAN_POOL_FUNDING' } });
  if (existing) return;
  const reserve = await prisma.walletAccount.findUniqueOrThrow({ where: { accountCode: 'CENTRAL_RESERVE' } });
  const loanPool = await prisma.walletAccount.findUniqueOrThrow({ where: { accountCode: 'LOAN_POOL_ACCOUNT' } });
  const transactionId = randomUUID();
  await prisma.$transaction(async (tx) => {
    await tx.transaction.create({
      data: {
        id: transactionId,
        transactionType: 'LOAN_POOL_FUNDING',
        status: 'SETTLED',
        sourceApp: 'CENTRAL_BANK_CORE',
        payerWalletId: reserve.id,
        payeeWalletId: loanPool.id,
        grossAmount: loanPoolFunding,
        totalDebit: loanPoolFunding,
        settledAt: new Date(),
        metadata: { note: 'Seed loan pool from central reserve' },
      },
    });
    await tx.walletAccount.update({
      where: { id: reserve.id },
      data: { availableBalance: { decrement: loanPoolFunding } },
    });
    const updatedLoanPool = await tx.walletAccount.update({
      where: { id: loanPool.id },
      data: { availableBalance: { increment: loanPoolFunding } },
    });
    const updatedReserve = await tx.walletAccount.findUniqueOrThrow({ where: { id: reserve.id } });
    await tx.ledgerEntry.createMany({
      data: [
        {
          id: randomUUID(),
          transactionId,
          entryNo: 1,
          accountId: reserve.id,
          direction: 'DEBIT',
          amount: loanPoolFunding,
          balanceAfter: updatedReserve.availableBalance,
          description: 'Seed loan pool funding from reserve',
        },
        {
          id: randomUUID(),
          transactionId,
          entryNo: 2,
          accountId: loanPool.id,
          direction: 'CREDIT',
          amount: loanPoolFunding,
          balanceAfter: updatedLoanPool.availableBalance,
          description: 'Seed loan pool funding from reserve',
        },
      ],
    });
    await tx.monetaryPolicyEvent.create({
      data: {
        id: randomUUID(),
        eventType: 'LOAN_POOL_FUNDING',
        amount: loanPoolFunding,
        reason: 'Initial funding for academic loan simulation',
      },
    });
  });
}

async function seedInitialSupplyEvent() {
  const existing = await prisma.monetaryPolicyEvent.findFirst({ where: { eventType: 'INITIAL_SUPPLY' } });
  if (existing) return;
  await prisma.monetaryPolicyEvent.create({
    data: {
      id: randomUUID(),
      eventType: 'INITIAL_SUPPLY',
      amount: totalSupply,
      reason: 'Genesis supply for academic CBDC simulation',
    },
  });
}

async function upsertFeeRules() {
  const accounts = Object.fromEntries(
    (await prisma.walletAccount.findMany({ where: { accountCode: { in: systemAccounts.map(([code]) => code) } } })).map((account) => [
      account.accountCode,
      account.id,
    ]),
  ) as Record<string, string>;
  const rules = [
    ['GLOBAL', 'BANK', 100, null, accounts.FEE_BANK],
    ['GLOBAL', 'GATEWAY', 50, null, accounts.FEE_GATEWAY],
    ['GLOBAL', 'TAX', 200, null, accounts.TAX_SINK],
    ['MARKETPLACE', 'MARKETPLACE', 200, null, accounts.FEE_MARKETPLACE],
    ['POS', 'POS', 100, null, accounts.FEE_POS],
    ['SUPPLIER', 'SUPPLIER', 300, null, accounts.FEE_SUPPLIER],
    ['LOGISTICS', 'LOGISTICS', null, 5000n, accounts.FEE_LOGISTICS],
  ] as const;

  for (const [sourceApp, feeType, bps, flatAmount, destinationAccountId] of rules) {
    const existing = await prisma.feeRule.findFirst({ where: { sourceApp, feeType } });
    if (existing) {
      await prisma.feeRule.update({ where: { id: existing.id }, data: { bps, flatAmount, destinationAccountId, active: true } });
    } else {
      await prisma.feeRule.create({
        data: {
          id: randomUUID(),
          sourceApp,
          feeType,
          bps,
          flatAmount,
          destinationAccountId,
          active: true,
        },
      });
    }
  }
}

async function main() {
  await upsertSystemAccounts();
  await seedInitialSupplyEvent();
  await seedLoanPoolFunding();
  await upsertFeeRules();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
