'use client';

import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  subscribeToAuthChanges,
  signInWithGoogle as supabaseSignInWithGoogle,
  signOut as supabaseSignOut,
  isSupabaseConfigured,
  type User,
} from '@/lib/supabase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      console.error('Supabase is not configured. Check environment variables.');
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Setting error state on config failure is intentional
      setError('Supabase is not configured. Please check environment variables.');
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = subscribeToAuthChanges((supabaseUser) => {
        setUser(supabaseUser);
        setLoading(false);
      });

      return unsubscribe;
    } catch (err) {
      console.error('Failed to initialize Supabase Auth:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize authentication');
      setLoading(false);
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    try {
      await supabaseSignInWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in';
      setError(message);
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      await supabaseSignOut();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign out';
      setError(message);
      throw err;
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      signInWithGoogle,
      signOut,
    }),
    [user, loading, error, signInWithGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
