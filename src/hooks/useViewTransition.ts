'use client';

import { useTransitionRouter } from 'next-view-transitions';
import { useCallback } from 'react';
import { useNavigationDirection } from '@/contexts';

/**
 * Hook for navigating with view transitions
 * Uses next-view-transitions for proper async handling with Next.js
 * Includes direction-aware transitions for slide animations
 */
export function useViewTransition() {
  const router = useTransitionRouter();
  const { setDirection } = useNavigationDirection();

  /**
   * Navigate forward to a new page with view transition
   * Page slides in from the right
   */
  const navigateTo = useCallback(
    (href: string) => {
      setDirection('forward');
      router.push(href);
    },
    [router, setDirection]
  );

  /**
   * Navigate back with view transition
   * Page slides in from the left
   */
  const navigateBack = useCallback(
    (fallbackHref?: string) => {
      setDirection('back');
      if (fallbackHref) {
        router.push(fallbackHref);
      } else {
        router.back();
      }
    },
    [router, setDirection]
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
