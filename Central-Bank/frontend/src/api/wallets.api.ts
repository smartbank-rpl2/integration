import { apiRequest } from './client';
import { WalletBalance, WalletTransaction, ApiResult } from './types';

export const WalletsApi = {
  getBalance: async (): Promise<ApiResult<WalletBalance>> => {
    return apiRequest<WalletBalance>('/wallets/me/balance');
  },

  getTransactions: async (): Promise<ApiResult<WalletTransaction[]>> => {
    return apiRequest<WalletTransaction[]>('/wallets/me/transactions');
  },
};
