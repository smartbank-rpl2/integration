import { z } from 'zod';

export const schemas = {
  auth: {
    login: z.object({
      email: z.string().email('Please enter a valid email address'),
      password: z.string().min(1, 'Password is required'),
    }),
    register: z.object({
      name: z.string().min(1, 'Name is required'),
      email: z.string().email('Please enter a valid email address'),
      password: z.string().min(6, 'Password must be at least 6 characters'),
    }),
  },
  transfer: {
    create: z.object({
      destinationWalletId: z.string().min(1, 'Destination wallet is required'),
      amount: z.string().regex(/^\d+$/, 'Amount must be an integer string (minor units)'),
    }),
  },
  paymentRequest: {
    create: z.object({
      grossAmount: z.string().regex(/^\d+$/, 'Amount must be an integer string'),
      description: z.string().min(1, 'Description is required'),
    }),
    pay: z.object({
      paymentRequestId: z.string().min(1, 'Payment Request ID is required'),
    }),
  },
  loan: {
    create: z.object({
      amount: z.string().regex(/^\d+$/, 'Amount must be an integer string'),
    }),
    repay: z.object({
      amount: z.string().regex(/^\d+$/, 'Payment amount must be an integer string'),
    }),
  },
  reversal: {
    create: z.object({
      transactionId: z.string().min(1, 'Transaction ID is required'),
    }),
  },
};
