'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from './AuthProvider';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps): React.JSX.Element {
  return <AuthProvider>{children}</AuthProvider>;
}
