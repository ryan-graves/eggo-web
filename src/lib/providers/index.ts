import { RebrickableProvider } from './rebrickable';
import type { SetDataProvider } from './types';

export type { SetDataProvider } from './types';
export { RebrickableProvider } from './rebrickable';

// Singleton instance of the current provider
let currentProvider: SetDataProvider | null = null;

/**
 * Get the configured set data provider
 *
 * Currently defaults to Rebrickable. In the future, this could
 * be configurable per-user or per-collection.
 */
export function getSetDataProvider(): SetDataProvider {
  if (!currentProvider) {
    currentProvider = new RebrickableProvider();
  }
  return currentProvider;
}

/**
 * Set a custom provider (useful for testing)
 */
export function setSetDataProvider(provider: SetDataProvider): void {
  currentProvider = provider;
}
