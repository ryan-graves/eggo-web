'use client';

import { useEffect, useRef } from 'react';
import { SCROLL_POSITION_PREFIX } from '@/hooks/useNavigation';

interface ScrollMemoryOptions {
  /** Pause saving, e.g. while a transition shows a skeleton that shrinks the page. */
  paused: boolean;
  /** Restore only once the real content is on the page. */
  ready: boolean;
  /**
   * Storage key; defaults to the pathname. A page that swaps views without
   * changing its URL (the public share page's Home/All Sets toggle) passes a
   * key per view so each remembers its own position.
   */
  key?: string;
}

/** Records that a view will be entered at the top, e.g. via the view toggle. */
export function resetScrollPosition(pathname: string): void {
  sessionStorage.setItem(`${SCROLL_POSITION_PREFIX}${pathname}`, '0');
}

/**
 * Remembers how far down each browse view is scrolled and restores it once per
 * mount, so returning from a set detail page (card click, header back, or the
 * browser's own back) lands where the user left off.
 *
 * Saved on every scroll event rather than on click: set cards navigate with
 * router.push inside the morph transition and browser back never goes through
 * navigateTo. The pathname guard skips the scroll-to-top Next performs for
 * the page being navigated to, whose event can still reach this listener.
 */
export function useScrollMemory(
  pathname: string,
  { paused, ready, key = pathname }: ScrollMemoryOptions
): void {
  useEffect(() => {
    if (paused) return;
    // This hook owns restoration for the history entry it is mounted on. Left
    // on 'auto', the browser also restores on back/forward, and iOS Safari
    // applies the position it recorded on the entry's first departure after
    // ours, so a second visit landed where the first one left off.
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    const saveScroll = (): void => {
      if (window.location.pathname !== pathname) return;
      sessionStorage.setItem(`${SCROLL_POSITION_PREFIX}${key}`, String(window.scrollY));
    };
    window.addEventListener('scroll', saveScroll, { passive: true });
    return () => window.removeEventListener('scroll', saveScroll);
  }, [pathname, key, paused]);

  // Once per mount: switching between views while mounted (the Home/All Sets
  // toggle) starts each view at the top instead.
  const hasRestoredRef = useRef(false);
  useEffect(() => {
    if (!ready || hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const savedScroll = sessionStorage.getItem(`${SCROLL_POSITION_PREFIX}${key}`);
    if (savedScroll) {
      window.scrollTo({ top: parseInt(savedScroll, 10), behavior: 'instant' });
    }
  }, [key, ready]);
}
