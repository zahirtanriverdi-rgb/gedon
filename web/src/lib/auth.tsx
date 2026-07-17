'use client';

import React, { createContext, useContext, useState } from 'react';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

/**
 * In-memory session for a dashboard route group (vendor or admin). Mirrors the old App.tsx,
 * which kept the operator/admin JWT in React state (never localStorage) to match the token's
 * short lifetime. Because this provider lives in the route-group LAYOUT, the token survives
 * client navigation between /…/login and /…/dashboard, but a hard refresh clears it → the
 * dashboard redirects back to login (same behavior as before).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login: (u, tkn) => {
          setUser(u);
          setToken(tkn);
        },
        logout: () => {
          setUser(null);
          setToken(null);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
