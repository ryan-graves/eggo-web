import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps): React.JSX.Element {
  return <>{children}</>;
}
