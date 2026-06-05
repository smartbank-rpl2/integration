import { client } from './client';
import { PaymentRequest, PaymentPayResult } from './types';

export const PaymentApi = {
  createPaymentRequest: (
    sourceApp: string,
    payerWalletId: string,
    payeeWalletId: string,
    grossAmount: string,
    description: string,
    expiresAt: string,
    idempotencyKey?: string,
  ) =>
    client.post<PaymentRequest>(
      '/payment-requests',
      {
        source_app: sourceApp,
        payer_wallet_id: payerWalletId,
        payee_wallet_id: payeeWalletId,
        gross_amount: grossAmount,
        description,
        expires_at: expiresAt,
      },
      { idempotencyKey },
    ),
  payPaymentRequest: (requestId: string, idempotencyKey?: string) =>
    client.post<PaymentPayResult>(`/payment-requests/${requestId}/pay`, undefined, { idempotencyKey }),
};
