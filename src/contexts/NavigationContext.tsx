'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

type NavigationDirection = 'forward' | 'back' | 'none';

const SCROLL_STORAGE_PREFIX = 'eggo_scroll_';

interface NavigationContextValue {
  direction: NavigationDirection;
  setDirection: (direction: NavigationDirection) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps): React.JSX.Element {
  const [direction, setDirectionState] = useState<NavigationDirection>('none');

  const setDirection = useCallback((newDirection: NavigationDirection) => {
    setDirectionState(newDirection);
    // Set data attribute on document for CSS to target
    document.documentElement.dataset.navDirection = newDirection;

    // Save scroll position when navigating forward (drilling into details)
    if (newDirection === 'forward' && typeof window !== 'undefined') {
      const storageKey = `${SCROLL_STORAGE_PREFIX}${window.location.pathname}`;
      sessionStorage.setItem(storageKey, window.scrollY.toString());
    }
  }, []);

  // Initialize data attribute on mount
  useEffect(() => {
    document.documentElement.dataset.navDirection = 'none';
    return () => {
      delete document.documentElement.dataset.navDirection;
    };
  }, []);

  return (
    <NavigationContext.Provider value={{ direction, setDirection }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigationDirection(): NavigationContextValue {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigationDirection must be used within a NavigationProvider');
  }
  return context;
}
