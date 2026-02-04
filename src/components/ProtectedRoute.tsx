'use client';

import { useEffect, type ReactNode } from 'react';
import { useTransitionRouter } from 'next-view-transitions';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps): React.JSX.Element {
  const { user, loading } = useAuth();
  const router = useTransitionRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/sign-in');
    }
  }, [user, loading, router]);

  // While loading or authenticated, render children
  // Children (CollectionPage) will handle showing skeleton loaders via isInitializing
  // This eliminates the double-loading-state flicker
  if (loading || user) {
    return <>{children}</>;
  }

  // Not loading and no user - will redirect via useEffect
  // Return null briefly while redirect happens
  return <></>;
}
