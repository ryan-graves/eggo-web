import type { Timestamp } from 'firebase/firestore';

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
 * UI theme/style preference
 */
export type UITheme = 'baseplate' | 'mono';

/**
 * User preferences stored in Firestore
 */
export interface UserPreferences {
  theme: ThemePreference;
  uiTheme: UITheme;
  updatedAt: Timestamp;
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
  occasion: string;
  dateReceived: string | null; // YYYY-MM-DD format
  owners: string[]; // Can have multiple owners for shared sets
  notes?: string;

  // Data provenance
  dataSource: DataSource;
  dataSourceId?: string;
  lastSyncedAt?: Timestamp;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * A collection of Lego sets (e.g., "The Graves Collection")
 */
export interface Collection {
  id: string;
  name: string;
  owners: string[]; // ["Ryan", "Alyssa"] - simple tags, not user references
  memberUserIds: string[]; // Users who can access this collection
  createdAt: Timestamp;
  updatedAt: Timestamp;
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
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
 * Input for creating a new set
 */
export type CreateLegoSetInput = Omit<LegoSet, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Input for updating a set
 */
export type UpdateLegoSetInput = Partial<Omit<LegoSet, 'id' | 'collectionId' | 'createdAt'>>;
