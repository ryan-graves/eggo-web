import type { SetLookupResult } from '@/types';
import type { SetDataProvider } from './types';

const REBRICKABLE_API_BASE = 'https://rebrickable.com/api/v3';

interface RebrickableSet {
  set_num: string;
  name: string;
  year: number;
  num_parts: number;
  set_img_url: string | null;
  theme_id: number;
}

interface RebrickableTheme {
  id: number;
  name: string;
  parent_id: number | null;
}

interface RebrickableSearchResponse {
  count: number;
  results: RebrickableSet[];
}

// Cache for theme lookups to avoid repeated API calls
const themeCache = new Map<number, RebrickableTheme>();

export class RebrickableProvider implements SetDataProvider {
  readonly name = 'rebrickable';
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_REBRICKABLE_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Rebrickable API key not configured');
    }
  }

  private async fetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${REBRICKABLE_API_BASE}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `key ${this.apiKey}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new NotFoundError(`Resource not found: ${endpoint}`);
      }
      throw new Error(`Rebrickable API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private async getTheme(themeId: number): Promise<{ theme: string; subtheme: string | null }> {
    // Check cache first
    let theme = themeCache.get(themeId);

    if (!theme) {
      try {
        theme = await this.fetch<RebrickableTheme>(`/lego/themes/${themeId}/`);
        themeCache.set(themeId, theme);
      } catch {
        return { theme: 'Unknown', subtheme: null };
      }
    }

    // If this theme has a parent, the parent is the main theme and this is the subtheme
    if (theme.parent_id) {
      let parentTheme = themeCache.get(theme.parent_id);
      if (!parentTheme) {
        try {
          parentTheme = await this.fetch<RebrickableTheme>(`/lego/themes/${theme.parent_id}/`);
          themeCache.set(theme.parent_id, parentTheme);
        } catch {
          return { theme: theme.name, subtheme: null };
        }
      }
      return { theme: parentTheme.name, subtheme: theme.name };
    }

    return { theme: theme.name, subtheme: null };
  }

  private async mapToResult(set: RebrickableSet): Promise<SetLookupResult> {
    const { theme, subtheme } = await this.getTheme(set.theme_id);

    return {
      setNumber: set.set_num.replace(/-1$/, ''), // Remove "-1" suffix that Rebrickable uses
      name: set.name,
      year: set.year,
      pieceCount: set.num_parts,
      theme,
      subtheme,
      imageUrl: set.set_img_url,
      sourceId: set.set_num,
    };
  }

  async lookupSet(setNumber: string): Promise<SetLookupResult | null> {
    // Rebrickable uses format "12345-1" but users often just enter "12345"
    const normalizedNumber = setNumber.includes('-') ? setNumber : `${setNumber}-1`;

    try {
      const set = await this.fetch<RebrickableSet>(`/lego/sets/${normalizedNumber}/`);
      return this.mapToResult(set);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return null;
      }
      throw error;
    }
  }

  async searchSets(
    query: string,
    options?: { limit?: number; theme?: string }
  ): Promise<SetLookupResult[]> {
    const params: Record<string, string> = {
      search: query,
      page_size: String(options?.limit || 20),
    };

    const response = await this.fetch<RebrickableSearchResponse>('/lego/sets/', params);

    // Map results in parallel
    const results = await Promise.all(response.results.map((set) => this.mapToResult(set)));
    return results;
  }

  async getImageUrl(setNumber: string): Promise<string | null> {
    const set = await this.lookupSet(setNumber);
    return set?.imageUrl || null;
  }
}

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
