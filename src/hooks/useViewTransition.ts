'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

/** SessionStorage key for tracking the last browse path */
export const LAST_BROWSE_PATH_KEY = 'eggo_last_browse_path';

/**
 * Hook for navigating with view transitions.
 * With Next.js native viewTransition enabled, all router.push() calls
 * automatically trigger view transitions.
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
   * Navigate back. Checks sessionStorage for the last browse path,
   * otherwise uses the fallback href.
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
 * Hook for back navigation only (backward compatibility)
 */
export function useBackNavigation() {
  const { navigateBack } = useViewTransition();
  return { goBack: navigateBack };
}
