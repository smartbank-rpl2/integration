import { apiRequest } from './client';
import { SupplyReport, LedgerEntry, ReversalResult, ApiResult } from './types';

export const CentralBankApi = {
  getSupply: async (): Promise<ApiResult<SupplyReport>> => {
    return apiRequest<SupplyReport>('/central-bank/supply');
  },

  getLedger: async (limit = 200, fromDate?: string, toDate?: string): Promise<ApiResult<LedgerEntry[]>> => {
    let url = `/central-bank/ledger?limit=${limit}`;
    if (fromDate) url += `&from=${fromDate}`;
    if (toDate) url += `&to=${toDate}`;
    return apiRequest<LedgerEntry[]>(url);
  },

  reverseTransaction: async (
    transactionId: string,
    reasonCode: string,
    note: string | undefined,
    idempotencyKey: string
  ): Promise<ApiResult<ReversalResult>> => {
    return apiRequest<ReversalResult>('/central-bank/reversals', {
      method: 'POST',
      body: {
        original_transaction_id: transactionId,
        reason_code: reasonCode,
        note,
      },
      idempotencyKey,
    });
  },
};
