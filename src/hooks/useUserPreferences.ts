'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { subscribeToUserPreferences, setUserPreferences } from '@/lib/firebase';
import type { ThemePreference, UITheme, HomeSectionConfig } from '@/types';

const THEME_STORAGE_KEY = 'eggo-theme';
const UI_THEME_STORAGE_KEY = 'eggo-ui-theme';

function getStoredTheme(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

function getStoredUITheme(): UITheme {
  if (typeof window === 'undefined') return 'mono';
  const stored = localStorage.getItem(UI_THEME_STORAGE_KEY);
  if (stored === 'baseplate' || stored === 'mono') {
    return stored;
  }
  return 'mono';
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

function applyUITheme(uiTheme: UITheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-ui-theme', uiTheme);
}

interface UserPreferencesContextValue {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  resolvedTheme: 'light' | 'dark';
  uiTheme: UITheme;
  setUITheme: (uiTheme: UITheme) => void;
  homeSections: HomeSectionConfig[] | undefined;
  setHomeSections: (sections: HomeSectionConfig[]) => void;
}

export const UserPreferencesContext = createContext<UserPreferencesContextValue | null>(null);

export function useUserPreferencesProvider(): UserPreferencesContextValue {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<ThemePreference>('system');
  const [uiTheme, setUIThemeState] = useState<UITheme>('mono');
  const [homeSections, setHomeSectionsState] = useState<HomeSectionConfig[] | undefined>(undefined);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Initialize from localStorage on mount (hydration pattern for SSR)
  useEffect(() => {
    const storedTheme = getStoredTheme();
    const storedUITheme = getStoredUITheme();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrating from localStorage on mount is a valid SSR pattern
    setThemeState(storedTheme);
    setUIThemeState(storedUITheme);
    applyTheme(storedTheme);
    applyUITheme(storedUITheme);
  }, []);

  // Subscribe to Firestore preferences when user is logged in
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToUserPreferences(user.uid, (prefs) => {
      if (prefs) {
        if (prefs.theme) {
          setThemeState(prefs.theme);
          localStorage.setItem(THEME_STORAGE_KEY, prefs.theme);
          applyTheme(prefs.theme);
        }
        if (prefs.uiTheme) {
          setUIThemeState(prefs.uiTheme);
          localStorage.setItem(UI_THEME_STORAGE_KEY, prefs.uiTheme);
          applyUITheme(prefs.uiTheme);
        }
        if (prefs.homeSections) {
          setHomeSectionsState(prefs.homeSections);
        }
      }
    });

    return unsubscribe;
  }, [user?.uid]);

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

      if (user?.uid) {
        setUserPreferences(user.uid, { theme: newTheme }).catch(console.error);
      }
    },
    [user]
  );

  const setUITheme = useCallback(
    (newUITheme: UITheme) => {
      setUIThemeState(newUITheme);
      localStorage.setItem(UI_THEME_STORAGE_KEY, newUITheme);
      applyUITheme(newUITheme);

      if (user?.uid) {
        setUserPreferences(user.uid, { uiTheme: newUITheme }).catch(console.error);
      }
    },
    [user]
  );

  const setHomeSections = useCallback(
    (sections: HomeSectionConfig[]) => {
      setHomeSectionsState(sections);

      if (user?.uid) {
        setUserPreferences(user.uid, { homeSections: sections }).catch(console.error);
      }
    },
    [user]
  );

  return { theme, setTheme, resolvedTheme, uiTheme, setUITheme, homeSections, setHomeSections };
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

export function useUITheme(): Pick<UserPreferencesContextValue, 'uiTheme' | 'setUITheme'> {
  const { uiTheme, setUITheme } = useUserPreferences();
  return { uiTheme, setUITheme };
}

export function useHomeSections(): Pick<UserPreferencesContextValue, 'homeSections' | 'setHomeSections'> {
  const { homeSections, setHomeSections } = useUserPreferences();
  return { homeSections, setHomeSections };
}
