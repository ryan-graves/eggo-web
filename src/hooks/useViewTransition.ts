'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';

/** SessionStorage key for tracking the last browse path */
export const LAST_BROWSE_PATH_KEY = 'eggo_last_browse_path';

/** Failsafe: clear direction after 10s if no view transition fires
 *  (e.g., navigation was cancelled). */
const FAILSAFE_CLEANUP_DELAY = 10_000;

let failsafeTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Set the navigation direction on the root element so CSS view-transition
 * rules can apply the correct slide animation (forward push vs back pop).
 *
 * The attribute persists until the view transition finishes (cleaned up by
 * the patched startViewTransition in useNavigationDirection). A failsafe
 * timer clears it after 10s in case no transition fires.
 */
function setNavDirection(direction: 'forward' | 'back'): void {
  if (failsafeTimer) {
    clearTimeout(failsafeTimer);
  }
  document.documentElement.dataset.navDirection = direction;
  failsafeTimer = setTimeout(() => {
    delete document.documentElement.dataset.navDirection;
    failsafeTimer = null;
  }, FAILSAFE_CLEANUP_DELAY);
}

/** Clear the nav direction attribute and any pending failsafe timer. */
function clearNavDirection(): void {
  if (failsafeTimer) {
    clearTimeout(failsafeTimer);
    failsafeTimer = null;
  }
  delete document.documentElement.dataset.navDirection;
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
 * Also patches document.startViewTransition so that the direction
 * attribute is automatically cleared after each transition finishes.
 * This is necessary because page fetching can take longer than a
 * fixed timer, but we still need the attribute gone before subsequent
 * non-navigation transitions (data loading, skeleton swaps).
 *
 * Mount once near the root of the app.
 */
export function useNavigationDirection(): void {
  useEffect(() => {
    // Patch startViewTransition to clean up direction after each transition.
    // The direction attribute must survive until the transition starts (which
    // can be delayed by page fetching), so we can't use a fixed timer.
    let originalSVT: typeof document.startViewTransition | undefined;
    if (typeof document.startViewTransition === 'function') {
      originalSVT = document.startViewTransition.bind(document);
      document.startViewTransition = function (
        callbackOptions?: ViewTransitionUpdateCallback | StartViewTransitionOptions
      ) {
        const transition = originalSVT!(callbackOptions);
        transition.finished.finally(clearNavDirection);
        return transition;
      };
    }

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
      if (originalSVT) {
        document.startViewTransition = originalSVT;
      }
    };
  }, []);
}
