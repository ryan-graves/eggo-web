'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSheetDrag } from '@/hooks/useSheetDrag';
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
}: FilterSheetProps): React.JSX.Element | null {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);

  // Derive visibility: show when open OR when playing close animation
  const isVisible = isOpen || isClosing;

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  }, [onClose]);

  const { handleProps, sheetStyle } = useSheetDrag(handleClose);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleClose]);

  // Focus trap
  useEffect(() => {
    if (isOpen && sheetRef.current) {
      const focusableElements = sheetRef.current.querySelectorAll(
        'button, select, input, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
    }
  }, [isOpen]);

  const handleClearAll = () => {
    onStatusChange('all');
    onOwnerChange('all');
    onThemeChange('all');
  };

  const hasActiveFilters =
    statusFilter !== 'all' || ownerFilter !== 'all' || themeFilter !== 'all';

  if (!isVisible) return null;

  return (
    <div
      className={`${styles.overlay} ${isClosing ? styles.overlayClosing : ''}`}
      onClick={handleClose}
    >
      <div
        ref={sheetRef}
        className={`${styles.sheet} ${isClosing ? styles.sheetClosing : ''}`}
        style={sheetStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Filter options"
      >
        <div
          className={styles.handleArea}
          {...handleProps}
        >
          <div className={styles.handle} />
        </div>

        <div className={styles.header}>
          <h2 className={styles.title}>Filters</h2>
          <button
            type="button"
            onClick={handleClose}
            className={styles.closeButton}
            aria-label="Close filters"
          >
            ×
          </button>
        </div>

        <div className={styles.content}>
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

        <div className={styles.footer}>
          {hasActiveFilters && (
            <button type="button" onClick={handleClearAll} className={styles.clearButton}>
              Clear All Filters
            </button>
          )}
          <button type="button" onClick={handleClose} className={styles.applyButton}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
