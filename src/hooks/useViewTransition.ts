'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

function supportsViewTransitions(): boolean {
  return typeof document !== 'undefined' && 'startViewTransition' in document;
}

function startViewTransition(callback: () => void): { finished: Promise<void> } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (document as any).startViewTransition(callback);
}

/**
 * Hook for navigating with view transitions
 * Provides animated page transitions using the View Transitions API
 */
export function useViewTransition() {
  const router = useRouter();

  /**
   * Navigate forward with slide-from-right animation
   */
  const navigateTo = useCallback(
    (href: string) => {
      // Remove any lingering back direction
      document.documentElement.removeAttribute('data-nav-direction');

      if (supportsViewTransitions()) {
        startViewTransition(() => {
          router.push(href);
        });
      } else {
        router.push(href);
      }
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

      const navigate = () => {
        if (fallbackHref) {
          router.push(fallbackHref);
        } else {
          router.back();
        }
      };

      if (supportsViewTransitions()) {
        const transition = startViewTransition(navigate);

        // Clean up after transition completes
        transition.finished
          .then(() => {
            document.documentElement.removeAttribute('data-nav-direction');
          })
          .catch(() => {
            document.documentElement.removeAttribute('data-nav-direction');
          });
      } else {
        navigate();
        document.documentElement.removeAttribute('data-nav-direction');
      }
    },
    [router]
  );

  return { navigateTo, navigateBack };
}

/**
 * Hook for back navigation only (backward compatibility)
 */
export function useBackNavigation() {
  const { navigateBack } = useViewTransition();
  return { goBack: navigateBack };
}
