import { apiRequest } from './client';
import { TransferResult, ApiResult } from './types';

export const TransfersApi = {
  createTransfer: async (
    toWalletId: string,
    amount: string,
    note: string | undefined,
    idempotencyKey: string
  ): Promise<ApiResult<TransferResult>> => {
    return apiRequest<TransferResult>('/transfers', {
      method: 'POST',
      body: {
        to_wallet_id: toWalletId,
        amount,
        note,
      },
      idempotencyKey,
    });
  },
};
