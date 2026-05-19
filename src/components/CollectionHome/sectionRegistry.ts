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
 * Small seeded PRNG (mulberry32). Lets a "random" sample stay stable for a
 * given seed instead of reshuffling on every realtime refetch.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Return a random sample of up to `count` items from the array, using a
 * partial Fisher-Yates shuffle. When `seed` is provided the sample is
 * deterministic for that seed, so it stays stable across refetches.
 */
function randomSample<T>(array: T[], count: number, seed?: number): T[] {
  const random =
    seed === undefined ? Math.random : mulberry32(Math.floor(seed * 0xffffffff));
  const copy = [...array];
  const n = Math.min(count, copy.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(random() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

interface SmartSectionDefinition {
  title: string;
  description: string;
  /** `seed` makes random sections deterministic for a session; most ignore it. */
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
        24,
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
