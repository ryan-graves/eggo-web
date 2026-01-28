import type { SetLookupResult } from '@/types';
import type { SetDataProvider } from './types';

// Use our API proxy to avoid CORS issues
const BRICKSET_API_PROXY = '/api/brickset';

interface BricksetSet {
  setID: number;
  number: string;
  numberVariant: number;
  name: string;
  year: number;
  theme: string;
  themeGroup: string;
  subtheme: string | null;
  pieces: number | null;
  minifigs: number | null;
  image: {
    thumbnailURL: string | null;
    imageURL: string | null;
  };
  bricksetURL: string;
}

interface BricksetResponse {
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
function normalizeSetNumber(setNumber: string): string {
  if (setNumber.includes('-')) {
    return setNumber;
  }
  return `${setNumber}-1`;
}

/**
 * Remove the variant suffix from a set number for display.
 * Converts "12345-1" back to "12345".
 */
function displaySetNumber(setNumber: string): string {
  return setNumber.replace(/-\d+$/, '');
}

export class BricksetProvider implements SetDataProvider {
  readonly name = 'brickset';

  // API key is handled server-side by the /api/brickset proxy

  private async fetch(
    method: string,
    params: Record<string, string>
  ): Promise<BricksetResponse> {
    // Build URL with query params - use relative URL for browser compatibility
    const searchParams = new URLSearchParams();
    searchParams.set('method', method);

    // Pass params as JSON string
    if (Object.keys(params).length > 0) {
      searchParams.set('params', JSON.stringify(params));
    }

    const response = await fetch(`${BRICKSET_API_PROXY}?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Brickset API HTTP error:', response.status, text);
      throw new Error(`Brickset API error: ${response.status} ${response.statusText}`);
    }

    const data: BricksetResponse = await response.json();

    if (data.status !== 'success') {
      console.error('Brickset API returned error:', data);
      throw new Error(`Brickset API error: ${data.message || 'Unknown error'}`);
    }

    return data;
  }

  private mapToResult(set: BricksetSet): SetLookupResult {
    return {
      setNumber: displaySetNumber(set.number),
      name: set.name,
      year: set.year,
      pieceCount: set.pieces,
      theme: set.theme,
      subtheme: set.subtheme,
      imageUrl: set.image.imageURL || set.image.thumbnailURL,
      sourceId: `${set.number}-${set.numberVariant}`,
      dataSource: 'brickset',
    };
  }

  async lookupSet(setNumber: string): Promise<SetLookupResult | null> {
    const normalizedNumber = normalizeSetNumber(setNumber);

    try {
      const response = await this.fetch('getSets', {
        setNumber: normalizedNumber,
      });

      if (response.matches === 0 || response.sets.length === 0) {
        // Try without the variant suffix as fallback
        if (setNumber.includes('-')) {
          return null;
        }

        // Some sets might have variant -2, -3, etc. Try searching by number
        const searchResponse = await this.fetch('getSets', {
          query: setNumber,
        });

        const exactMatch = searchResponse.sets.find(
          (s) => s.number === setNumber || displaySetNumber(s.number) === setNumber
        );

        if (exactMatch) {
          return this.mapToResult(exactMatch);
        }

        return null;
      }

      return this.mapToResult(response.sets[0]);
    } catch (error) {
      console.error('Brickset lookup error for', setNumber, ':', error);
      throw error; // Re-throw to surface the actual error
    }
  }

  async searchSets(
    query: string,
    options?: { limit?: number; theme?: string }
  ): Promise<SetLookupResult[]> {
    const params: Record<string, string> = {
      query,
      pageSize: String(options?.limit || 20),
    };

    if (options?.theme) {
      params.theme = options.theme;
    }

    try {
      const response = await this.fetch('getSets', params);
      return response.sets.map((set) => this.mapToResult(set));
    } catch (error) {
      console.error('Brickset search error:', error);
      return [];
    }
  }

  async getImageUrl(setNumber: string): Promise<string | null> {
    const set = await this.lookupSet(setNumber);
    return set?.imageUrl || null;
  }
}
