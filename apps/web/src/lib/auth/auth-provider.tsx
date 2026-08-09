'use client';

import {
  GoogleAuthProvider,
  onIdTokenChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getFirebaseAuth, isFirebaseConfigured } from '../firebase/client';
import { setTokenProvider } from '../api/client';

/** Where the sign-in attempt is in its lifecycle. */
type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  /** The Firebase user, or null when signed out. */
  user: User | null;

  /** True until Firebase has finished restoring any stored session. */
  loading: boolean;

  isAuthenticated: boolean;

  /** True for a guest account created by Firebase Anonymous Authentication. */
  isAnonymous: boolean;

  signInGuest: () => Promise<void>;
  signInGoogle: () => Promise<void>;
  logout: () => Promise<void>;

  /**
   * The underlying lifecycle state.
   *
   * `loading` and `isAuthenticated` cover most needs, but a route guard has to
   * distinguish "still checking" from "definitely signed out" — collapsing
   * those into one boolean would redirect people mid-restore.
   */
  status: AuthStatus;

  /** Set when a sign-in attempt fails, for display on the login screen. */
  error: string | null;

  /** True while a sign-in call is in flight, for button loading states. */
  pending: boolean;

  /** False when the Firebase env vars are missing. */
  configured: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Owns the Firebase session.
 *
 * Firebase is the source of truth for authentication; this provider only
 * mirrors its state into React and hands the current ID token to the API
 * client. There is no separate server session to keep in step.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const queryClient = useQueryClient();

  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!configured) {
      // Without configuration there is no session to observe. Report
      // unauthenticated rather than hanging on a spinner forever.
      setStatus('unauthenticated');
      return;
    }

    const auth = getFirebaseAuth();

    /**
     * `onIdTokenChanged` rather than `onAuthStateChanged`: it fires on sign-in
     * and sign-out *and* on every hourly token refresh, which keeps the token
     * the API client hands out from going stale.
     */
    const unsubscribe = onIdTokenChanged(auth, (nextUser) => {
      setUser(nextUser);
      setStatus(nextUser ? 'authenticated' : 'unauthenticated');
    });

    /**
     * The one place a token is produced.
     *
     * The API client asks per request; `getIdToken()` returns the cached token
     * and only hits the network when it is close to expiring, so this is cheap.
     * `forceRefresh` is passed straight through and used only after a 401.
     */
    setTokenProvider(async (forceRefresh = false) => {
      const current = getFirebaseAuth().currentUser;
      return current ? current.getIdToken(forceRefresh) : null;
    });

    return unsubscribe;
  }, [configured]);

  /** Turns a Firebase error code into something worth showing a user. */
  const describeError = useCallback((cause: unknown): string => {
    const code =
      typeof cause === 'object' && cause !== null && 'code' in cause
        ? String((cause as { code: unknown }).code)
        : '';

    switch (code) {
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        return 'Sign-in was cancelled.';
      case 'auth/popup-blocked':
        return 'Your browser blocked the sign-in popup. Allow popups and try again.';
      case 'auth/network-request-failed':
        return 'Network error. Check your connection and try again.';
      case 'auth/operation-not-allowed':
        return 'This sign-in method is not enabled for the project.';
      case 'auth/unauthorized-domain':
        return 'This domain is not authorised in the Firebase console.';
      default:
        return 'Could not sign you in. Please try again.';
    }
  }, []);

  const signInGuest = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      await signInAnonymously(getFirebaseAuth());
    } catch (cause) {
      setError(describeError(cause));
      throw cause;
    } finally {
      setPending(false);
    }
  }, [describeError]);

  const signInGoogle = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Always show the chooser: without this, a returning user is signed
      // straight back into whichever account the browser remembers.
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(getFirebaseAuth(), provider);
    } catch (cause) {
      setError(describeError(cause));
      throw cause;
    } finally {
      setPending(false);
    }
  }, [describeError]);

  const logout = useCallback(async () => {
    await signOut(getFirebaseAuth());
    // Drop every cached response: the next user must not see the last one's
    // tasks flash on screen before their own load.
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo(
    () => ({
      user,
      loading: status === 'loading',
      isAuthenticated: status === 'authenticated' && user !== null,
      // Read from the Firebase user rather than tracked separately, so it can
      // never drift — and it flips to false automatically if a guest account is
      // later linked to Google.
      isAnonymous: user?.isAnonymous ?? false,
      signInGuest,
      signInGoogle,
      logout,
      status,
      error,
      pending,
      configured,
    }),
    [user, status, error, signInGuest, signInGoogle, logout, pending, configured],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
