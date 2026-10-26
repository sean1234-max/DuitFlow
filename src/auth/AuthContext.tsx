import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '../supabase';

type AuthResult = { error: string | null; needsEmailConfirmation?: boolean };

interface AuthContextValue {
  isConfigured: boolean;
  isReady: boolean; // false until the saved session has been restored
  session: Session | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  deleteAccount: () => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Screens translate this code into the user's language.
export const NOT_CONFIGURED_ERROR = 'not_configured';
const NOT_CONFIGURED: AuthResult = { error: NOT_CONFIGURED_ERROR };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch((error: unknown) => console.warn('Could not restore session', error))
      .finally(() => setIsReady(true));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const value: AuthContextValue = {
    isConfigured: supabase !== null,
    isReady,
    session,
    signIn: async (email, password) => {
      if (!supabase) return NOT_CONFIGURED;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    signUp: async (email, password) => {
      if (!supabase) return NOT_CONFIGURED;
      const { data, error } = await supabase.auth.signUp({ email, password });
      // With "Confirm email" on, Supabase returns no session until the link is clicked.
      return { error: error?.message ?? null, needsEmailConfirmation: !error && !data.session };
    },
    signOut: async () => {
      if (!supabase) return NOT_CONFIGURED;
      const { error } = await supabase.auth.signOut();
      return { error: error?.message ?? null };
    },
    // Deleting a user needs the service role, so it runs in the delete-account Edge
    // Function; the database removes all of the user's rows (on delete cascade).
    deleteAccount: async () => {
      if (!supabase) return NOT_CONFIGURED;
      const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
      if (error) return { error: error.message };
      await supabase.auth.signOut({ scope: 'local' });
      return { error: null };
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
