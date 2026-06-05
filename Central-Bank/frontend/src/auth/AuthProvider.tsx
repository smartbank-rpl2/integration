import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSessionToken, decodeJwtUser, UserPayload, isSessionExpired, clearSession } from './session';

type AuthState = {
  isAuthenticated: boolean;
  user: UserPayload | null;
  loading: boolean;
};

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  user: null,
  loading: true
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
  });

  useEffect(() => {
    const checkAuth = () => {
      const token = getSessionToken();
      if (!token || isSessionExpired(token)) {
        if (token) clearSession();
        setAuthState({ isAuthenticated: false, user: null, loading: false });
        return;
      }
      
      const user = decodeJwtUser(token);
      setAuthState({ isAuthenticated: !!user, user, loading: false });
    };

    checkAuth();

    const handleUnauthorized = () => {
      setAuthState({ isAuthenticated: false, user: null, loading: false });
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    const interval = setInterval(checkAuth, 60000);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      clearInterval(interval);
    };
  }, []);

  return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  return useContext(AuthContext);
}
