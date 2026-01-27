'use client';

import type { ReactNode } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps): React.JSX.Element {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
