'use client';

import { useState, useRef, useEffect } from 'react';
import type { Collection } from '@/types';
import styles from './CollectionSelector.module.css';

interface CollectionSelectorProps {
  collections: Collection[];
  activeCollection: Collection | null;
  onSelect: (collection: Collection) => void;
}

export function CollectionSelector({
  collections,
  activeCollection,
  onSelect,
}: CollectionSelectorProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  if (collections.length <= 1) {
    // Single collection - just show name, no dropdown
    return (
      <span className={styles.singleCollection}>{activeCollection?.name || 'Collection'}</span>
    );
  }

  const handleSelect = (collection: Collection) => {
    onSelect(collection);
    setIsOpen(false);
  };

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className={styles.selectedName}>{activeCollection?.name || 'Select Collection'}</span>
        <svg
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <ul className={styles.dropdown} role="listbox">
          {collections.map((collection) => (
            <li key={collection.id} role="option" aria-selected={collection.id === activeCollection?.id}>
              <button
                type="button"
                className={`${styles.option} ${collection.id === activeCollection?.id ? styles.optionSelected : ''}`}
                onClick={() => handleSelect(collection)}
              >
                <span className={styles.optionName}>{collection.name}</span>
                <span className={styles.optionOwners}>
                  {collection.owners.join(', ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
