import type { BricksetOwnedSet, SetLookupResult } from '@/types';

/**
 * Pure helpers for turning Brickset API v3 `getSets` records into Eggo
 * shapes. Shared by the browser-side `BricksetProvider` (set lookup via the
 * `/api/brickset` proxy) and the server-side collection import
 * (`bricksetCollection.ts`), so both read a Brickset record the same way.
 */

/** The fields Eggo reads from a Brickset `getSets` record. */
export interface BricksetSet {
  setID: number;
  number: string;
  numberVariant: number;
  name: string;
  year: number;
  theme: string;
  themeGroup: string;
  subtheme: string | null;
  pieces?: number | null;
  minifigs?: number | null;
  /** Absent on a handful of catalog records that have no picture at all. */
  image?: {
    thumbnailURL?: string | null;
    imageURL?: string | null;
  } | null;
  bricksetURL: string;
  /** The requesting user's collection record. Only meaningful when the request carried a userHash. */
  collection?: BricksetCollectionEntry;
}

export interface BricksetCollectionEntry {
  owned?: boolean;
  wanted?: boolean;
  qtyOwned?: number;
  qtyWanted?: number;
  rating?: number;
  notes?: string | null;
}

export interface BricksetSetsResponse {
  status: string;
  matches: number;
  sets: BricksetSet[];
  message?: string;
}

/**
 * Normalize a set number by adding the "-1" suffix if not present.
 * LEGO set numbers in databases typically use format "12345-1" where
 * the suffix indicates the variant (usually 1 for the standard release).
 */
export function normalizeSetNumber(setNumber: string): string {
  if (setNumber.includes('-')) {
    return setNumber;
  }
  return `${setNumber}-1`;
}

/**
 * Remove the variant suffix from a set number for display.
 * Converts "12345-1" back to "12345".
 */
export function displaySetNumber(setNumber: string): string {
  return setNumber.replace(/-\d+$/, '');
}

/**
 * Upgrade a Brickset image URL to the large version for better quality.
 * Brickset URLs follow patterns like:
 * - https://images.brickset.com/sets/small/12345-1.jpg (thumbnail ~140px)
 * - https://images.brickset.com/sets/images/12345-1.jpg (standard ~300px)
 * - https://images.brickset.com/sets/large/12345-1.jpg (large ~800px)
 *
 * This function converts any Brickset set image URL to use the /large/ path.
 */
export function upgradeToLargeImage(imageUrl: string | null): string | null {
  if (!imageUrl) return null;

  if (imageUrl.includes('images.brickset.com/sets/')) {
    return imageUrl
      .replace('/sets/small/', '/sets/large/')
      .replace('/sets/images/', '/sets/large/');
  }

  return imageUrl;
}

/** Prefer the standard image over the thumbnail, then upgrade to the large rendition. */
function bestImageUrl(set: BricksetSet): string | null {
  return upgradeToLargeImage(set.image?.imageURL || set.image?.thumbnailURL || null);
}

/** Brickset's canonical "number-variant" identifier, stored as `dataSourceId`. */
function sourceIdFor(set: BricksetSet): string {
  return `${set.number}-${set.numberVariant}`;
}

export function mapBricksetSetToLookupResult(set: BricksetSet): SetLookupResult {
  return {
    setNumber: displaySetNumber(set.number),
    name: set.name,
    year: set.year,
    pieceCount: set.pieces ?? null,
    theme: set.theme,
    subtheme: set.subtheme,
    imageUrl: bestImageUrl(set),
    sourceId: sourceIdFor(set),
    dataSource: 'brickset',
  };
}

/**
 * Map an owned-set record (a `getSets` row fetched with the user's hash and
 * `owned: 1`) to the compact shape the import flow works with. Quantity is
 * clamped to at least one copy: Brickset lists a set as owned even when
 * `qtyOwned` is left at zero.
 */
export function mapBricksetSetToOwnedSet(set: BricksetSet): BricksetOwnedSet {
  const qtyOwned = set.collection?.qtyOwned ?? 0;
  const notes = set.collection?.notes?.trim();

  return {
    bricksetSetId: set.setID,
    setNumber: displaySetNumber(set.number),
    sourceId: sourceIdFor(set),
    name: set.name,
    year: set.year || null,
    pieceCount: set.pieces ?? null,
    theme: set.theme || null,
    subtheme: set.subtheme || null,
    imageUrl: bestImageUrl(set),
    quantity: Math.max(1, qtyOwned),
    notes: notes ? notes : null,
  };
}
