'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Hook for navigating back with view transition animation
 * Sets data-nav-direction="back" to trigger slide-from-left animation
 */
export function useBackNavigation() {
  const router = useRouter();

  const goBack = useCallback(
    (fallbackHref?: string) => {
      // Set direction for CSS animation
      document.documentElement.setAttribute('data-nav-direction', 'back');

      // Clean up after animation
      const cleanup = () => {
        document.documentElement.removeAttribute('data-nav-direction');
      };

      // Use View Transitions API if available
      if (typeof document !== 'undefined' && 'startViewTransition' in document) {
        (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
          if (fallbackHref) {
            router.push(fallbackHref);
          } else {
            router.back();
          }
        });
        // Clean up after transition
        setTimeout(cleanup, 300);
      } else {
        // Fallback for browsers without View Transitions
        if (fallbackHref) {
          router.push(fallbackHref);
        } else {
          router.back();
        }
        cleanup();
      }
    },
    [router]
  );

  return { goBack };
}
