export type UserPayload = {
  sub: string;
  email: string;
  role: string;
  exp: number;
};

const TOKEN_KEY = 'central_bank_core_token';

export function getSessionToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setSessionToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearSession(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function decodeJwtUser(token: string | null): UserPayload | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as UserPayload;
    return payload;
  } catch {
    return null;
  }
}

export function isSessionExpired(token: string | null): boolean {
  const payload = decodeJwtUser(token);
  if (!payload) return true;
  // Check if expired (with 10-second buffer)
  return (payload.exp * 1000) < (Date.now() + 10000);
}
