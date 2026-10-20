import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { appUrl, isDemo, supabase } from '../lib/supabase';

interface AuthUser {
  id: string;
  email: string | null;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  /** True after the user opened a password-reset link; show the "new password" form. */
  recovery: boolean;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }>;
  signOut(): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const DEMO_USER: AuthUser = { id: 'demo-user', email: 'demo@example.com' };

function toUser(s: Session | null): AuthUser | null {
  return s ? { id: s.user.id, email: s.user.email ?? null } : null;
}

/** Remove "?code=..." left behind by email links so it is not shown or reused. */
function cleanAuthParams() {
  const url = new URL(window.location.href);
  if (url.searchParams.has('code') || url.searchParams.has('error_description')) {
    url.searchParams.delete('code');
    url.searchParams.delete('error');
    url.searchParams.delete('error_code');
    url.searchParams.delete('error_description');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(isDemo ? DEMO_USER : null);
  const [loading, setLoading] = useState(!isDemo);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(toUser(data.session));
      setLoading(false);
      cleanAuthParams();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(toUser(session));
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') setRecovery(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      recovery,
      async signIn(email, password) {
        if (!supabase) return;
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      async signUp(email, password) {
        if (!supabase) return { needsConfirmation: false };
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: appUrl() },
        });
        if (error) throw error;
        return { needsConfirmation: !data.session };
      },
      async signOut() {
        if (!supabase) return;
        await supabase.auth.signOut();
      },
      async sendPasswordReset(email) {
        if (!supabase) return;
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: appUrl() });
        if (error) throw error;
      },
      async updatePassword(password) {
        if (!supabase) return;
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setRecovery(false);
      },
    }),
    [user, loading, recovery],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
