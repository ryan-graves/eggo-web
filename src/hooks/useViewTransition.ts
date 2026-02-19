'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';

/** SessionStorage key for tracking the last browse path */
export const LAST_BROWSE_PATH_KEY = 'eggo_last_browse_path';

/** SessionStorage key prefix for saving scroll positions per path */
export const SCROLL_POSITION_PREFIX = 'eggo_scroll_';

/**
 * Failsafe: clear direction after 3s if no view transition animation
 * fires (e.g., navigation was cancelled or browser doesn't fire
 * animationend on view transition pseudo-elements).
 *
 * 3s is long enough for most page fetches + the 300ms animation,
 * but short enough to clear before most data-loading transitions.
 */
const FAILSAFE_CLEANUP_DELAY = 3_000;

let failsafeTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Set the navigation direction on the root element so CSS view-transition
 * rules can apply the correct slide animation (forward push vs back pop).
 *
 * Cleanup happens in two ways:
 * 1. Primary: animationend event on the vt-push-* animation (precise)
 * 2. Failsafe: timer clears after 3s (handles edge cases)
 */
function setNavDirection(direction: 'forward' | 'back'): void {
  if (failsafeTimer) {
    clearTimeout(failsafeTimer);
  }
  document.documentElement.dataset.navDirection = direction;

  // Capture current scroll offset so CSS can clip the old-page snapshot
  // to the viewport-visible portion (prevents "scroll up" artifact).
  document.documentElement.style.setProperty('--vt-scroll-y', `-${window.scrollY}px`);

  // Save scroll position when navigating away so we can restore it later
  if (direction === 'forward') {
    sessionStorage.setItem(
      `${SCROLL_POSITION_PREFIX}${window.location.pathname}`,
      String(window.scrollY)
    );
  }

  failsafeTimer = setTimeout(() => {
    delete document.documentElement.dataset.navDirection;
    document.documentElement.style.removeProperty('--vt-scroll-y');
    failsafeTimer = null;
  }, FAILSAFE_CLEANUP_DELAY);
}

/** Clear the nav direction attribute, scroll offset, and any pending failsafe timer. */
function clearNavDirection(): void {
  if (failsafeTimer) {
    clearTimeout(failsafeTimer);
    failsafeTimer = null;
  }
  delete document.documentElement.dataset.navDirection;
  document.documentElement.style.removeProperty('--vt-scroll-y');
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

  /**
   * Go back in browser history with a back slide animation.
   * Used by form cancel/save actions where we want to return to
   * the previous page in history (not the browse view).
   */
  const goBack = useCallback(() => {
    setNavDirection('back');
    router.back();
  }, [router]);

  return { navigateTo, navigateBack, goBack, router };
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
 * Direction cleanup uses two strategies:
 * - Primary: listens for animationend events from the vt-push-*
 *   keyframes on view-transition pseudo-elements (precise timing).
 * - Failsafe: a 3s timer clears the attribute if no animation event
 *   fires (e.g., browser doesn't bubble pseudo-element events, or
 *   the navigation was cancelled).
 *
 * Mount once near the root of the app.
 */
export function useNavigationDirection(): void {
  useEffect(() => {
    // When a vt-push-* slide animation finishes, clear the direction
    // immediately so subsequent transitions (data loading) get the
    // default instant crossfade instead of another slide.
    const handleAnimationEnd = (e: AnimationEvent) => {
      if (e.animationName.startsWith('vt-push-')) {
        clearNavDirection();
      }
    };

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

    document.documentElement.addEventListener('animationend', handleAnimationEnd);
    document.addEventListener('click', handleClick, { capture: true });
    window.addEventListener('popstate', handlePopState);
    return () => {
      document.documentElement.removeEventListener('animationend', handleAnimationEnd);
      document.removeEventListener('click', handleClick, { capture: true });
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);
}
