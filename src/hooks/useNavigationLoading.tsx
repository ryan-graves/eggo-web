'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

interface NavigationLoadingContextValue {
  /** The href currently being navigated to, or null if idle */
  pendingHref: string | null;
  /** Call when a navigation-triggering element is tapped */
  startNavigation: (href: string) => void;
}

const NavigationLoadingContext = createContext<NavigationLoadingContextValue>({
  pendingHref: null,
  startNavigation: () => {},
});

export function NavigationLoadingProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Clear pending state when the pathname changes (navigation completed).
  // This is the React-recommended "adjusting state based on props" pattern.
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (pendingHref !== null) {
      setPendingHref(null);
    }
  }

  const startNavigation = useCallback((href: string) => {
    setPendingHref(href);
  }, []);

  // Intercept all internal link clicks to trigger the loading state.
  // This catches links we don't explicitly wrap (View All, settings, etc.)
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || !href.startsWith('/')) return;

      // Don't trigger for modifier clicks (new tab, etc.)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      setPendingHref((current) => {
        // Don't set if already pending for this href
        if (current === href) return current;
        return href;
      });
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <NavigationLoadingContext.Provider value={{ pendingHref, startNavigation }}>
      {children}
    </NavigationLoadingContext.Provider>
  );
}

export function useNavigationLoading(): NavigationLoadingContextValue {
  return useContext(NavigationLoadingContext);
}
