'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { subscribeToUserPreferences, setUserPreferences } from '@/lib/supabase';
import type { ThemePreference } from '@/types';

const THEME_STORAGE_KEY = 'eggo-theme';

function getStoredTheme(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

function applyTheme(theme: ThemePreference): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

interface UserPreferencesContextValue {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  resolvedTheme: 'light' | 'dark';
}

export const UserPreferencesContext = createContext<UserPreferencesContextValue | null>(null);

export function useUserPreferencesProvider(): UserPreferencesContextValue {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<ThemePreference>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Initialize from localStorage on mount (hydration pattern for SSR)
  useEffect(() => {
    const storedTheme = getStoredTheme();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrating from localStorage on mount is a valid SSR pattern
    setThemeState(storedTheme);
    applyTheme(storedTheme);
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToUserPreferences(user.id, (prefs) => {
      if (prefs) {
        if (prefs.theme) {
          setThemeState(prefs.theme);
          localStorage.setItem(THEME_STORAGE_KEY, prefs.theme);
          applyTheme(prefs.theme);
        }
      }
    });

    return unsubscribe;
  }, [user?.id]);

  // Track resolved theme
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateResolvedTheme = () => {
      if (theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setResolvedTheme(isDark ? 'dark' : 'light');
      } else {
        setResolvedTheme(theme);
      }
    };

    updateResolvedTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateResolvedTheme);
    return () => mediaQuery.removeEventListener('change', updateResolvedTheme);
  }, [theme]);

  const setTheme = useCallback(
    (newTheme: ThemePreference) => {
      setThemeState(newTheme);
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      applyTheme(newTheme);

      if (user?.id) {
        setUserPreferences(user.id, { theme: newTheme }).catch(console.error);
      }
    },
    [user]
  );

  return { theme, setTheme, resolvedTheme };
}

export function useUserPreferences(): UserPreferencesContextValue {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
}

export function useTheme(): Pick<UserPreferencesContextValue, 'theme' | 'setTheme' | 'resolvedTheme'> {
  const { theme, setTheme, resolvedTheme } = useUserPreferences();
  return { theme, setTheme, resolvedTheme };
}
