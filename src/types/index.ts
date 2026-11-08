/**
 * Status of a Lego set in the collection
 */
export type SetStatus =
  | 'unopened' // Still sealed in box
  | 'in_progress' // Currently being built
  | 'rebuild_in_progress' // Being rebuilt
  | 'assembled' // Complete and built
  | 'disassembled'; // Was built, now taken apart

/**
 * User's theme preference
 */
export type ThemePreference = 'system' | 'light' | 'dark';

/**
 * Smart filter section types for the Home view
 */
export type SmartSectionType =
  | 'in_progress'
  | 'discover'
  | 'recently_added'
  | 'largest'
  | 'smallest'
  | 'newest_year'
  | 'oldest_year'
  | 'unopened'
  | 'assembled'
  | 'disassembled';

/**
 * Display style for a home section.
 * - standard: default carousel (horizontal scroll on mobile, responsive grid on desktop)
 * - featured: enlarged cards and a larger header, for small actionable sections
 * - gallery: denser cards, for theme sections meant to show breadth
 */
export type SectionDisplay = 'standard' | 'featured' | 'gallery';

/**
 * A home section configuration entry.
 * Either a smart filter (type is a SmartSectionType) or a theme filter (type is 'theme').
 * `display` is optional; absent means 'standard'.
 */
export type HomeSectionConfig =
  | { type: SmartSectionType; display?: SectionDisplay }
  | { type: 'theme'; themeName: string; display?: SectionDisplay };

export interface UserPreferences {
  theme: ThemePreference;
  updatedAt: string;
}

/**
 * Source of set data
 */
export type DataSource = 'rebrickable' | 'brickset' | 'bricklink' | 'manual';

/**
 * A Lego set in the collection
 */
export interface LegoSet {
  id: string;
  collectionId: string;

  // Core identifiers
  setNumber: string;
  name: string;

  // Data from provider (Rebrickable, etc.)
  pieceCount: number | null;
  year: number | null;
  theme: string | null;
  subtheme: string | null;
  imageUrl: string | null;

  // User can override the image
  customImageUrl?: string;

  // User data
  status: SetStatus;
  hasBeenAssembled: boolean;
  occasion?: string;
  dateReceived: string | null; // YYYY-MM-DD format
  owners: string[]; // Can have multiple owners for shared sets
  notes?: string;

  // Data provenance
  dataSource: DataSource;
  dataSourceId?: string;
  lastSyncedAt?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Settings for what fields are visible on the public share link
 */
export interface PublicViewSettings {
  showOwner: boolean;
  showDateReceived: boolean;
  showOccasion: boolean;
  showNotes: boolean;
  showStatus: boolean;
  showHomeView: boolean;
}

/**
 * A collection of Lego sets (e.g., "The Graves Collection")
 */
export interface Collection {
  id: string;
  name: string;
  owners: string[]; // ["Ryan", "Alyssa"] - simple tags, not user references
  memberUserIds: string[]; // Users who can access this collection
  isPublic?: boolean; // Whether collection is publicly viewable
  publicShareToken?: string; // Unique token for public share URL
  publicViewSettings?: PublicViewSettings; // Controls which fields are visible publicly
  homeSections?: HomeSectionConfig[]; // Home view layout, shared by all members and the public link
  createdAt: string;
  updatedAt: string;
}

/**
 * A user of the application
 */
export interface User {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  theme: ThemePreference;
  collectionIds: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Result from looking up a set via external API
 */
export interface SetLookupResult {
  setNumber: string;
  name: string;
  year: number | null;
  pieceCount: number | null;
  theme: string | null;
  subtheme: string | null;
  imageUrl: string | null;
  sourceId?: string;
  dataSource: DataSource;
}

/**
 * A set the user has marked as owned on Brickset, as returned by
 * `POST /api/brickset/collection`. Metadata matches what a Brickset lookup
 * would produce for the same set; `quantity` and `notes` come from the
 * user's Brickset collection record.
 */
export interface BricksetOwnedSet {
  /** Brickset's internal integer id for the set (what `setCollection` keys on). */
  bricksetSetId: number;
  /** Display form without the variant suffix, e.g. "10300". */
  setNumber: string;
  /** Brickset's "number-variant" identifier, e.g. "10300-1". Stored as `dataSourceId`. */
  sourceId: string;
  name: string;
  year: number | null;
  pieceCount: number | null;
  theme: string | null;
  subtheme: string | null;
  imageUrl: string | null;
  /** Copies owned according to Brickset. Always at least 1. */
  quantity: number;
  notes: string | null;
}

/**
 * Response body of `POST /api/brickset/collection`.
 */
export interface BricksetCollectionResponse {
  username: string;
  sets: BricksetOwnedSet[];
  /** True when the account is remembered for "Sync from Brickset". */
  linked: boolean;
}

/**
 * Response body of `GET /api/brickset/link`: whether the signed-in user has
 * a remembered Brickset account, and whether this deployment can remember
 * one at all (requires the server-side encryption key).
 */
export interface BricksetLinkStatus {
  available: boolean;
  linked: boolean;
  username?: string;
  linkedAt?: string;
  lastSyncedAt?: string | null;
}

/**
 * Input for creating a new set
 */
export type CreateLegoSetInput = Omit<LegoSet, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Input for updating a set
 */
export type UpdateLegoSetInput = Partial<Omit<LegoSet, 'id' | 'collectionId' | 'createdAt'>>;
