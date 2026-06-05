import { apiRequest } from './client';
import { Loan, LoanRepayment, ApiResult } from './types';

export const LoansApi = {
  createLoan: async (amount: string, purpose: string | undefined, idempotencyKey: string): Promise<ApiResult<Loan>> => {
    return apiRequest<Loan>('/loans/apply', {
      method: 'POST',
      body: {
        amount,
        purpose,
      },
      idempotencyKey,
    });
  },

  repayLoan: async (
    loanId: string,
    paymentAmount: string,
    idempotencyKey: string
  ): Promise<ApiResult<LoanRepayment>> => {
    return apiRequest<LoanRepayment>(`/loans/${loanId}/repay`, {
      method: 'POST',
      body: {
        amount: paymentAmount,
      },
      idempotencyKey,
    });
  },
};
