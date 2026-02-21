'use client';

import { useCallback } from 'react';
import { Drawer } from 'vaul';
import type { SetStatus } from '@/types';
import styles from './FilterSheet.module.css';

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  statusFilter: SetStatus | 'all';
  onStatusChange: (status: SetStatus | 'all') => void;
  ownerFilter: string;
  onOwnerChange: (owner: string) => void;
  themeFilter: string;
  onThemeChange: (theme: string) => void;
  sortField: string;
  onSortFieldChange: (field: string) => void;
  sortDirection: 'asc' | 'desc';
  onSortDirectionChange: (direction: 'asc' | 'desc') => void;
  availableOwners: string[];
  availableThemes: string[];
  statusOptions: { value: SetStatus | 'all'; label: string }[];
  sortOptions: { value: string; label: string }[];
  hideStatus?: boolean;
}

export function FilterSheet({
  isOpen,
  onClose,
  statusFilter,
  onStatusChange,
  ownerFilter,
  onOwnerChange,
  themeFilter,
  onThemeChange,
  sortField,
  onSortFieldChange,
  sortDirection,
  onSortDirectionChange,
  availableOwners,
  availableThemes,
  statusOptions,
  sortOptions,
  hideStatus = false,
}: FilterSheetProps): React.JSX.Element {
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose]
  );

  const handleClearAll = () => {
    onStatusChange('all');
    onOwnerChange('all');
    onThemeChange('all');
  };

  const hasActiveFilters =
    statusFilter !== 'all' || ownerFilter !== 'all' || themeFilter !== 'all';

  return (
    <Drawer.Root open={isOpen} onOpenChange={handleOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay />
        <Drawer.Content
          className="modal-sheet"
          aria-describedby={undefined}
          aria-label="Filter options"
        >
          <Drawer.Handle />

          <div className="modal-header">
            <Drawer.Title className="modal-title">Filters</Drawer.Title>
            <Drawer.Close
              className="modal-icon-button"
              aria-label="Close filters"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </Drawer.Close>
          </div>

          <div className="modal-scroll-area">
            {!hideStatus && (
              <div className={styles.section}>
                <label className={styles.label} htmlFor="filter-status">
                  Status
                </label>
                <select
                  id="filter-status"
                  value={statusFilter}
                  onChange={(e) => onStatusChange(e.target.value as SetStatus | 'all')}
                  className={styles.select}
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {availableOwners.length > 0 && (
              <div className={styles.section}>
                <label className={styles.label} htmlFor="filter-owner">
                  Owner
                </label>
                <select
                  id="filter-owner"
                  value={ownerFilter}
                  onChange={(e) => onOwnerChange(e.target.value)}
                  className={styles.select}
                >
                  <option value="all">All Owners</option>
                  {availableOwners.map((owner) => (
                    <option key={owner} value={owner}>
                      {owner}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={styles.section}>
              <label className={styles.label} htmlFor="filter-theme">
                Theme
              </label>
              <select
                id="filter-theme"
                value={themeFilter}
                onChange={(e) => onThemeChange(e.target.value)}
                className={styles.select}
              >
                <option value="all">All Themes</option>
                {availableThemes.map((theme) => (
                  <option key={theme} value={theme}>
                    {theme}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.divider} />

            <div className={styles.section}>
              <label className={styles.label} htmlFor="filter-sort">
                Sort By
              </label>
              <div className={styles.sortRow}>
                <select
                  id="filter-sort"
                  value={sortField}
                  onChange={(e) => onSortFieldChange(e.target.value)}
                  className={styles.select}
                >
                  {sortOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}
                  className={styles.sortButton}
                  aria-label={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {sortDirection === 'asc' ? '↑ Asc' : '↓ Desc'}
                </button>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            {hasActiveFilters && (
              <button type="button" onClick={handleClearAll} className={styles.clearButton}>
                Clear All Filters
              </button>
            )}
            <Drawer.Close className={styles.applyButton}>
              Apply
            </Drawer.Close>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
