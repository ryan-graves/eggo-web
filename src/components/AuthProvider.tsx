'use client';

import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import {
  subscribeToAuthChanges,
  signInWithGoogle as firebaseSignInWithGoogle,
  signOut as firebaseSignOut,
} from '@/lib/firebase';

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
    const unsubscribe = subscribeToAuthChanges((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    try {
      await firebaseSignInWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in';
      setError(message);
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      await firebaseSignOut();
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
