import { apiRequest } from './client';
import { FeeQuote, ApiResult } from './types';

export const FeesApi = {
  quote: async (sourceApp: 'TRANSFER' | 'MARKETPLACE' | 'POS' | 'SUPPLIER' | 'LOGISTICS', amount: string): Promise<ApiResult<FeeQuote>> => {
    return apiRequest<FeeQuote>('/fees/quote', {
      method: 'POST',
      body: {
        source_app: sourceApp,
        amount,
      },
      requireAuth: false,
    });
  },
};
