'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from './AuthProvider';
import { CollectionProvider } from '@/hooks/useCollection';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps): React.JSX.Element {
  return (
    <AuthProvider>
      <CollectionProvider>{children}</CollectionProvider>
    </AuthProvider>
  );
}
