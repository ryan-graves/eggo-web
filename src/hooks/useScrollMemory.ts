'use client';

import { useEffect, useRef } from 'react';
import { SCROLL_POSITION_PREFIX } from '@/hooks/useNavigation';

interface ScrollMemoryOptions {
  /** Pause saving, e.g. while a transition shows a skeleton that shrinks the page. */
  paused: boolean;
  /** Restore only once the real content is on the page. */
  ready: boolean;
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
export function useScrollMemory(pathname: string, { paused, ready }: ScrollMemoryOptions): void {
  useEffect(() => {
    if (paused) return;
    const saveScroll = (): void => {
      if (window.location.pathname !== pathname) return;
      sessionStorage.setItem(`${SCROLL_POSITION_PREFIX}${pathname}`, String(window.scrollY));
    };
    window.addEventListener('scroll', saveScroll, { passive: true });
    return () => window.removeEventListener('scroll', saveScroll);
  }, [pathname, paused]);

  // Once per mount: switching between views while mounted (the Home/All Sets
  // toggle) starts each view at the top instead.
  const hasRestoredRef = useRef(false);
  useEffect(() => {
    if (!ready || hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const savedScroll = sessionStorage.getItem(`${SCROLL_POSITION_PREFIX}${pathname}`);
    if (savedScroll) {
      window.scrollTo({ top: parseInt(savedScroll, 10), behavior: 'instant' });
    }
  }, [pathname, ready]);
}
