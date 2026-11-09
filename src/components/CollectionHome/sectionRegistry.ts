import type { LegoSet, HomeSectionConfig, SmartSectionType } from '@/types';

/**
 * Safely convert a dateReceived value to a sortable string.
 */
function getDateString(dateReceived: string | null | undefined): string {
  return dateReceived ?? '';
}

/**
 * Format a YYYY-MM-DD date string into a human-readable format.
 */
function formatDate(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Hash a set id with the shuffle seed into a sort key. Ordering by this key
 * gives a random section a consistent random order: the same seed yields the
 * same order on every render, refetch, and return to the page, and a set that
 * enters or leaves the pool (a status change, a new set) moves only itself
 * rather than reshuffling the sets around it.
 */
function seededSortKey(seed: number, id: string): number {
  let hash = 0x811c9dc5 ^ Math.floor(seed * 0xffffffff);
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Return up to `count` items in the consistent random order for `seed`.
 * Without a seed the sample is fresh on every call.
 */
function randomSample<T extends { id: string }>(items: T[], count: number, seed?: number): T[] {
  const effectiveSeed = seed ?? Math.random();
  // Keys are computed once per item, not once per comparison.
  return items
    .map((item) => ({ item, key: seededSortKey(effectiveSeed, item.id) }))
    .sort((a, b) => a.key - b.key)
    .slice(0, count)
    .map(({ item }) => item);
}

/** How many sets Discover shows. */
export const DISCOVER_COUNT = 24;

let sessionShuffleSeed: number | null = null;

/**
 * One shuffle seed for the life of the loaded app. Random sections keep the
 * same picks while the user navigates into sets and back, across realtime
 * refetches, and between collections; a reload or a fresh tab draws new ones.
 *
 * Browser-only by design: the server would draw its own seed, so seeded
 * output must never be server-rendered (today the home and share views
 * render nothing until their data loads on the client).
 */
export function getSessionShuffleSeed(): number {
  if (sessionShuffleSeed === null) {
    sessionShuffleSeed = Math.random();
  }
  return sessionShuffleSeed;
}

interface SmartSectionDefinition {
  title: string;
  description: string;
  /** `seed` fixes the order of random sections (see getSessionShuffleSeed); most ignore it. */
  getSets: (sets: LegoSet[], seed?: number) => LegoSet[];
  emptyMessage: string;
  viewAllFilter?: string;
  /** Extract a detail string from a set for display on the card. */
  getDetail?: (set: LegoSet) => string | undefined;
}

const SMART_SECTIONS: Record<SmartSectionType, SmartSectionDefinition> = {
  in_progress: {
    title: 'In Progress',
    description: 'Sets currently being built',
    getSets: (sets) =>
      sets.filter((s) => s.status === 'in_progress' || s.status === 'rebuild_in_progress'),
    emptyMessage: 'No builds in progress',
    // No viewAllFilter: this section spans two statuses (in_progress +
    // rebuild_in_progress), which /all's single-status filter can't represent.
    getDetail: (set) =>
      set.pieceCount ? `${set.pieceCount.toLocaleString()} pieces` : undefined,
  },
  discover: {
    title: 'Discover Something New',
    description: 'Random picks from your unopened or disassembled sets',
    getSets: (sets, seed) =>
      randomSample(
        sets.filter((s) => s.status === 'unopened' || s.status === 'disassembled'),
        DISCOVER_COUNT,
        seed
      ),
    emptyMessage: 'All sets have been built!',
    getDetail: (set) =>
      set.pieceCount ? `${set.pieceCount.toLocaleString()} pieces` : undefined,
  },
  recently_added: {
    title: 'Recently Added',
    description: 'Sets sorted by date received',
    getSets: (sets) =>
      [...sets]
        .filter((s) => s.dateReceived)
        .sort((a, b) => {
          const dateA = getDateString(a.dateReceived);
          const dateB = getDateString(b.dateReceived);
          return dateB.localeCompare(dateA);
        }),
    emptyMessage: 'No sets with dates yet',
    getDetail: (set) => formatDate(getDateString(set.dateReceived)),
  },
  largest: {
    title: 'Biggest Builds',
    description: 'Your sets with the most pieces',
    getSets: (sets) =>
      [...sets]
        .filter((s) => s.pieceCount)
        .sort((a, b) => (b.pieceCount || 0) - (a.pieceCount || 0)),
    emptyMessage: 'No piece counts available',
    getDetail: (set) =>
      set.pieceCount ? `${set.pieceCount.toLocaleString()} pieces` : undefined,
  },
  smallest: {
    title: 'Quick Builds',
    description: 'Your sets with the fewest pieces',
    getSets: (sets) =>
      [...sets]
        .filter((s) => s.pieceCount)
        .sort((a, b) => (a.pieceCount || 0) - (b.pieceCount || 0)),
    emptyMessage: 'No piece counts available',
    getDetail: (set) =>
      set.pieceCount ? `${set.pieceCount.toLocaleString()} pieces` : undefined,
  },
  newest_year: {
    title: 'Newest Releases',
    description: 'Sets from the most recent years',
    getSets: (sets) =>
      [...sets]
        .filter((s) => s.year)
        .sort((a, b) => (b.year || 0) - (a.year || 0)),
    emptyMessage: 'No release years available',
    getDetail: (set) => (set.year ? String(set.year) : undefined),
  },
  oldest_year: {
    title: 'Vintage Collection',
    description: 'Your oldest sets by release year',
    getSets: (sets) =>
      [...sets]
        .filter((s) => s.year)
        .sort((a, b) => (a.year || 0) - (b.year || 0)),
    emptyMessage: 'No release years available',
    getDetail: (set) => (set.year ? String(set.year) : undefined),
  },
  unopened: {
    title: 'Unopened',
    description: 'Sets still sealed in the box',
    getSets: (sets) => sets.filter((s) => s.status === 'unopened'),
    emptyMessage: 'No unopened sets',
    viewAllFilter: 'status=unopened',
    getDetail: (set) => set.theme ?? undefined,
  },
  assembled: {
    title: 'On Display',
    description: 'Completed and assembled sets',
    getSets: (sets) => sets.filter((s) => s.status === 'assembled'),
    emptyMessage: 'No assembled sets',
    viewAllFilter: 'status=assembled',
    getDetail: (set) => set.theme ?? undefined,
  },
  disassembled: {
    title: 'Ready for Rebuild',
    description: 'Disassembled sets waiting for another go',
    getSets: (sets) => sets.filter((s) => s.status === 'disassembled'),
    emptyMessage: 'No disassembled sets',
    viewAllFilter: 'status=disassembled',
    getDetail: (set) => set.theme ?? undefined,
  },
};

const ALL_SMART_TYPES: SmartSectionType[] = [
  'in_progress',
  'discover',
  'recently_added',
  'largest',
  'smallest',
  'newest_year',
  'oldest_year',
  'unopened',
  'assembled',
  'disassembled',
];

export interface ResolvedSection {
  id: string;
  title: string;
  /** Short editorial description, surfaced as a subtitle in the featured display. */
  description?: string;
  getSets: (sets: LegoSet[], seed?: number) => LegoSet[];
  emptyMessage: string;
  viewAllFilter?: string;
  /** Extract a detail string from a set for display on the card. */
  getDetail?: (set: LegoSet) => string | undefined;
}

function isValidSmartType(type: string): type is SmartSectionType {
  return type in SMART_SECTIONS;
}

export function resolveSection(config: HomeSectionConfig): ResolvedSection | null {
  if (config.type === 'theme') {
    const themeName = config.themeName;
    return {
      id: `theme_${themeName}`,
      title: themeName,
      getSets: (sets) =>
        sets.filter((s) => s.theme?.toLowerCase() === themeName.toLowerCase()),
      emptyMessage: `No ${themeName} sets`,
      viewAllFilter: `theme=${encodeURIComponent(themeName)}`,
      getDetail: (set) =>
        set.pieceCount ? `${set.pieceCount.toLocaleString()} pieces` : undefined,
    };
  }

  if (!isValidSmartType(config.type)) {
    return null;
  }

  const def = SMART_SECTIONS[config.type];
  return {
    id: config.type,
    title: def.title,
    description: def.description,
    getSets: def.getSets,
    emptyMessage: def.emptyMessage,
    viewAllFilter: def.viewAllFilter,
    getDetail: def.getDetail,
  };
}

export function getSmartSectionTitle(type: SmartSectionType): string {
  return SMART_SECTIONS[type].title;
}

export function getSmartSectionDescription(type: SmartSectionType): string {
  return SMART_SECTIONS[type].description;
}

export function getAllSmartTypes(): SmartSectionType[] {
  return ALL_SMART_TYPES;
}

export function getSectionLabel(config: HomeSectionConfig): string {
  if (config.type === 'theme') {
    return config.themeName;
  }
  if (!isValidSmartType(config.type)) {
    return config.type;
  }
  return SMART_SECTIONS[config.type].title;
}

export const DEFAULT_HOME_SECTIONS: HomeSectionConfig[] = [
  { type: 'in_progress', display: 'featured' },
  { type: 'recently_added', display: 'standard' },
  { type: 'assembled', display: 'standard' },
  { type: 'discover', display: 'standard' },
];

/**
 * Generate a unique key for a section config, used for deduplication.
 */
export function sectionKey(config: HomeSectionConfig): string {
  if (config.type === 'theme') {
    return `theme:${config.themeName.toLowerCase()}`;
  }
  return config.type;
}
