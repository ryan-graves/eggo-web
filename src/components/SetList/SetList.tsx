'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { SetCard } from '@/components/SetCard';
import { FilterSheet } from '@/components/FilterSheet';
import { FilterTags } from '@/components/FilterTags';
import { ALL_SETS_QUERY_KEY } from '@/hooks/useNavigation';
import { getDateSortString } from '@/lib/date';
import type { LegoSet, SetStatus, PublicViewSettings } from '@/types';
import styles from './SetList.module.css';

interface SetListProps {
  sets: LegoSet[];
  availableOwners: string[];
  /** For public share links — prefix for set detail URLs */
  linkPrefix?: string;
  /** Public view settings — controls which fields are visible */
  viewSettings?: PublicViewSettings;
  /** Empty state message when collection has no sets at all */
  emptyMessage?: string;
  /** Mirror filters and sort into the URL (the /all route only). */
  syncFiltersToUrl?: boolean;
}

type SortField = 'name' | 'dateReceived' | 'pieceCount' | 'setNumber';
type SortDirection = 'asc' | 'desc';

interface SetListFilters {
  status: SetStatus | 'all';
  owner: string;
  theme: string;
  query: string;
  sortField: SortField;
  sortDirection: SortDirection;
}

const DEFAULT_FILTERS: SetListFilters = {
  status: 'all',
  owner: 'all',
  theme: 'all',
  query: '',
  sortField: 'dateReceived',
  sortDirection: 'desc',
};

/** URL search param for each filter. Defaults are omitted from the URL. */
const FILTER_PARAMS: Record<keyof SetListFilters, string> = {
  status: 'status',
  owner: 'owner',
  theme: 'theme',
  query: 'q',
  sortField: 'sort',
  sortDirection: 'dir',
};

const STATUS_OPTIONS: { value: SetStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'unopened', label: 'Unopened' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'rebuild_in_progress', label: 'Rebuilding' },
  { value: 'assembled', label: 'Assembled' },
  { value: 'disassembled', label: 'Disassembled' },
];

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'dateReceived', label: 'Date Received' },
  { value: 'name', label: 'Name' },
  { value: 'setNumber', label: 'Set Number' },
  { value: 'pieceCount', label: 'Piece Count' },
];

function parseFilters(params: URLSearchParams, availableOwners: string[]): SetListFilters {
  const status = params.get(FILTER_PARAMS.status);
  const owner = params.get(FILTER_PARAMS.owner);
  const sortField = params.get(FILTER_PARAMS.sortField);
  const sortDirection = params.get(FILTER_PARAMS.sortDirection);
  return {
    status: STATUS_OPTIONS.some((o) => o.value === status)
      ? (status as SetStatus | 'all')
      : DEFAULT_FILTERS.status,
    owner: owner && availableOwners.includes(owner) ? owner : DEFAULT_FILTERS.owner,
    theme: params.get(FILTER_PARAMS.theme) ?? DEFAULT_FILTERS.theme,
    query: params.get(FILTER_PARAMS.query) ?? DEFAULT_FILTERS.query,
    sortField: SORT_OPTIONS.some((o) => o.value === sortField)
      ? (sortField as SortField)
      : DEFAULT_FILTERS.sortField,
    sortDirection:
      sortDirection === 'asc' || sortDirection === 'desc'
        ? sortDirection
        : DEFAULT_FILTERS.sortDirection,
  };
}

function serializeFilters(filters: SetListFilters): string {
  const params = new URLSearchParams();
  (Object.keys(FILTER_PARAMS) as (keyof SetListFilters)[]).forEach((key) => {
    if (filters[key] !== DEFAULT_FILTERS[key]) params.set(FILTER_PARAMS[key], filters[key]);
  });
  return params.toString();
}

/**
 * The URL wins when it carries any filter (a "View All" deep link from home,
 * a shared link, a refresh). A bare /all falls back to the query from the
 * last visit in this tab, so leaving and coming back keeps the same view.
 */
function readInitialFilters(searchParams: URLSearchParams, availableOwners: string[]): SetListFilters {
  const hasUrlFilters = Object.values(FILTER_PARAMS).some((param) => searchParams.has(param));
  if (hasUrlFilters || typeof window === 'undefined') {
    return parseFilters(searchParams, availableOwners);
  }
  const remembered = sessionStorage.getItem(ALL_SETS_QUERY_KEY);
  return remembered
    ? parseFilters(new URLSearchParams(remembered), availableOwners)
    : DEFAULT_FILTERS;
}

export function SetList({
  sets,
  availableOwners,
  linkPrefix,
  viewSettings,
  emptyMessage = 'No sets in your collection yet. Add your first set!',
  syncFiltersToUrl = false,
}: SetListProps): React.JSX.Element {
  // Filters and sort live in the URL — only when syncFiltersToUrl is set (the
  // /all route), never on public share pages.
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [filters, setFilters] = useState<SetListFilters>(() =>
    syncFiltersToUrl
      ? readInitialFilters(new URLSearchParams(searchParams), availableOwners)
      : DEFAULT_FILTERS
  );
  const {
    status: statusFilter,
    owner: ownerFilter,
    theme: themeFilter,
    query: searchQuery,
    sortField,
    sortDirection,
  } = filters;
  const setFilter = useCallback(
    <K extends keyof SetListFilters>(key: K, value: SetListFilters[K]): void => {
      setFilters((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
    },
    []
  );
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Mirror the filters back into the URL so back navigation, refresh, and
  // sharing reflect the current view, and remember them for the next bare
  // visit to /all. The History API integrates with the Next router (it updates
  // useSearchParams) without the server round trip router.replace would make
  // on every search keystroke; replaceState keeps it out of the history stack.
  useEffect(() => {
    if (!syncFiltersToUrl) return;
    const query = serializeFilters(filters);
    const url = query ? `${pathname}?${query}` : pathname;
    if (`${window.location.pathname}${window.location.search}` !== url) {
      window.history.replaceState(null, '', url);
    }
    sessionStorage.setItem(ALL_SETS_QUERY_KEY, query);
  }, [syncFiltersToUrl, filters, pathname]);

  const hideOwner = viewSettings ? !viewSettings.showOwner : false;
  const hideStatus = viewSettings ? !(viewSettings.showStatus ?? true) : false;

  // Get unique themes from sets
  const themes = useMemo(() => {
    const themeSet = new Set<string>();
    sets.forEach((set) => {
      if (set.theme) themeSet.add(set.theme);
    });
    return Array.from(themeSet).sort();
  }, [sets]);

  // Filter and sort sets
  const filteredSets = useMemo(() => {
    let result = [...sets];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (set) =>
          set.name.toLowerCase().includes(query) ||
          set.setNumber.toLowerCase().includes(query) ||
          set.theme?.toLowerCase().includes(query)
      );
    }

    // Apply status filter (only if status is visible)
    if (!hideStatus && statusFilter !== 'all') {
      result = result.filter((set) => set.status === statusFilter);
    }

    // Apply owner filter (only if owner is visible)
    if (!hideOwner && ownerFilter !== 'all') {
      result = result.filter((set) => set.owners.includes(ownerFilter));
    }

    // Apply theme filter (case-insensitive, matching how theme home sections resolve)
    if (themeFilter !== 'all') {
      const theme = themeFilter.toLowerCase();
      result = result.filter((set) => set.theme?.toLowerCase() === theme);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'setNumber':
          comparison = a.setNumber.localeCompare(b.setNumber, undefined, { numeric: true });
          break;
        case 'pieceCount':
          comparison = (a.pieceCount || 0) - (b.pieceCount || 0);
          break;
        case 'dateReceived':
          comparison = getDateSortString(a.dateReceived).localeCompare(getDateSortString(b.dateReceived));
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [sets, searchQuery, statusFilter, ownerFilter, themeFilter, sortField, sortDirection, hideOwner, hideStatus]);

  const toggleSortDirection = (): void => {
    setFilter('sortDirection', sortDirection === 'asc' ? 'desc' : 'asc');
  };

  const handleSortChange = (field: SortField): void => {
    if (field === sortField) {
      toggleSortDirection();
    } else {
      setFilters((prev) => ({ ...prev, sortField: field, sortDirection: 'desc' }));
    }
  };

  // Build filter tags for active filters
  const filterTags = useMemo(() => {
    const tags = [];

    if (!hideStatus && statusFilter !== 'all') {
      const statusLabel = STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label || statusFilter;
      tags.push({
        key: 'status',
        label: 'Status',
        value: statusLabel,
        onRemove: () => setFilter('status', 'all'),
      });
    }

    if (!hideOwner && ownerFilter !== 'all') {
      tags.push({
        key: 'owner',
        label: 'Owner',
        value: ownerFilter,
        onRemove: () => setFilter('owner', 'all'),
      });
    }

    if (themeFilter !== 'all') {
      tags.push({
        key: 'theme',
        label: 'Theme',
        value: themeFilter,
        onRemove: () => setFilter('theme', 'all'),
      });
    }

    return tags;
  }, [statusFilter, ownerFilter, themeFilter, hideOwner, hideStatus, setFilter]);

  const activeFilterCount = filterTags.length;

  return (
    <div className={styles.container}>
      {/* Mobile filter UI */}
      <div className={styles.mobileFilters}>
        <input
          type="search"
          placeholder="Search sets..."
          value={searchQuery}
          onChange={(e) => setFilter('query', e.target.value)}
          className={styles.searchInput}
        />
        <button
          type="button"
          onClick={() => setIsFilterSheetOpen(true)}
          className={`btn-default btn-secondary ${styles.filterButton}`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className={styles.filterBadge}>{activeFilterCount}</span>
          )}
        </button>
      </div>

      {/* Filter tags (shown on mobile when filters are active) */}
      <div className={styles.mobileFilterTags}>
        <FilterTags tags={filterTags} />
      </div>

      {/* Desktop filter UI */}
      <div className={styles.desktopFilters}>
        <input
          type="search"
          placeholder="Search sets..."
          value={searchQuery}
          onChange={(e) => setFilter('query', e.target.value)}
          className={styles.searchInput}
        />

        {!hideStatus && (
          <select
            value={statusFilter}
            onChange={(e) => setFilter('status', e.target.value as SetStatus | 'all')}
            className={styles.select}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {!hideOwner && (
          <select
            value={ownerFilter}
            onChange={(e) => setFilter('owner', e.target.value)}
            className={styles.select}
          >
            <option value="all">All Owners</option>
            {availableOwners.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>
        )}

        <select
          value={themeFilter}
          onChange={(e) => setFilter('theme', e.target.value)}
          className={styles.select}
        >
          <option value="all">All Themes</option>
          {themes.map((theme) => (
            <option key={theme} value={theme}>
              {theme}
            </option>
          ))}
        </select>

        <div className={styles.sortGroup}>
          <label className={styles.sortLabel} htmlFor="sort-field-select">Sort</label>
          <select
            id="sort-field-select"
            value={sortField}
            onChange={(e) => handleSortChange(e.target.value as SortField)}
            className={styles.select}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={toggleSortDirection}
            className={styles.sortButton}
            aria-label={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
          >
            {sortDirection === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      <div className={styles.stats}>
        <span>
          {filteredSets.length} {filteredSets.length === 1 ? 'set' : 'sets'}
        </span>
        {filteredSets.length > 0 && (
          <span className={styles.totalPieces}>
            {filteredSets.reduce((sum, s) => sum + (s.pieceCount || 0), 0).toLocaleString()} total
            pieces
          </span>
        )}
      </div>

      {filteredSets.length === 0 ? (
        <div className={styles.empty}>
          {sets.length === 0 ? (
            <p>{emptyMessage}</p>
          ) : (
            <p>No sets match your filters.</p>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredSets.map((set) => (
            <SetCard key={set.id} set={set} linkPrefix={linkPrefix} hideOwner={hideOwner} hideStatus={hideStatus} />
          ))}
        </div>
      )}

      {/* Filter sheet for mobile */}
      <FilterSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        statusFilter={statusFilter}
        onStatusChange={(status) => setFilter('status', status)}
        ownerFilter={ownerFilter}
        onOwnerChange={(owner) => setFilter('owner', owner)}
        themeFilter={themeFilter}
        onThemeChange={(theme) => setFilter('theme', theme)}
        sortField={sortField}
        onSortFieldChange={(field) => setFilter('sortField', field as SortField)}
        sortDirection={sortDirection}
        onSortDirectionChange={(direction) => setFilter('sortDirection', direction)}
        availableOwners={hideOwner ? [] : availableOwners}
        availableThemes={themes}
        statusOptions={STATUS_OPTIONS}
        sortOptions={SORT_OPTIONS}
        hideStatus={hideStatus}
      />
    </div>
  );
}
