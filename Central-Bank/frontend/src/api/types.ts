export type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  error: null | {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
  meta: {
    request_id: string;
    timestamp: string;
  };
};

export type ApiResult<T = unknown> = {
  ok: boolean;
  status: number;
  envelope: ApiEnvelope<T>;
};

export type WalletBalance = {
  wallet_id: string;
  currency: string;
  available_balance: string;
  hold_balance: string;
};

export type WalletTransaction = {
  transaction_id: string;
  transaction_type: string;
  status: string;
  source_app: string;
  gross_amount: string;
  total_debit: string;
  fee_total: string;
  tax_total: string;
  created_at: string;
  settled_at: string | null;
  direction: 'IN' | 'OUT';
};

export type FeeComponent = {
  type: string;
  amount: string;
  destination_account_id: string;
};

export type FeeQuote = {
  gross_amount: string;
  fee_total: string;
  tax_total: string;
  total_debit: string;
  components: FeeComponent[];
};

export type SupplyReport = {
  total_supply: string;
  reserve_balance: string;
  circulating_supply: string;
  sink_or_burn_accounting: string;
  invariant_total: string;
  invariant_valid: boolean;
};

export type LedgerEntry = {
  id: string;
  transactionId: string;
  entryNo: number;
  accountId: string;
  direction: 'DEBIT' | 'CREDIT';
  amount: string;
  currency: string;
  balanceAfter: string | null;
  description: string;
  createdAt: string;
};

export type PaymentRequest = {
  payment_request_id: string;
  status: string;
  gross_amount: string;
  amount_due: string;
  fee_total: string;
  tax_total: string;
};

export type Loan = {
  loan_id: string;
  transaction_id: string;
  principal: string;
  interest_amount: string;
  total_due: string;
  status: string;
};

export type LoanRepayment = {
  loan_id: string;
  transaction_id: string;
  status: string;
  remaining_due: string;
};

export type ReversalResult = {
  original_transaction_id: string;
  reversal_transaction_id: string;
  status: string;
};

export type AuthTokens = {
  access_token: string;
  expires_in: number;
};

export type AuthRegisterResult = {
  user_id: string;
  wallet_id: string;
  initial_distribution: {
    transaction_id?: string;
    wallet_id: string;
    initial_balance: string;
  };
};

export type TransferResult = {
  transaction_id: string;
  status: string;
  amount: string;
  total_debit: string;
  fee_total: string;
  tax_total: string;
};

export type PaymentPayResult = {
  payment_request_id: string;
  transaction_id: string;
  status: string;
};
