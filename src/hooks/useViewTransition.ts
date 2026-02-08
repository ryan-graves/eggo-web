'use client';

import { useRouter } from 'next/navigation';
import { useTransitionRouter } from 'next-view-transitions';
import { useCallback } from 'react';

/** SessionStorage key for tracking the last browse path */
export const LAST_BROWSE_PATH_KEY = 'eggo_last_browse_path';

/**
 * Hook for navigating with view transitions
 * Uses next-view-transitions for forward navigation (animated)
 * and the standard Next.js router for back navigation (instant)
 */
export function useViewTransition() {
  const transitionRouter = useTransitionRouter();
  const router = useRouter();

  /**
   * Navigate to a new page with view transition
   */
  const navigateTo = useCallback(
    (href: string) => {
      transitionRouter.push(href);
    },
    [transitionRouter]
  );

  /**
   * Navigate back without view transition for instant response.
   * Checks sessionStorage for the last browse path, otherwise uses
   * the fallback href.
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

  return { navigateTo, navigateBack, router: transitionRouter };
}

/**
 * Hook for back navigation only (backward compatibility)
 */
export function useBackNavigation() {
  const { navigateBack } = useViewTransition();
  return { goBack: navigateBack };
}
