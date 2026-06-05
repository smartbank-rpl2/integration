import { apiRequest } from './client';
import { AuthTokens, AuthRegisterResult, ApiResult } from './types';

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export const AuthApi = {
  login: async (email: string, password: string): Promise<ApiResult<AuthTokens>> => {
    return apiRequest<AuthTokens>('/auth/login', {
      method: 'POST',
      body: { email, password },
      requireAuth: false,
    });
  },

  register: async (payload: RegisterPayload, idempotencyKey: string): Promise<ApiResult<AuthRegisterResult>> => {
    return apiRequest<AuthRegisterResult>('/auth/register', {
      method: 'POST',
      body: payload,
      idempotencyKey,
      requireAuth: false,
    });
  },
};
