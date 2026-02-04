'use client';

import { useTransitionRouter } from 'next-view-transitions';
import { useCallback } from 'react';

/** SessionStorage key for tracking the last browse path */
export const LAST_BROWSE_PATH_KEY = 'eggo_last_browse_path';

/**
 * Hook for navigating with view transitions
 * Uses next-view-transitions for proper async handling with Next.js
 */
export function useViewTransition() {
  const router = useTransitionRouter();

  /**
   * Navigate to a new page with view transition
   */
  const navigateTo = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router]
  );

  /**
   * Navigate back with view transition
   * Always creates a new history entry (forward navigation) to preserve
   * the user's exploration trail. Checks sessionStorage for the last browse
   * path, otherwise uses the fallback href.
   */
  const navigateBack = useCallback(
    (fallbackHref?: string) => {
      // Check sessionStorage for the last browse path (set by collection browse layout)
      const lastBrowsePath =
        typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(LAST_BROWSE_PATH_KEY) : null;

      if (lastBrowsePath) {
        router.push(lastBrowsePath);
        return;
      }

      // No stored path, use fallback
      if (fallbackHref) {
        router.push(fallbackHref);
      } else {
        // Last resort: use browser back
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
