'use client';

import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider } from './AuthProvider';
import { CollectionProvider } from '@/hooks/useCollection';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps): React.JSX.Element {
  return (
    <AuthProvider>
      <CollectionProvider>
        {children}
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
    </AuthProvider>
  );
}
