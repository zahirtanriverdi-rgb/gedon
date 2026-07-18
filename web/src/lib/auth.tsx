'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  // False until the stored session (if any) has been read from localStorage on the client.
  // Route guards must wait for this before redirecting to login, otherwise a hard refresh
  // would bounce a still-logged-in operator before their session finished loading.
  ready: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  // Merge server-confirmed profile edits into the live session (and its stored copy) so a
  // vendor's own profile/rate changes show up without logging out and back in.
  updateUser: (updated: User) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

type StoredSession = { user: User; token: string };

function loadSession(key: string): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.user && parsed.token ? parsed : null;
  } catch {
    return null;
  }
}

function saveSession(key: string, session: StoredSession) {
  try {
    window.localStorage.setItem(key, JSON.stringify(session));
  } catch {
    // localStorage unavailable (private browsing, quota) — session just won't survive a reload
  }
}

function clearSession(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * Session for a dashboard route group (vendor or admin). Persisted to localStorage under
 * `storageKey` so a page reload doesn't silently bounce a logged-in operator back to the
 * login screen — the JWT itself is valid for 24h (see server.ts). Each route group mounts
 * its own provider with its own key, so a vendor and an admin session can be live at once
 * without ever leaking each other's token (the old SPA's cross-portal token-bleed bug is
 * structurally impossible here).
 *
 * Hydration note: the initial render (server + first client pass) always starts logged-out;
 * the stored session is restored in an effect, flipping `ready` once done.
 */
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
