import * as Device from 'expo-device';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, apiSession, type SessionResponse } from '@/lib/api';
import { defaultApiUrl } from '@/lib/config';
import { storage, type StoredUser } from '@/lib/storage';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

type AuthContextValue = {
  status: AuthStatus;
  user: StoredUser | null;
  serverUrl: string;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setServerUrl: (url: string | null) => Promise<void>;
  /** Re-read the signed-in user's name / avatar after the profile changes. */
  updateUser: (patch: Partial<StoredUser>) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<StoredUser | null>(null);
  const [serverUrl, setServerUrlState] = useState(apiSession.getBaseUrl());

  const clearLocalSession = useCallback(async () => {
    apiSession.setTokens({ accessToken: null, refreshToken: null });
    await storage.clearSession();
    queryClient.clear();
    setUser(null);
    setStatus('signedOut');
  }, [queryClient]);

  // Restore the previous session on launch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const savedServer = await storage.getServerUrl();
      if (savedServer) {
        apiSession.setBaseUrl(savedServer);
        if (!cancelled) setServerUrlState(apiSession.getBaseUrl());
      }

      const saved = await storage.loadSession();
      if (cancelled) return;

      if (saved.refreshToken && saved.user) {
        apiSession.setTokens({ accessToken: saved.accessToken, refreshToken: saved.refreshToken });
        setUser(saved.user);
        setStatus('signedIn');
      } else {
        setStatus('signedOut');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // The API client tells us when the server rejects the refresh token (expired / revoked).
  useEffect(() => {
    apiSession.onSessionLost(() => {
      void clearLocalSession();
    });
    apiSession.onSessionRefreshed((refreshedUser) => setUser(refreshedUser));
  }, [clearLocalSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const session = await api<SessionResponse>('/api/mobile/auth/login', {
      method: 'POST',
      anonymous: true,
      body: {
        email: email.trim(),
        password,
        deviceName: [Device.manufacturer, Device.modelName].filter(Boolean).join(' ') || undefined,
      },
    });

    apiSession.setTokens({ accessToken: session.accessToken, refreshToken: session.refreshToken });
    await storage.saveTokens({ accessToken: session.accessToken, refreshToken: session.refreshToken });
    await storage.saveUser(session.user);
    setUser(session.user);
    setStatus('signedIn');
  }, []);

  const signOut = useCallback(async () => {
    const refreshToken = apiSession.getRefreshToken();
    if (refreshToken) {
      // Best effort: even if the server is unreachable the device is signed out locally.
      await api('/api/mobile/auth/logout', { method: 'POST', anonymous: true, body: { refreshToken } }).catch(() => {});
    }
    await clearLocalSession();
  }, [clearLocalSession]);

  const setServerUrl = useCallback(async (url: string | null) => {
    const cleaned = url?.trim() ? url.trim() : null;
    await storage.setServerUrl(cleaned);
    // Passing null falls back to the automatic address.
    apiSession.setBaseUrl(cleaned ?? defaultApiUrl());
    setServerUrlState(apiSession.getBaseUrl());
  }, []);

  const updateUser = useCallback(
    async (patch: Partial<StoredUser>) => {
      if (!user) return;
      const next = { ...user, ...patch };
      setUser(next);
      await storage.saveUser(next);
    },
    [user],
  );

  const value = useMemo(
    () => ({ status, user, serverUrl, signIn, signOut, setServerUrl, updateUser }),
    [status, user, serverUrl, signIn, signOut, setServerUrl, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
