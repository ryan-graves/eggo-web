'use client';

import { useLayoutEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';

const SCROLL_STORAGE_PREFIX = 'eggo_scroll_';

/**
 * Hook for persisting and restoring scroll position across navigations.
 * Uses sessionStorage to store scroll positions per page path.
 * Uses useLayoutEffect to restore scroll before paint (no visible jump).
 *
 * @param enabled - Whether scroll persistence is enabled (default: true)
 * @returns Object with saveScrollPosition function for manual saving
 */
export function useScrollPersistence(enabled: boolean = true) {
  const pathname = usePathname();
  const hasRestored = useRef(false);
  const storageKey = `${SCROLL_STORAGE_PREFIX}${pathname}`;

  // Restore scroll position before paint using useLayoutEffect
  useLayoutEffect(() => {
    if (!enabled || hasRestored.current) return;

    const saved = sessionStorage.getItem(storageKey);
    if (saved) {
      const scrollY = parseInt(saved, 10);
      if (!isNaN(scrollY)) {
        // Use instant scroll to prevent visible animation
        window.scrollTo({ top: scrollY, behavior: 'instant' });
      }
      // Clear after restoring to prevent stale positions
      sessionStorage.removeItem(storageKey);
    }
    hasRestored.current = true;
  }, [enabled, storageKey]);

  // Save scroll position before navigation
  const saveScrollPosition = useCallback(() => {
    if (!enabled) return;
    sessionStorage.setItem(storageKey, window.scrollY.toString());
  }, [enabled, storageKey]);

  return { saveScrollPosition };
}

/**
 * Clears all stored scroll positions.
 * Useful when resetting app state (e.g., on logout).
 */
export function clearScrollPositions(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(SCROLL_STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => sessionStorage.removeItem(key));
}
