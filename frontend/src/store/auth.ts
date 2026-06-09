import { create } from 'zustand';

export type Role =
  | 'WALLET_USER'
  | 'RETAIL'
  | 'RETAIL_CUSTOMER'
  | 'TELLER'
  | 'MANAGER'
  | 'ADMIN'
  | 'CENTRAL_BANK_ADMIN';

export interface User {
  id: string;
  phone?: string;
  email?: string;
  role: Role;
  name?: string;
  status: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('cbdc_token') : null,
  user: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('cbdc_user') || 'null') : null,
  
  setAuth: (token: string, user: User) => {
    localStorage.setItem('cbdc_token', token);
    localStorage.setItem('cbdc_user', JSON.stringify(user));
    set({ token, user });
  },
  
  logout: () => {
    localStorage.removeItem('cbdc_token');
    localStorage.removeItem('cbdc_user');
    set({ token: null, user: null });
  },
}));
