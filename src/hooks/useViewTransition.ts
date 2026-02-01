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
   * Navigate forward with slide-from-right animation
   */
  const navigateTo = useCallback(
    (href: string) => {
      // Remove any lingering back direction
      document.documentElement.removeAttribute('data-nav-direction');
      router.push(href);
    },
    [router]
  );

  /**
   * Navigate back with slide-from-left animation
   */
  const navigateBack = useCallback(
    (fallbackHref?: string) => {
      // Set direction for CSS animation
      document.documentElement.setAttribute('data-nav-direction', 'back');

      if (fallbackHref) {
        router.push(fallbackHref);
      } else {
        router.back();
      }

      // Clean up after a delay (transition should be done)
      setTimeout(() => {
        document.documentElement.removeAttribute('data-nav-direction');
      }, 300);
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
