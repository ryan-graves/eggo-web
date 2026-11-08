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

const BRICKSET_SET_IMAGE_PATH = 'images.brickset.com/sets/';

/**
 * Brickset serves set photos in three renditions:
 * - https://images.brickset.com/sets/small/12345-1.jpg   (thumbnail)
 * - https://images.brickset.com/sets/images/12345-1.jpg  (standard, ~700px, every set has one)
 * - https://images.brickset.com/sets/large/12345-1.jpg   (~2400px, newer sets only)
 *
 * The large rendition is far better for background removal, but older sets
 * (e.g. 6339 from 1995) simply don't have one and the URL 404s. So Eggo
 * stores the standard URL, which always exists, and `/api/remove-background`
 * tries the large sibling first when it fetches the source image.
 */
export function standardBricksetImage(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  if (imageUrl.includes(BRICKSET_SET_IMAGE_PATH)) {
    return imageUrl
      .replace('/sets/small/', '/sets/images/')
      .replace('/sets/large/', '/sets/images/');
  }
  return imageUrl;
}

/** The large rendition of a Brickset set image, or null for any other URL. May 404; callers must fall back. */
export function bricksetLargeImageVariant(imageUrl: string): string | null {
  if (!imageUrl.includes(BRICKSET_SET_IMAGE_PATH)) return null;
  const large = imageUrl
    .replace('/sets/small/', '/sets/large/')
    .replace('/sets/images/', '/sets/large/');
  return large === imageUrl ? null : large;
}

/**
 * The source images to try for background removal, best first. Brickset
 * standard URLs get their large sibling ahead of themselves; anything else
 * is used as-is.
 */
export function sourceImageCandidates(imageUrl: string): string[] {
  const large = bricksetLargeImageVariant(imageUrl);
  return large ? [large, imageUrl] : [imageUrl];
}

/** Prefer the standard image over the thumbnail, normalized to the rendition every set has. */
function bestImageUrl(set: BricksetSet): string | null {
  return standardBricksetImage(set.image?.imageURL || set.image?.thumbnailURL || null);
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
