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
   * Always creates a new history entry (forward navigation) to preserve
   * the user's exploration trail. Determines destination from referrer
   * when possible, otherwise uses the fallback href.
   */
  const navigateBack = useCallback(
    (fallbackHref?: string) => {
      // Try to determine where the user came from
      const referrer = typeof document !== 'undefined' ? document.referrer : '';

      if (referrer && referrer.includes(window.location.origin)) {
        // Extract the path from the referrer URL
        try {
          const referrerUrl = new URL(referrer);
          const referrerPath = referrerUrl.pathname;
          // Navigate to where they came from (as a new history entry)
          router.push(referrerPath);
          return;
        } catch {
          // Invalid URL, fall through to fallback
        }
      }

      // No valid referrer, use fallback
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
