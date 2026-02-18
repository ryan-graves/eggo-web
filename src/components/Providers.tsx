'use client';

import { type ReactNode, ViewTransition } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider } from './AuthProvider';
import { UserPreferencesProvider } from './UserPreferencesProvider';
import { CollectionProvider } from '@/hooks/useCollection';
import { NavigationLoadingProvider } from '@/hooks/useNavigationLoading';
import { useNavigationDirection } from '@/hooks/useViewTransition';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps): React.JSX.Element {
  useNavigationDirection();

  return (
    <AuthProvider>
      <NavigationLoadingProvider>
        <UserPreferencesProvider>
          <CollectionProvider>
            <ViewTransition name="page">{children}</ViewTransition>
            <Toaster
              position="bottom-center"
              toastOptions={{
                style: {
                  background: 'var(--surface-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                },
              }}
            />
          </CollectionProvider>
        </UserPreferencesProvider>
      </NavigationLoadingProvider>
    </AuthProvider>
  );
}
