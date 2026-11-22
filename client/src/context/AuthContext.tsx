import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as api from '../services/auth.api';
import { setUnauthorizedHandler } from '../services/http';
import { LoginPayload, RegisterPayload, User } from '../types/auth.types';
import { clearToken, getToken, saveToken } from '../utils/tokenStorage';

interface AuthContextValue {
  user: User | null;
  isAuthReady: boolean;
  authError: string | null;
  isAuthLoading: boolean;
  /** Why the user was signed out by the server (shown on /sign-in), e.g. another device signed in (A-9). */
  signedOutReason: string | null;
  signIn(payload: LoginPayload): Promise<boolean>;
  signUp(payload: RegisterPayload): Promise<boolean>;
  signOut(): Promise<void>;
  clearSignedOutReason(): void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const message = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Please try again.');

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [signedOutReason, setSignedOutReason] = useState<string | null>(null);

  /** The server ended the session (401): forget the token and remember why. */
  const forceSignOut = useCallback((reason: string) => {
    clearToken();
    setUser(null);
    setSignedOutReason(reason);
  }, []);

  const signOut = useCallback(async () => {
    if (getToken()) await api.logout().catch(() => undefined);
    clearToken();
    setUser(null);
    setSignedOutReason(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(forceSignOut);
    if (!getToken()) {
      setIsAuthReady(true);
      return;
    }
    api.getMe().then(setUser).catch(() => clearToken()).finally(() => setIsAuthReady(true));
  }, [forceSignOut]);

  const run = useCallback(async (fn: () => Promise<{ accessToken: string; user: User }>) => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fn();
      saveToken(res.accessToken);
      setSignedOutReason(null);
      // /auth/me also returns an instructor's cohorts.
      setUser(await api.getMe().catch(() => res.user));
      return true;
    } catch (e) {
      setAuthError(message(e));
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const signIn = useCallback((p: LoginPayload) => run(() => api.login(p)), [run]);
  const signUp = useCallback((p: RegisterPayload) => run(() => api.register(p)), [run]);

  const value = useMemo(
    () => ({
      user, isAuthReady, authError, isAuthLoading, signedOutReason, signIn, signUp, signOut,
      clearSignedOutReason: () => setSignedOutReason(null),
    }),
    [user, isAuthReady, authError, isAuthLoading, signedOutReason, signIn, signUp, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
