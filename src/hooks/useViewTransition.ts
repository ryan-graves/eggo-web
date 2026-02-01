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
      // Ensure forward direction (remove back class)
      document.documentElement.classList.remove('nav-back');
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
      document.documentElement.classList.add('nav-back');

      if (fallbackHref) {
        router.push(fallbackHref);
      } else {
        router.back();
      }

      // Clean up after transition completes
      setTimeout(() => {
        document.documentElement.classList.remove('nav-back');
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
