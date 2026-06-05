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

export type SupplyReport = {
  total_supply: string;
  reserve_balance: string;
  circulating_supply: string;
  sink_or_burn_accounting: string;
  invariant_total: string;
  invariant_valid: boolean;
};

export type FeeQuote = {
  gross_amount: string;
  fee_total: string;
  tax_total: string;
  total_debit: string;
  components: Array<{
    type: string;
    amount: string;
    destination_account_id: string;
  }>;
};

export type PanelKey = 'overview' | 'transfer' | 'payments' | 'loans' | 'ledger';

export type LogEntry = {
  id: string;
  title: string;
  status: number;
  ok: boolean;
  timestamp: string;
  body: unknown;
};
