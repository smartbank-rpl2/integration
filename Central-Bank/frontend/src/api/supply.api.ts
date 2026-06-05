import { client } from './client';
import { SupplyReport } from './types';

export const SupplyApi = {
  getSupply: () => client.get<SupplyReport>('/central-bank/supply'),
};
