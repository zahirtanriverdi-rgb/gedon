'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  ready: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (updated: User) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);
type StoredSession = { user: User; token: string };

// JWT-nin payload hissəsini (2-ci blok) base64-dən decode edib vaxtını yoxlayır.
// Əgər token vaxtı bitibsə və ya formatı pozulubsa true qaytarır.
function isTokenExpired(token: string): boolean {
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return true;
    const decoded = JSON.parse(atob(payloadBase64));
    if (!decoded.exp) return false; // Əgər exp yoxdursa (nadir hal), müddətsiz sayırıq
    // exp saniyə ilədir, Date.now() millisaniyə ilədir
    return decoded.exp * 1000 < Date.now(); 
  } catch {
    return true; // Decode xətası versə, token etibarsızdır
  }
}

function loadSession(key: string): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.user && parsed.token) {
      // Əgər token vaxtı bitibsə, localStorage-u dərhal təmizləyib null qaytarırıq
      if (isTokenExpired(parsed.token)) {
        window.localStorage.removeItem(key);
        return null;
      }
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function saveSession(key: string, session: StoredSession) {
  try {
    window.localStorage.setItem(key, JSON.stringify(session));
  } catch {
    // localStorage unavailable
  }
}

function clearSession(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function AuthProvider({
  storageKey,
  children,
}: {
  storageKey: string;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = loadSession(storageKey);
    if (stored) {
      setUser(stored.user);
      setToken(stored.token);
    }
    setReady(true);
  }, [storageKey]);

  // api.ts-dən gələn 401 (Unauthorized) hadisəsini dinləyirik.
  // Əgər arxa planda token vaxtı bitərsə, bu event tetiklenecek.
  useEffect(() => {
    const handleUnauthorized = () => {
      clearSession(storageKey);
      setUser(null);
      setToken(null);
      
      // İstifadəçini uyğun login səhifəsinə yönləndir (əgər artıq login səhifəsində deyilsə)
      const path = window.location.pathname;
      if (path.startsWith('/admin') && !path.includes('/login')) {
        window.location.href = '/admin/login';
      } else if (path.startsWith('/vendor') && !path.includes('/login')) {
        window.location.href = '/vendor/login';
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [storageKey]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        ready,
        login: (u, tkn) => {
          setUser(u);
          setToken(tkn);
          saveSession(storageKey, { user: u, token: tkn });
        },
        logout: () => {
          setUser(null);
          setToken(null);
          clearSession(storageKey);
        },
        updateUser: (updated) => {
          setUser((prev) => {
            if (!prev || prev.id !== updated.id) return prev;
            const merged = { ...prev, ...updated };
            setToken((tkn) => {
              if (tkn) saveSession(storageKey, { user: merged, token: tkn });
              return tkn;
            });
            return merged;
          });
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const VENDOR_SESSION_KEY = 'gedekgorek_vendor_session';
export const ADMIN_SESSION_KEY = 'gedekgorek_admin_session';

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}