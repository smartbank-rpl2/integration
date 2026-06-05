import { client } from './client';
import { WalletBalance, WalletTransaction } from './types';

export const WalletApi = {
  getWallet: () => client.get<WalletBalance>('/wallets/me/balance'),
  getTransactions: () => client.get<WalletTransaction[]>('/wallets/me/transactions'),
};
