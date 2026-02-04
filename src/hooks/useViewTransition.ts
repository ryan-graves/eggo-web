'use client';

import { useTransitionRouter } from 'next-view-transitions';
import { useCallback } from 'react';

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
   * Uses browser history if the user navigated from within the app,
   * otherwise falls back to the provided href
   */
  const navigateBack = useCallback(
    (fallbackHref?: string) => {
      // Check if user came from within our app by examining the referrer
      const referrer = typeof document !== 'undefined' ? document.referrer : '';
      const isInternalNavigation = referrer && referrer.includes(window.location.origin);

      if (isInternalNavigation) {
        // User navigated here from within the app, use browser back
        router.back();
      } else if (fallbackHref) {
        // User landed directly on this page, use fallback
        router.push(fallbackHref);
      } else {
        // No fallback provided, try back anyway
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
