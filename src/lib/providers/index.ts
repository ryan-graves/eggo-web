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
 * Defaults to Brickset for better data coverage. The Brickset provider uses
 * a server-side proxy (/api/brickset) so the API key doesn't need to be
 * available client-side.
 *
 * Falls back to Rebrickable only if NEXT_PUBLIC_USE_REBRICKABLE is explicitly
 * set to 'true'. This is useful for development without a Brickset API key.
 */
export function getSetDataProvider(): SetDataProvider {
  if (!currentProvider) {
    const useRebrickable = process.env.NEXT_PUBLIC_USE_REBRICKABLE === 'true';
    if (useRebrickable) {
      currentProvider = new RebrickableProvider();
    } else {
      currentProvider = new BricksetProvider();
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
