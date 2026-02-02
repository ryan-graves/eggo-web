'use client';

import { useMemo, useState } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { SetCard } from '@/components/SetCard';
import { FilterSheet } from '@/components/FilterSheet';
import { FilterTags } from '@/components/FilterTags';
import type { LegoSet, SetStatus } from '@/types';
import styles from './SetList.module.css';

/**
 * Safely convert a dateReceived value to a sortable string.
 * Handles both string (YYYY-MM-DD) and legacy Firestore Timestamp formats.
 */
function getDateString(dateReceived: string | Timestamp | null | undefined): string {
  if (!dateReceived) return '';
  if (typeof dateReceived === 'string') return dateReceived;
  // Handle Firestore Timestamp objects
  if (typeof dateReceived === 'object' && 'toDate' in dateReceived) {
    const date = dateReceived.toDate();
    return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
  }
  return '';
}

interface SetListProps {
  sets: LegoSet[];
  availableOwners: string[];
}

type SortField = 'name' | 'dateReceived' | 'pieceCount' | 'setNumber';
type SortDirection = 'asc' | 'desc';

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

export function SetList({ sets, availableOwners }: SetListProps): React.JSX.Element {
  const [statusFilter, setStatusFilter] = useState<SetStatus | 'all'>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [themeFilter, setThemeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('dateReceived');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

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

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter((set) => set.status === statusFilter);
    }

    // Apply owner filter
    if (ownerFilter !== 'all') {
      result = result.filter((set) => set.owners.includes(ownerFilter));
    }

    // Apply theme filter
    if (themeFilter !== 'all') {
      result = result.filter((set) => set.theme === themeFilter);
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
          // YYYY-MM-DD strings sort correctly with localeCompare
          // Use helper to handle both string and legacy Timestamp formats
          comparison = getDateString(a.dateReceived).localeCompare(getDateString(b.dateReceived));
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [sets, searchQuery, statusFilter, ownerFilter, themeFilter, sortField, sortDirection]);

  const handleSortChange = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Build filter tags for active filters
  const filterTags = useMemo(() => {
    const tags = [];

    if (statusFilter !== 'all') {
      const statusLabel = STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label || statusFilter;
      tags.push({
        key: 'status',
        label: 'Status',
        value: statusLabel,
        onRemove: () => setStatusFilter('all'),
      });
    }

    if (ownerFilter !== 'all') {
      tags.push({
        key: 'owner',
        label: 'Owner',
        value: ownerFilter,
        onRemove: () => setOwnerFilter('all'),
      });
    }

    if (themeFilter !== 'all') {
      tags.push({
        key: 'theme',
        label: 'Theme',
        value: themeFilter,
        onRemove: () => setThemeFilter('all'),
      });
    }

    return tags;
  }, [statusFilter, ownerFilter, themeFilter]);

  const activeFilterCount = filterTags.length;

  return (
    <div className={styles.container}>
      {/* Mobile filter UI */}
      <div className={styles.mobileFilters}>
        <input
          type="search"
          placeholder="Search sets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
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
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as SetStatus | 'all')}
          className={styles.select}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className={styles.select}
        >
          <option value="all">All Owners</option>
          {availableOwners.map((owner) => (
            <option key={owner} value={owner}>
              {owner}
            </option>
          ))}
        </select>

        <select
          value={themeFilter}
          onChange={(e) => setThemeFilter(e.target.value)}
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
          <select
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
            onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
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
            <p>No sets in your collection yet. Add your first set!</p>
          ) : (
            <p>No sets match your filters.</p>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredSets.map((set) => (
            <SetCard key={set.id} set={set} />
          ))}
        </div>
      )}

      {/* Filter sheet for mobile */}
      <FilterSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        ownerFilter={ownerFilter}
        onOwnerChange={setOwnerFilter}
        themeFilter={themeFilter}
        onThemeChange={setThemeFilter}
        sortField={sortField}
        onSortFieldChange={(field) => setSortField(field as SortField)}
        sortDirection={sortDirection}
        onSortDirectionChange={setSortDirection}
        availableOwners={availableOwners}
        availableThemes={themes}
        statusOptions={STATUS_OPTIONS}
        sortOptions={SORT_OPTIONS}
      />
    </div>
  );
}
