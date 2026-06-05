# Agent Rules for Central Bank Core

- Use MySQL 8.x with InnoDB for core financial storage.
- Central Bank Core is the single source of truth for money supply, reserve, balances, settlement, and ledger.
- All balance changes must go through `SettlementService`.
- All balance changes must be represented by double-entry ledger entries.
- Settled double-entry ledger postings must always balance: total debit equals total credit.
- Every financial POST must require and enforce `Idempotency-Key`.
- Money is integer-only minor unit. Use `BIGINT` in MySQL and `bigint`/Money value object in TypeScript.
- Never use floating point for money.
- Settlement must be atomic and concurrency-safe.
- Use row-level locking for accounts whose balances change. Lock account ids in deterministic order.
- Settled ledger entries are immutable.
- Corrections must use reversal transactions, never update/delete old settled ledger rows.
- Do not create programmable retail money as a default feature. Put automation in payment/request/policy layers only.
- Do not claim integration with real banks, Bank Indonesia, QRIS, production payment gateways, or production payment networks.
- Do not update wallet balances directly outside `SettlementService`.
