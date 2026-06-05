import { client } from './client';
import { TransferResult } from './types';

export const TransferApi = {
  createTransfer: (toWalletId: string, amount: string, note?: string, idempotencyKey?: string) =>
    client.post<TransferResult>('/transfers', { to_wallet_id: toWalletId, amount, note }, { idempotencyKey }),
};
