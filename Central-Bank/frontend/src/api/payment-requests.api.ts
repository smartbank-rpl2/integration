import { apiRequest } from './client';
import { PaymentRequest, PaymentPayResult, ApiResult } from './types';

export const PaymentRequestsApi = {
  createRequest: async (
    sourceApp: string,
    payerWalletId: string,
    payeeWalletId: string,
    grossAmount: string,
    description: string,
    expiresAt: string,
    idempotencyKey: string
  ): Promise<ApiResult<PaymentRequest>> => {
    return apiRequest<PaymentRequest>('/payment-requests', {
      method: 'POST',
      body: {
        source_app: sourceApp,
        payer_wallet_id: payerWalletId,
        payee_wallet_id: payeeWalletId,
        gross_amount: grossAmount,
        description,
        expires_at: expiresAt,
      },
      idempotencyKey,
    });
  },

  payRequest: async (
    paymentRequestId: string,
    idempotencyKey: string
  ): Promise<ApiResult<PaymentPayResult>> => {
    return apiRequest<PaymentPayResult>(`/payment-requests/${paymentRequestId}/pay`, {
      method: 'POST',
      idempotencyKey,
    });
  },
};
