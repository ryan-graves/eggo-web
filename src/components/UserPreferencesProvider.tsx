'use client';

import type { ReactNode } from 'react';
import { UserPreferencesContext, useUserPreferencesProvider } from '@/hooks/useUserPreferences';

interface UserPreferencesProviderProps {
  children: ReactNode;
}

export function UserPreferencesProvider({ children }: UserPreferencesProviderProps): React.JSX.Element {
  const value = useUserPreferencesProvider();

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
}
