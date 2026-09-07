import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/domains/auth';
import { onUnauthorized } from '../api/client';
import type { SessionPayload } from '../api/types';
import type { MobileLoginPayload } from '../api/domains/auth';
import { clearToken, getToken, setToken } from './token';
import { registerForPush, unregisterForPush } from '../notifications/push';
import { disconnectEcho } from '../realtime/echo';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface SessionValue {
  status: Status;
  session: SessionPayload | null;
  signIn: (email: string, password: string) => Promise<void>;
  /** Adopt a login payload obtained another way — Google sign-in hands one back. */
  adoptSession: (payload: MobileLoginPayload) => Promise<void>;
  signOut: () => Promise<void>;
  /** Every device, not just this one. */
  signOutEverywhere: () => Promise<void>;
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
  // Held so sign-out can unregister this exact install rather than guessing.
  const pushToken = useRef<string | null>(null);
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
        // Not awaited: the app is usable before the phone is registered, and
        // Expo's token call can be slow on a cold network.
        void registerForPush().then((token) => {
          pushToken.current = token;
        });
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

  const adoptSession = useCallback(async (payload: MobileLoginPayload) => {
    await setToken(payload.token);
    setSession(payload);
    setStatus('authenticated');
    void registerForPush().then((token) => {
      pushToken.current = token;
    });
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const response = await authApi.login({ email, password });
      await adoptSession(response.data);
    },
    [adoptSession],
  );

  const signOut = useCallback(async () => {
    // Before the credential is cleared, because unregistering needs it — and
    // before anyone else signs in on this phone and starts getting these
    // orders.
    await unregisterForPush(pushToken.current);
    pushToken.current = null;
    disconnectEcho();

    // Best-effort revoke: if the phone is offline the token still has to leave
    // this device, so a failed call must not block the sign-out.
    try {
      await authApi.logout();
    } catch {
      // ignored on purpose — see above
    }
    await forget();
  }, [forget]);

  const signOutEverywhere = useCallback(async () => {
    // The API revokes every token and every push device in one call, so the
    // per-device unregister is redundant — this call is the whole point.
    try {
      await authApi.logoutAll();
    } catch {
      // Offline: at least this phone forgets its credential.
    }
    pushToken.current = null;
    disconnectEcho();
    await forget();
  }, [forget]);

  const value = useMemo<SessionValue>(
    () => ({ status, session, signIn, adoptSession, signOut, signOutEverywhere }),
    [status, session, signIn, adoptSession, signOut, signOutEverywhere],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}
