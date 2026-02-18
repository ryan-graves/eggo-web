'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';

/** SessionStorage key for tracking the last browse path */
export const LAST_BROWSE_PATH_KEY = 'eggo_last_browse_path';

/** Duration to keep direction attribute before cleanup (ms).
 *  Must exceed the CSS animation duration (300ms) plus a buffer. */
const DIRECTION_CLEANUP_DELAY = 600;

/**
 * Set the navigation direction on the root element so CSS view-transition
 * rules can apply the correct slide animation (forward push vs back pop).
 * Non-navigation changes (data loading, skeleton swaps) won't have a
 * direction attribute and get the default instant crossfade.
 */
function setNavDirection(direction: 'forward' | 'back'): void {
  document.documentElement.dataset.navDirection = direction;
  setTimeout(() => {
    delete document.documentElement.dataset.navDirection;
  }, DIRECTION_CLEANUP_DELAY);
}

/**
 * Hook for navigating with view transitions.
 * Sets direction before pushing so the CSS slide animation fires.
 */
export function useViewTransition() {
  const router = useRouter();

  const navigateTo = useCallback(
    (href: string) => {
      setNavDirection('forward');
      router.push(href);
    },
    [router]
  );

  /**
   * Navigate back with a reverse slide animation.
   * Checks sessionStorage for the last browse path, otherwise uses
   * the fallback href.
   */
  const navigateBack = useCallback(
    (fallbackHref?: string) => {
      setNavDirection('back');

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

/**
 * Hook that sets navigation direction for:
 * 1. Internal <a> / <Link> clicks → "forward"
 * 2. Browser back/forward button (popstate) → "back"
 *
 * Mount once near the root of the app. Non-navigation changes
 * (data loading, skeleton swaps) don't set a direction and get
 * the default instant crossfade from CSS.
 */
export function useNavigationDirection(): void {
  useEffect(() => {
    // Set "forward" for any internal link click (capture phase runs before Next.js)
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || !href.startsWith('/')) return;

      // Don't set direction for modifier clicks (new tab, etc.)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      setNavDirection('forward');
    };

    // Set "back" for browser back/forward button
    const handlePopState = () => {
      setNavDirection('back');
    };

    document.addEventListener('click', handleClick, { capture: true });
    window.addEventListener('popstate', handlePopState);
    return () => {
      document.removeEventListener('click', handleClick, { capture: true });
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);
}
