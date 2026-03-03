'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

/** SessionStorage key for tracking the last browse path */
export const LAST_BROWSE_PATH_KEY = 'eggo_last_browse_path';

/** SessionStorage key prefix for saving scroll positions per path */
export const SCROLL_POSITION_PREFIX = 'eggo_scroll_';

/**
 * Hook providing navigation helpers with scroll position tracking.
 * Saves scroll position on forward navigation so browse views can
 * restore it when the user returns.
 */
export function useNavigation() {
  const router = useRouter();

  const navigateTo = useCallback(
    (href: string) => {
      sessionStorage.setItem(
        `${SCROLL_POSITION_PREFIX}${window.location.pathname}`,
        String(window.scrollY)
      );
      router.push(href);
    },
    [router]
  );

  /**
   * Navigate back to the last browse view, or fall back to a given href.
   * Used by header back buttons and post-delete redirects.
   */
  const navigateBack = useCallback(
    (fallbackHref?: string) => {
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
 * Hook for back navigation only (used by Header component).
 */
export function useBackNavigation() {
  const { navigateBack } = useNavigation();
  return { goBack: navigateBack };
}
