import type { Collection } from '@/types';

/**
 * localStorage key prefix for the collection a user last had active. Keyed
 * per user so two accounts sharing a browser don't inherit each other's
 * choice. Follows the `eggo_` convention used by the navigation keys.
 */
const ACTIVE_COLLECTION_KEY_PREFIX = 'eggo_active_collection:';

function storageKey(userId: string): string {
  return `${ACTIVE_COLLECTION_KEY_PREFIX}${userId}`;
}

export function readStoredActiveCollectionId(userId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(storageKey(userId));
  } catch {
    // Storage can be unavailable (private mode, blocked site data). Forgetting
    // the choice is the right fallback; the newest collection becomes active.
    return null;
  }
}

export function storeActiveCollectionId(userId: string, collectionId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(userId), collectionId);
  } catch {
    // See readStoredActiveCollectionId: a failed write just means the choice
    // isn't remembered across reloads.
  }
}

/**
 * Picks the collection to make active from the user's current list: the
 * remembered one if the user still belongs to it, otherwise the first
 * (newest) collection, or null when the list is empty.
 */
export function resolveActiveCollection(
  collections: Collection[],
  storedId: string | null
): Collection | null {
  if (storedId) {
    const remembered = collections.find((collection) => collection.id === storedId);
    if (remembered) return remembered;
  }
  return collections[0] ?? null;
}
