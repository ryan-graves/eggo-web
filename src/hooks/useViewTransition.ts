'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';

/** SessionStorage key for tracking the last browse path */
export const LAST_BROWSE_PATH_KEY = 'eggo_last_browse_path';

/** Duration to keep direction attribute before cleanup (ms) */
const DIRECTION_CLEANUP_DELAY = 400;

/**
 * Set the navigation direction on the root element so CSS view-transition
 * rules can apply the correct slide animation (forward push vs back pop).
 */
function setNavDirection(direction: 'back'): void {
  document.documentElement.dataset.navDirection = direction;
  setTimeout(() => {
    delete document.documentElement.dataset.navDirection;
  }, DIRECTION_CLEANUP_DELAY);
}

/**
 * Hook for navigating with view transitions.
 * With Next.js native viewTransition enabled, all router.push() calls
 * automatically trigger view transitions. This hook adds direction
 * tracking so back navigation gets a reverse "pop" animation.
 */
export function useViewTransition() {
  const router = useRouter();

  const navigateTo = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router]
  );

  /**
   * Navigate back with a reverse slide animation.
   * Checks sessionStorage for the last browse path, otherwise uses
   * the fallback href.
   */
  const navigateBack = useCallback(
    (fallbackHref?: string) => {
      setNavDirection('back');

      const lastBrowsePath =
        typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(LAST_BROWSE_PATH_KEY) : null;

      if (lastBrowsePath) {
        router.push(lastBrowsePath);
        return;
      }

      if (fallbackHref) {
        router.push(fallbackHref);
      } else {
        router.back();
      }
    },
    [router]
  );

  return { navigateTo, navigateBack, router };
}

/**
 * Hook for back navigation only (backward compatibility)
 */
export function useBackNavigation() {
  const { navigateBack } = useViewTransition();
  return { goBack: navigateBack };
}

/**
 * Hook that listens for browser back/forward navigation (popstate)
 * and sets the "back" direction so the view transition animates correctly.
 * Mount this once near the root of the app.
 */
export function usePopStateDirection(): void {
  useEffect(() => {
    const handlePopState = () => {
      setNavDirection('back');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
}
