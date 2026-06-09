import { Injectable } from '@nestjs/common';
import { AccountStatus, Prisma, TransactionType, WalletAccount } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AppError } from '../../common/app-error';
import { ErrorCode } from '../../common/error-codes';
import { AuditLogService } from '../audit/audit-log.service';
import { FeeQuoteService } from '../fees/fee-quote.service';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { LedgerPost, LedgerService } from '../ledger/ledger.service';
import { MoneyService } from '../money/money.service';
import { PrismaService } from '../prisma/prisma.service';

type IdempotencyInput = {
  key: string;
  route: string;
  actorId: string;
  requestHash: string;
};

const SYSTEM_ACTOR = 'system';
const MAX_DEADLOCK_RETRIES = 3;

function isDeadlock(error: unknown): boolean {
  const message = error instanceof Error ? error.message : '';
  const code = typeof error === 'object' && error ? String((error as { code?: unknown }).code ?? '') : '';
  return message.includes('Deadlock') || message.includes('Lock wait timeout') || code === 'P2034';
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value, (_key, current) => (typeof current === 'bigint' ? current.toString() : current)),
  ) as Prisma.InputJsonValue;
}

@Injectable()
export class SettlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly fees: FeeQuoteService,
    private readonly idempotency: IdempotencyService,
    private readonly audit: AuditLogService,
    private readonly money: MoneyService,
  ) {}

  async withDeadlockRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_DEADLOCK_RETRIES; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (!isDeadlock(error) || attempt === MAX_DEADLOCK_RETRIES) break;
        await new Promise((resolve) => setTimeout(resolve, attempt * 50));
      }
    }
    if (isDeadlock(lastError)) {
      throw new AppError(ErrorCode.DEADLOCK_RETRY_EXCEEDED, 'Deadlock retry melebihi batas');
    }
    throw lastError;
  }

  async lockAccounts(tx: Prisma.TransactionClient, accountIds: string[]): Promise<Map<string, WalletAccount>> {
    const sorted = [...new Set(accountIds)].sort();
    if (sorted.length === 0) return new Map();
    await tx.$queryRaw(Prisma.sql`SELECT id FROM wallet_accounts WHERE id IN (${Prisma.join(sorted)}) ORDER BY id FOR UPDATE`);
    const accounts = await tx.walletAccount.findMany({ where: { id: { in: sorted } } });
    return new Map(accounts.map((account) => [account.id, account]));
  }

  ensureDebitAllowed(account: WalletAccount, amount: bigint) {
    if (account.status !== AccountStatus.ACTIVE) throw new AppError(ErrorCode.ACCOUNT_FROZEN, 'Account tidak aktif');
    if (account.availableBalance < amount) throw new AppError(ErrorCode.INSUFFICIENT_BALANCE, 'Saldo tidak mencukupi');
  }

  ensureWalletOwnedByActor(account: WalletAccount, actorUserId: string) {
    if (!account.userId || account.userId !== actorUserId) {
      throw new AppError(ErrorCode.FORBIDDEN, 'Akses ke wallet ini tidak diizinkan');
    }
  }

  async applyEntries(tx: Prisma.TransactionClient, entries: LedgerPost[]) {
    const byAccount = new Map<string, bigint>();
    for (const entry of entries) {
      const delta = entry.direction === 'CREDIT' ? entry.amount : -entry.amount;
      byAccount.set(entry.accountId, (byAccount.get(entry.accountId) ?? 0n) + delta);
    }
    const balanceAfter = new Map<string, bigint>();
    for (const [accountId, delta] of byAccount.entries()) {
      const updated = await tx.walletAccount.update({
        where: { id: accountId },
        data: { availableBalance: { increment: delta } },
      });
      if (updated.availableBalance < 0n) {
        throw new AppError(ErrorCode.INSUFFICIENT_BALANCE, 'Saldo tidak boleh negatif');
      }
      balanceAfter.set(accountId, updated.availableBalance);
    }
    return entries.map((entry) => ({ ...entry, balanceAfter: balanceAfter.get(entry.accountId) }));
  }

  async enforceVelocityLimits(tx: Prisma.TransactionClient, walletId: string, now = new Date()) {
    const account = await tx.walletAccount.findUniqueOrThrow({ where: { id: walletId } });
    const userId = account.userId;
    if (!userId) return;
    const cooldownSeconds = BigInt(process.env.TRANSACTION_COOLDOWN_SECONDS ?? '10');
    const dailyLimit = Number(process.env.DAILY_TRANSACTION_LIMIT ?? '10');
    const latest = await tx.transaction.findFirst({
      where: { payerWalletId: walletId, status: 'SETTLED', transactionType: { in: ['TRANSFER', 'PAYMENT'] } },
      orderBy: { settledAt: 'desc' },
    });
    if (latest?.settledAt) {
      const elapsed = BigInt(Math.floor((now.getTime() - latest.settledAt.getTime()) / 1000));
      if (elapsed >= 0n && elapsed < cooldownSeconds) {
        throw new AppError(ErrorCode.COOLDOWN_ACTIVE, 'Cooldown transaksi masih aktif');
      }
    }
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const count = await tx.transaction.count({
      where: {
        payerWalletId: walletId,
        status: 'SETTLED',
        transactionType: { in: ['TRANSFER', 'PAYMENT'] },
        settledAt: { gte: startOfDay },
      },
    });
    if (count >= dailyLimit) throw new AppError(ErrorCode.DAILY_LIMIT_EXCEEDED, 'Limit transaksi harian tercapai');
  }

  async settleInitialDistribution(input: {
    walletId: string;
    idempotency: IdempotencyInput;
    requestId: string;
    actorUserId: string;
  }) {
    return this.withDeadlockRetry(() =>
      this.prisma.$transaction(async (tx) => {
        const idem = await this.idempotency.start(tx, input.idempotency);
        if (idem.replay) return idem.response;
        const initialBalance = BigInt(process.env.INITIAL_USER_BALANCE ?? '50000');
        const totalSupply = BigInt(process.env.TOTAL_MONEY_SUPPLY ?? '1000000000');
        const maxInitial = (totalSupply * BigInt(process.env.INITIAL_DISTRIBUTION_MAX_BPS ?? '200')) / 10000n;
        const reserve = await tx.walletAccount.findUniqueOrThrow({ where: { accountCode: 'CENTRAL_RESERVE' } });
        const wallet = await tx.walletAccount.findUniqueOrThrow({ where: { id: input.walletId } });
        await this.lockAccounts(tx, [reserve.id, wallet.id]);
        const distributed = await tx.transaction.aggregate({
          where: { transactionType: 'INITIAL_DISTRIBUTION', status: 'SETTLED' },
          _sum: { grossAmount: true },
        });
        const already = distributed._sum.grossAmount ?? 0n;
        if (already + initialBalance > maxInitial) {
          const response = { wallet_id: input.walletId, initial_balance: '0' };
          await this.idempotency.complete(tx, { ...input.idempotency, responseBody: asJson(response) });
          return response;
        }
        this.ensureDebitAllowed(reserve, initialBalance);
        const transactionId = randomUUID();
        const entries: LedgerPost[] = [
          { accountId: reserve.id, direction: 'DEBIT', amount: initialBalance, description: 'Initial distribution from reserve' },
          { accountId: wallet.id, direction: 'CREDIT', amount: initialBalance, description: 'Initial wallet balance' },
        ];
        await tx.transaction.create({
          data: {
            id: transactionId,
            transactionType: 'INITIAL_DISTRIBUTION',
            status: 'SETTLED',
            sourceApp: 'CENTRAL_BANK_CORE',
            payerWalletId: reserve.id,
            payeeWalletId: wallet.id,
            grossAmount: initialBalance,
            totalDebit: initialBalance,
            idempotencyKey: input.idempotency.key,
            settledAt: new Date(),
          },
        });
        await this.ledger.post(tx, {
          transactionId,
          entries: await this.applyEntries(tx, entries),
        });
        await tx.monetaryPolicyEvent.create({
          data: {
            id: randomUUID(),
            eventType: 'INITIAL_DISTRIBUTION',
            amount: initialBalance,
            reason: 'New wallet initial distribution',
            createdBy: input.actorUserId,
          },
        });
        const response = { transaction_id: transactionId, wallet_id: input.walletId, initial_balance: initialBalance };
        await this.idempotency.complete(tx, { ...input.idempotency, responseBody: asJson(response) });
        return response;
      }),
    );
  }

  async settleTransfer(input: {
    payerWalletId: string;
    payeeWalletId: string;
    amount: bigint;
    note?: string;
    idempotency: IdempotencyInput;
    requestId: string;
    actorUserId: string;
  }) {
    return this.withDeadlockRetry(() =>
      this.prisma.$transaction(async (tx) => {
        const idem = await this.idempotency.start(tx, input.idempotency);
        if (idem.replay) return idem.response;
        await this.enforceVelocityLimits(tx, input.payerWalletId);
        const quote = await this.fees.quote({ tx, sourceApp: 'TRANSFER', amount: input.amount });
        const accounts = await this.lockAccounts(tx, [
          input.payerWalletId,
          input.payeeWalletId,
          ...quote.components.map((component) => component.destinationAccountId),
        ]);
        const payer = accounts.get(input.payerWalletId);
        if (!payer) throw new AppError(ErrorCode.VALIDATION_ERROR, 'Payer wallet tidak ditemukan');
        this.ensureDebitAllowed(payer, quote.totalDebit);
        const transactionId = randomUUID();
        const entries: LedgerPost[] = [
          { accountId: input.payerWalletId, direction: 'DEBIT', amount: quote.totalDebit, description: input.note ?? 'Transfer debit' },
          { accountId: input.payeeWalletId, direction: 'CREDIT', amount: input.amount, description: input.note ?? 'Transfer credit' },
          ...quote.components.map((component) => ({
            accountId: component.destinationAccountId,
            direction: 'CREDIT' as const,
            amount: component.amount,
            description: `${component.type} fee/tax`,
          })),
        ];
        await tx.transaction.create({
          data: {
            id: transactionId,
            transactionType: 'TRANSFER',
            status: 'SETTLED',
            sourceApp: 'TRANSFER',
            payerWalletId: input.payerWalletId,
            payeeWalletId: input.payeeWalletId,
            grossAmount: input.amount,
            totalDebit: quote.totalDebit,
            feeTotal: quote.feeTotal,
            taxTotal: quote.taxTotal,
            idempotencyKey: input.idempotency.key,
            metadata: { note: input.note ?? null },
            settledAt: new Date(),
          },
        });
        await this.ledger.post(tx, { transactionId, entries: await this.applyEntries(tx, entries) });
        await this.audit.record({
          tx,
          actorUserId: input.actorUserId,
          serviceName: 'centralbank-core',
          action: 'TRANSFER_SETTLED',
          targetType: 'transaction',
          targetId: transactionId,
          requestId: input.requestId,
          metadata: asJson({ total_debit: quote.totalDebit }),
        });
        const response = {
          transaction_id: transactionId,
          status: 'SETTLED',
          amount: input.amount,
          total_debit: quote.totalDebit,
          fee_total: quote.feeTotal,
          tax_total: quote.taxTotal,
        };
        await this.idempotency.complete(tx, { ...input.idempotency, responseBody: asJson(response) });
        return response;
      }),
    );
  }

  async settlePaymentRequest(input: {
    paymentRequestId: string;
    idempotency: IdempotencyInput;
    requestId: string;
    actorUserId: string;
  }) {
    return this.withDeadlockRetry(() =>
      this.prisma.$transaction(async (tx) => {
        const idem = await this.idempotency.start(tx, input.idempotency);
        if (idem.replay) return idem.response;
        await tx.$queryRaw(Prisma.sql`SELECT id FROM payment_requests WHERE id = ${input.paymentRequestId} FOR UPDATE`);
        const payment = await tx.paymentRequest.findUnique({ where: { id: input.paymentRequestId } });
        if (!payment) throw new AppError(ErrorCode.PAYMENT_REQUEST_NOT_FOUND, 'Payment request tidak ditemukan');
        if (payment.status !== 'PENDING') throw new AppError(ErrorCode.INVALID_PAYMENT_STATUS, 'Payment request bukan PENDING');
        if (payment.expiresAt.getTime() <= Date.now()) {
          await tx.paymentRequest.update({ where: { id: payment.id }, data: { status: 'EXPIRED' } });
          throw new AppError(ErrorCode.PAYMENT_EXPIRED, 'Payment request sudah expired');
        }
        const quote = await this.fees.quote({ tx, sourceApp: payment.sourceApp, amount: payment.grossAmount });
        const accounts = await this.lockAccounts(tx, [
          payment.payerWalletId,
          payment.payeeWalletId,
          ...quote.components.map((component) => component.destinationAccountId),
        ]);
        const payer = accounts.get(payment.payerWalletId);
        if (!payer) throw new AppError(ErrorCode.VALIDATION_ERROR, 'Payer wallet tidak ditemukan');
        this.ensureWalletOwnedByActor(payer, input.actorUserId);
        await this.enforceVelocityLimits(tx, payment.payerWalletId);
        this.ensureDebitAllowed(payer, quote.totalDebit);
        const transactionId = randomUUID();
        const entries: LedgerPost[] = [
          { accountId: payment.payerWalletId, direction: 'DEBIT', amount: quote.totalDebit, description: payment.description },
          { accountId: payment.payeeWalletId, direction: 'CREDIT', amount: payment.grossAmount, description: payment.description },
          ...quote.components.map((component) => ({
            accountId: component.destinationAccountId,
            direction: 'CREDIT' as const,
            amount: component.amount,
            description: `${component.type} fee/tax`,
          })),
        ];
        await tx.transaction.create({
          data: {
            id: transactionId,
            transactionType: 'PAYMENT',
            status: 'SETTLED',
            sourceApp: payment.sourceApp,
            payerWalletId: payment.payerWalletId,
            payeeWalletId: payment.payeeWalletId,
            grossAmount: payment.grossAmount,
            totalDebit: quote.totalDebit,
            feeTotal: quote.feeTotal,
            taxTotal: quote.taxTotal,
            idempotencyKey: input.idempotency.key,
            metadata: payment.metadata ?? undefined,
            settledAt: new Date(),
          },
        });
        await this.ledger.post(tx, { transactionId, entries: await this.applyEntries(tx, entries) });
        await tx.paymentRequest.update({
          where: { id: payment.id },
          data: { status: 'PAID', paidTransactionId: transactionId, amountDue: quote.totalDebit },
        });
        await this.audit.record({
          tx,
          actorUserId: input.actorUserId,
          serviceName: 'centralbank-core',
          action: 'PAYMENT_REQUEST_PAID',
          targetType: 'payment_request',
          targetId: payment.id,
          requestId: input.requestId,
        });
        const response = { payment_request_id: payment.id, transaction_id: transactionId, status: 'SETTLED' };
        await this.idempotency.complete(tx, { ...input.idempotency, responseBody: asJson(response) });
        return response;
      }),
    );
  }

  async settleTopUp(input: {
    walletId: string;
    amount: bigint;
    idempotency: IdempotencyInput;
    requestId: string;
    actorUserId: string;
  }) {
    return this.withDeadlockRetry(() =>
      this.prisma.$transaction(async (tx) => {
        const idem = await this.idempotency.start(tx, input.idempotency);
        if (idem.replay) return idem.response;
        
        const reserve = await tx.walletAccount.findUniqueOrThrow({ where: { accountCode: 'CENTRAL_RESERVE' } });
        const wallet = await tx.walletAccount.findUniqueOrThrow({ where: { id: input.walletId } });
        
        await this.lockAccounts(tx, [reserve.id, wallet.id]);
        this.ensureDebitAllowed(reserve, input.amount);
        
        const transactionId = randomUUID();
        const entries: LedgerPost[] = [
          { accountId: reserve.id, direction: 'DEBIT', amount: input.amount, description: 'Top-up from reserve' },
          { accountId: wallet.id, direction: 'CREDIT', amount: input.amount, description: 'Top-up wallet' },
        ];
        
        await tx.transaction.create({
          data: {
            id: transactionId,
            transactionType: 'INITIAL_DISTRIBUTION',
            status: 'SETTLED',
            sourceApp: 'CENTRAL_BANK_TELLER',
            payerWalletId: reserve.id,
            payeeWalletId: wallet.id,
            grossAmount: input.amount,
            totalDebit: input.amount,
            idempotencyKey: input.idempotency.key,
            settledAt: new Date(),
          },
        });
        
        await this.ledger.post(tx, {
          transactionId,
          entries: await this.applyEntries(tx, entries),
        });
        
        const response = { transaction_id: transactionId, status: 'SETTLED', amount: input.amount };
        await this.idempotency.complete(tx, { ...input.idempotency, responseBody: asJson(response) });
        return response;
      }),
    );
  }

  async settleWithdrawal(input: {
    walletId: string;
    amount: bigint;
    idempotency: IdempotencyInput;
    requestId: string;
    actorUserId: string;
  }) {
    return this.withDeadlockRetry(() =>
      this.prisma.$transaction(async (tx) => {
        const idem = await this.idempotency.start(tx, input.idempotency);
        if (idem.replay) return idem.response;
        
        const reserve = await tx.walletAccount.findUniqueOrThrow({ where: { accountCode: 'CENTRAL_RESERVE' } });
        const wallet = await tx.walletAccount.findUniqueOrThrow({ where: { id: input.walletId } });
        
        await this.lockAccounts(tx, [wallet.id, reserve.id]);
        this.ensureDebitAllowed(wallet, input.amount);
        
        const transactionId = randomUUID();
        const entries: LedgerPost[] = [
          { accountId: wallet.id, direction: 'DEBIT', amount: input.amount, description: 'Withdrawal from wallet' },
          { accountId: reserve.id, direction: 'CREDIT', amount: input.amount, description: 'Withdrawal to reserve' },
        ];
        
        await tx.transaction.create({
          data: {
            id: transactionId,
            transactionType: 'TRANSFER',
            status: 'SETTLED',
            sourceApp: 'CENTRAL_BANK_TELLER',
            payerWalletId: wallet.id,
            payeeWalletId: reserve.id,
            grossAmount: input.amount,
            totalDebit: input.amount,
            idempotencyKey: input.idempotency.key,
            settledAt: new Date(),
          },
        });
        
        await this.ledger.post(tx, {
          transactionId,
          entries: await this.applyEntries(tx, entries),
        });
        
        const response = { transaction_id: transactionId, status: 'SETTLED', amount: input.amount };
        await this.idempotency.complete(tx, { ...input.idempotency, responseBody: asJson(response) });
        return response;
      }),
    );
  }

  async settleLoanApproval(input: {
    loanId: string;
    idempotency: IdempotencyInput;
    requestId: string;
    actorUserId: string;
  }) {
    return this.withDeadlockRetry(() =>
      this.prisma.$transaction(async (tx) => {
        const idem = await this.idempotency.start(tx, input.idempotency);
        if (idem.replay) return idem.response;

        await tx.$queryRaw`SELECT id FROM loans WHERE id = ${input.loanId} FOR UPDATE`;
        const loan = await tx.loan.findUniqueOrThrow({ where: { id: input.loanId } });
        
        if (loan.status !== 'PENDING') {
          throw new AppError(ErrorCode.VALIDATION_ERROR, 'Loan is not in PENDING state');
        }

        const loanPool = await tx.walletAccount.findUniqueOrThrow({ where: { accountCode: 'LOAN_POOL_ACCOUNT' } });
        const accounts = await this.lockAccounts(tx, [loanPool.id, loan.borrowerWalletId]);
        const lockedLoanPool = accounts.get(loanPool.id) ?? loanPool;
        
        this.ensureDebitAllowed(lockedLoanPool, loan.principal);
        
        const transactionId = randomUUID();
        
        await tx.loan.update({
          where: { id: loan.id },
          data: {
            status: 'DISBURSED',
            disbursedAt: new Date(),
          }
        });

        await tx.transaction.create({
          data: {
            id: transactionId,
            transactionType: 'LOAN_DISBURSEMENT',
            status: 'SETTLED',
            sourceApp: 'CENTRAL_BANK_MANAGER',
            payerWalletId: loanPool.id,
            payeeWalletId: loan.borrowerWalletId,
            grossAmount: loan.principal,
            totalDebit: loan.principal,
            idempotencyKey: input.idempotency.key,
            metadata: { loan_id: loan.id, interest_amount: loan.interestAmount.toString(), total_due: loan.totalDue.toString() },
            settledAt: new Date(),
          },
        });
        
        await this.ledger.post(tx, {
          transactionId,
          entries: await this.applyEntries(tx, [
            { accountId: loanPool.id, direction: 'DEBIT', amount: loan.principal, description: 'Loan disbursement' },
            { accountId: loan.borrowerWalletId, direction: 'CREDIT', amount: loan.principal, description: 'Loan disbursement' },
          ]),
        });
        
        const response = {
          loan_id: loan.id,
          transaction_id: transactionId,
          principal: loan.principal,
          status: 'DISBURSED',
        };
        await this.idempotency.complete(tx, { ...input.idempotency, responseBody: asJson(response) });
        return response;
      }),
    );
  }

  async settleLoanRepayment(input: {
    loanId: string;
    amount: bigint;
    idempotency: IdempotencyInput;
    requestId: string;
    actorUserId: string;
  }) {
    return this.withDeadlockRetry(() =>
      this.prisma.$transaction(async (tx) => {
        const idem = await this.idempotency.start(tx, input.idempotency);
        if (idem.replay) return idem.response;
        await tx.$queryRaw(Prisma.sql`SELECT id FROM loans WHERE id = ${input.loanId} FOR UPDATE`);
        const loan = await tx.loan.findUniqueOrThrow({ where: { id: input.loanId } });
        const remaining = loan.totalDue - loan.paidAmount;
        if (input.amount <= 0n || input.amount > remaining) {
          throw new AppError(ErrorCode.VALIDATION_ERROR, 'Amount repayment tidak valid');
        }
        const loanPool = await tx.walletAccount.findUniqueOrThrow({ where: { accountCode: 'LOAN_POOL_ACCOUNT' } });
        const accounts = await this.lockAccounts(tx, [loan.borrowerWalletId, loanPool.id]);
        const borrower = accounts.get(loan.borrowerWalletId);
        if (!borrower) throw new AppError(ErrorCode.VALIDATION_ERROR, 'Borrower wallet tidak ditemukan');
        this.ensureWalletOwnedByActor(borrower, input.actorUserId);
        this.ensureDebitAllowed(borrower, input.amount);
        const transactionId = randomUUID();
        const paidAmount = loan.paidAmount + input.amount;
        const status = paidAmount >= loan.totalDue ? 'PAID' : 'PARTIAL_PAID';
        await tx.transaction.create({
          data: {
            id: transactionId,
            transactionType: 'LOAN_REPAYMENT',
            status: 'SETTLED',
            sourceApp: 'CENTRAL_BANK_CORE',
            payerWalletId: loan.borrowerWalletId,
            payeeWalletId: loanPool.id,
            grossAmount: input.amount,
            totalDebit: input.amount,
            idempotencyKey: input.idempotency.key,
            metadata: { loan_id: input.loanId },
            settledAt: new Date(),
          },
        });
        await this.ledger.post(tx, {
          transactionId,
          entries: await this.applyEntries(tx, [
            { accountId: loan.borrowerWalletId, direction: 'DEBIT', amount: input.amount, description: 'Loan repayment' },
            { accountId: loanPool.id, direction: 'CREDIT', amount: input.amount, description: 'Loan repayment' },
          ]),
        });
        await tx.loan.update({ where: { id: loan.id }, data: { paidAmount, status } });
        const response = {
          loan_id: loan.id,
          transaction_id: transactionId,
          status,
          remaining_due: loan.totalDue - paidAmount,
        };
        await this.idempotency.complete(tx, { ...input.idempotency, responseBody: asJson(response) });
        return response;
      }),
    );
  }

  async reverseTransaction(input: {
    originalTransactionId: string;
    reasonCode: string;
    idempotency: IdempotencyInput;
    requestId: string;
    actorUserId: string;
  }) {
    return this.withDeadlockRetry(() =>
      this.prisma.$transaction(async (tx) => {
        const idem = await this.idempotency.start(tx, input.idempotency);
        if (idem.replay) return idem.response;
        const original = await tx.transaction.findUnique({
          where: { id: input.originalTransactionId },
          include: { ledgerEntries: true },
        });
        if (!original || original.status !== 'SETTLED') {
          throw new AppError(ErrorCode.REVERSAL_NOT_ALLOWED, 'Hanya transaksi SETTLED yang bisa direversal');
        }
        const existing = await tx.transaction.findFirst({ where: { originalTransactionId: original.id, transactionType: 'REVERSAL' } });
        if (existing) throw new AppError(ErrorCode.REVERSAL_NOT_ALLOWED, 'Transaksi sudah pernah direversal');
        await this.lockAccounts(tx, original.ledgerEntries.map((entry) => entry.accountId));
        const transactionId = randomUUID();
        const entries: LedgerPost[] = original.ledgerEntries.map((entry) => ({
          accountId: entry.accountId,
          direction: entry.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT',
          amount: entry.amount,
          description: `Reversal ${input.reasonCode}`,
        }));
        await tx.transaction.create({
          data: {
            id: transactionId,
            transactionType: 'REVERSAL',
            status: 'SETTLED',
            sourceApp: 'CENTRAL_BANK_CORE',
            payerWalletId: original.payeeWalletId,
            payeeWalletId: original.payerWalletId,
            grossAmount: original.grossAmount,
            totalDebit: original.totalDebit,
            feeTotal: original.feeTotal,
            taxTotal: original.taxTotal,
            idempotencyKey: input.idempotency.key,
            originalTransactionId: original.id,
            metadata: { reason_code: input.reasonCode },
            settledAt: new Date(),
          },
        });
        await this.ledger.post(tx, { transactionId, entries: await this.applyEntries(tx, entries) });
        await tx.transaction.update({ where: { id: original.id }, data: { status: 'REVERSED' } });
        await this.audit.record({
          tx,
          actorUserId: input.actorUserId,
          serviceName: 'centralbank-core',
          action: 'TRANSACTION_REVERSED',
          targetType: 'transaction',
          targetId: original.id,
          requestId: input.requestId,
          reasonCode: input.reasonCode,
        });
        const response = {
          original_transaction_id: original.id,
          reversal_transaction_id: transactionId,
          status: 'SETTLED',
        };
        await this.idempotency.complete(tx, { ...input.idempotency, responseBody: asJson(response) });
        return response;
      }),
    );
  }
}
