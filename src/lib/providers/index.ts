import { BricksetProvider } from './brickset';
import { RebrickableProvider } from './rebrickable';
import type { SetDataProvider } from './types';
import type { SetLookupResult } from '@/types';

export type { SetDataProvider } from './types';
export { BricksetProvider } from './brickset';
export { RebrickableProvider } from './rebrickable';

/**
 * A provider wrapper that tries Brickset first, then falls back to Rebrickable
 */
class FallbackProvider implements SetDataProvider {
  readonly name = 'brickset';
  private brickset = new BricksetProvider();
  private rebrickable = new RebrickableProvider();

  async lookupSet(setNumber: string): Promise<SetLookupResult | null> {
    try {
      return await this.brickset.lookupSet(setNumber);
    } catch (error) {
      console.warn('Brickset lookup failed, falling back to Rebrickable:', error);
      return this.rebrickable.lookupSet(setNumber);
    }
  }

  async searchSets(
    query: string,
    options?: { limit?: number; theme?: string }
  ): Promise<SetLookupResult[]> {
    try {
      return await this.brickset.searchSets(query, options);
    } catch (error) {
      console.warn('Brickset search failed, falling back to Rebrickable:', error);
      return this.rebrickable.searchSets(query, options);
    }
  }

  async getImageUrl(setNumber: string): Promise<string | null> {
    try {
      return await this.brickset.getImageUrl(setNumber);
    } catch (error) {
      console.warn('Brickset getImageUrl failed, falling back to Rebrickable:', error);
      return this.rebrickable.getImageUrl(setNumber);
    }
  }
}

// Singleton instance of the current provider
let currentProvider: SetDataProvider | null = null;

/**
 * Get the configured set data provider
 *
 * Defaults to Brickset with automatic fallback to Rebrickable on errors.
 * Set NEXT_PUBLIC_USE_REBRICKABLE=true to use Rebrickable exclusively.
 */
export function getSetDataProvider(): SetDataProvider {
  if (!currentProvider) {
    const useRebrickable = process.env.NEXT_PUBLIC_USE_REBRICKABLE === 'true';
    if (useRebrickable) {
      currentProvider = new RebrickableProvider();
    } else {
      // Use fallback provider that tries Brickset first, then Rebrickable
      currentProvider = new FallbackProvider();
    }
  }
  return currentProvider;
}

/**
 * Set a custom provider (useful for testing)
 */
export function setSetDataProvider(provider: SetDataProvider): void {
  currentProvider = provider;
}
