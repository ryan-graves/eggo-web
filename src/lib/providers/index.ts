import { BricksetProvider } from './brickset';
import { RebrickableProvider } from './rebrickable';
import type { SetDataProvider } from './types';

export type { SetDataProvider } from './types';
export { BricksetProvider } from './brickset';
export { RebrickableProvider } from './rebrickable';

// Singleton instance of the current provider
let currentProvider: SetDataProvider | null = null;

/**
 * Get the configured set data provider
 *
 * Defaults to Brickset for better data coverage.
 * Falls back to Rebrickable if Brickset API key is not configured.
 */
export function getSetDataProvider(): SetDataProvider {
  if (!currentProvider) {
    const bricksetKey = process.env.NEXT_PUBLIC_BRICKSET_API_KEY;
    if (bricksetKey) {
      currentProvider = new BricksetProvider(bricksetKey);
    } else {
      currentProvider = new RebrickableProvider();
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
