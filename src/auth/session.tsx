import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/domains/auth';
import { onUnauthorized } from '../api/client';
import type { SessionPayload } from '../api/types';
import { clearToken, getToken, setToken } from './token';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface SessionValue {
  status: Status;
  session: SessionPayload | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

/**
 * Owns "is someone signed in", and nothing else.
 *
 * Deliberately not a React Query hook the way the web's `useSession()` is. On
 * a phone the very first paint has to answer "login screen or app?", and that
 * answer depends on an async keystore read. Modelling it as a three-state
 * machine keeps the splash up until it is actually known, instead of flashing
 * the login screen at a signed-in seller on every cold start.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [session, setSession] = useState<SessionPayload | null>(null);
  const queryClient = useQueryClient();

  const forget = useCallback(async () => {
    await clearToken();
    setSession(null);
    setStatus('anonymous');
    // Server data belongs to the account that just left. Without this the next
    // sign-in paints the previous seller's orders until each query refetches.
    queryClient.clear();
  }, [queryClient]);

  // Restore on cold start: a token in the keystore is a claim, not proof, so
  // it is verified against /me before the app is shown.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getToken();
      if (!token) {
        if (!cancelled) setStatus('anonymous');
        return;
      }
      try {
        const response = await authApi.me();
        if (cancelled) return;
        setSession(response.data);
        setStatus('authenticated');
      } catch {
        // Revoked, expired, or the phone is offline. Either way we cannot
        // prove the session, so start at login rather than a broken shell.
        if (!cancelled) await forget();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [forget]);

  // Any request that comes back 401 means the token died mid-session.
  useEffect(() => onUnauthorized(() => void forget()), [forget]);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    await setToken(response.data.token);
    setSession(response.data);
    setStatus('authenticated');
  }, []);

  const signOut = useCallback(async () => {
    // Best-effort revoke: if the phone is offline the token still has to leave
    // this device, so a failed call must not block the sign-out.
    try {
      await authApi.logout();
    } catch {
      // ignored on purpose — see above
    }
    await forget();
  }, [forget]);

  const value = useMemo<SessionValue>(
    () => ({ status, session, signIn, signOut }),
    [status, session, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}
