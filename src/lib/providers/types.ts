import type { SetLookupResult } from '@/types';

/**
 * Interface for external set data providers (Rebrickable, Bricklink, etc.)
 *
 * This abstraction allows us to:
 * 1. Swap data sources in the future
 * 2. Mock providers in tests
 * 3. Potentially combine multiple sources
 */
export interface SetDataProvider {
  /**
   * Provider name for identification
   */
  readonly name: string;

  /**
   * Look up a single set by its set number
   * @param setNumber - The official Lego set number (e.g., "75192")
   * @returns Set data or null if not found
   */
  lookupSet(setNumber: string): Promise<SetLookupResult | null>;

  /**
   * Search for sets by query
   * @param query - Search query (name, theme, etc.)
   * @param options - Optional search parameters
   * @returns Array of matching sets
   */
  searchSets(
    query: string,
    options?: {
      limit?: number;
      theme?: string;
    }
  ): Promise<SetLookupResult[]>;

  /**
   * Get the image URL for a set
   * Some providers may have separate image endpoints
   * @param setNumber - The official Lego set number
   * @returns Image URL or null
   */
  getImageUrl(setNumber: string): Promise<string | null>;
}
