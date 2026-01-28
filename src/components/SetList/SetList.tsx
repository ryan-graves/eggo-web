'use client';

import { useMemo, useState } from 'react';
import { SetCard } from '@/components/SetCard';
import type { LegoSet, SetStatus } from '@/types';
import styles from './SetList.module.css';

interface SetListProps {
  sets: LegoSet[];
  owners: string[];
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

export function SetList({ sets, owners }: SetListProps): React.JSX.Element {
  const [statusFilter, setStatusFilter] = useState<SetStatus | 'all'>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [themeFilter, setThemeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('dateReceived');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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
      result = result.filter((set) => set.owner === ownerFilter);
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
          const dateA = a.dateReceived?.toMillis() || 0;
          const dateB = b.dateReceived?.toMillis() || 0;
          comparison = dateA - dateB;
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

  return (
    <div className={styles.container}>
      <div className={styles.filters}>
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
          {owners.map((owner) => (
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
    </div>
  );
}
