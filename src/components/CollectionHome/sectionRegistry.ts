import type { Timestamp } from 'firebase/firestore';
import type { LegoSet, HomeSectionConfig, SmartSectionType } from '@/types';

/**
 * Safely convert a dateReceived value to a sortable string.
 * Handles both string (YYYY-MM-DD) and legacy Firestore Timestamp formats.
 */
function getDateString(dateReceived: string | Timestamp | null | undefined): string {
  if (!dateReceived) return '';
  if (typeof dateReceived === 'string') return dateReceived;
  if (typeof dateReceived === 'object' && 'toDate' in dateReceived) {
    const date = dateReceived.toDate();
    return date.toISOString().split('T')[0];
  }
  return '';
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

interface SmartSectionDefinition {
  title: string;
  description: string;
  getSets: (sets: LegoSet[]) => LegoSet[];
  emptyMessage: string;
  viewAllFilter?: string;
  /** Max items to show in the carousel. Undefined means show all. */
  maxItems?: number;
}

const SMART_SECTIONS: Record<SmartSectionType, SmartSectionDefinition> = {
  in_progress: {
    title: 'In Progress',
    description: 'Sets currently being built',
    getSets: (sets) =>
      sets.filter((s) => s.status === 'in_progress' || s.status === 'rebuild_in_progress'),
    emptyMessage: 'No builds in progress',
    viewAllFilter: 'status=in_progress',
  },
  discover: {
    title: 'Discover Something New',
    description: 'Random picks from your unopened or disassembled sets',
    getSets: (sets) =>
      shuffleArray(sets.filter((s) => s.status === 'unopened' || s.status === 'disassembled')),
    emptyMessage: 'All sets have been built!',
    maxItems: 10,
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
    maxItems: 10,
  },
  largest: {
    title: 'Biggest Builds',
    description: 'Your sets with the most pieces',
    getSets: (sets) =>
      [...sets]
        .filter((s) => s.pieceCount)
        .sort((a, b) => (b.pieceCount || 0) - (a.pieceCount || 0)),
    emptyMessage: 'No piece counts available',
    maxItems: 10,
  },
  smallest: {
    title: 'Quick Builds',
    description: 'Your sets with the fewest pieces',
    getSets: (sets) =>
      [...sets]
        .filter((s) => s.pieceCount)
        .sort((a, b) => (a.pieceCount || 0) - (b.pieceCount || 0)),
    emptyMessage: 'No piece counts available',
    maxItems: 10,
  },
  newest_year: {
    title: 'Newest Releases',
    description: 'Sets from the most recent years',
    getSets: (sets) =>
      [...sets]
        .filter((s) => s.year)
        .sort((a, b) => (b.year || 0) - (a.year || 0)),
    emptyMessage: 'No release years available',
    maxItems: 10,
  },
  oldest_year: {
    title: 'Vintage Collection',
    description: 'Your oldest sets by release year',
    getSets: (sets) =>
      [...sets]
        .filter((s) => s.year)
        .sort((a, b) => (a.year || 0) - (b.year || 0)),
    emptyMessage: 'No release years available',
    maxItems: 10,
  },
  unopened: {
    title: 'Unopened',
    description: 'Sets still sealed in the box',
    getSets: (sets) => sets.filter((s) => s.status === 'unopened'),
    emptyMessage: 'No unopened sets',
    viewAllFilter: 'status=unopened',
  },
  assembled: {
    title: 'On Display',
    description: 'Completed and assembled sets',
    getSets: (sets) => sets.filter((s) => s.status === 'assembled'),
    emptyMessage: 'No assembled sets',
    viewAllFilter: 'status=assembled',
  },
  disassembled: {
    title: 'Ready for Rebuild',
    description: 'Disassembled sets waiting for another go',
    getSets: (sets) => sets.filter((s) => s.status === 'disassembled'),
    emptyMessage: 'No disassembled sets',
    viewAllFilter: 'status=disassembled',
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
  getSets: (sets: LegoSet[]) => LegoSet[];
  emptyMessage: string;
  viewAllFilter?: string;
  /** Max items to show in the carousel. Undefined means show all. */
  maxItems?: number;
}

export function resolveSection(config: HomeSectionConfig): ResolvedSection {
  if (config.type === 'theme') {
    const themeName = config.themeName;
    return {
      id: `theme_${themeName}`,
      title: themeName,
      getSets: (sets) =>
        sets.filter((s) => s.theme?.toLowerCase() === themeName.toLowerCase()),
      emptyMessage: `No ${themeName} sets`,
      viewAllFilter: `theme=${encodeURIComponent(themeName)}`,
    };
  }

  const def = SMART_SECTIONS[config.type];
  return {
    id: config.type,
    title: def.title,
    getSets: def.getSets,
    emptyMessage: def.emptyMessage,
    viewAllFilter: def.viewAllFilter,
    maxItems: def.maxItems,
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
  return SMART_SECTIONS[config.type].title;
}

export const DEFAULT_HOME_SECTIONS: HomeSectionConfig[] = [
  { type: 'in_progress' },
  { type: 'discover' },
  { type: 'recently_added' },
  { type: 'largest' },
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
