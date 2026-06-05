import { client } from './client';
import { LedgerEntry } from './types';

export const LedgerApi = {
  getLedger: (params?: { from?: string; to?: string; account_id?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    if (params?.account_id) query.append('account_id', params.account_id);
    if (params?.limit) query.append('limit', params.limit.toString());
    
    const qs = query.toString();
    return client.get<LedgerEntry[]>(`/central-bank/ledger${qs ? `?${qs}` : ''}`);
  }
};
