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
  user: User | null;
  status: AuthStatus;
  /** Set when a sign-in attempt fails, for display on the login screen. */
  error: string | null;
  signInAsGuest: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  /** True while a sign-in call is in flight, for button loading states. */
  pending: boolean;
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

    // The API client asks for a token per request. `getIdToken()` returns the
    // cached one and only hits the network when it is close to expiring.
    setTokenProvider(async () => {
      const current = getFirebaseAuth().currentUser;
      return current ? current.getIdToken() : null;
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

  const signInAsGuest = useCallback(async () => {
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

  const signInWithGoogle = useCallback(async () => {
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
      status,
      error,
      signInAsGuest,
      signInWithGoogle,
      logout,
      pending,
      configured,
    }),
    [user, status, error, signInAsGuest, signInWithGoogle, logout, pending, configured],
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
