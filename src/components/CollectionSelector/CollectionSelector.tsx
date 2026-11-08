'use client';

import { useState, useRef, useEffect } from 'react';
import type { Collection } from '@/types';
import styles from './CollectionSelector.module.css';

interface CollectionSelectorProps {
  collections: Collection[];
  activeCollection: Collection | null;
  onSelect: (collection: Collection) => void;
  onCreateClick: () => void;
  onSettingsClick?: () => void;
}

const MENU_ITEM_SELECTOR = '[role="menuitemradio"], [role="menuitem"]';

/** Which item receives focus when the menu opens. */
type InitialFocus = 'active' | 'first' | 'last';

export function CollectionSelector({
  collections,
  activeCollection,
  onSelect,
  onCreateClick,
  onSettingsClick,
}: CollectionSelectorProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<InitialFocus>('active');

  const getItems = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>(MENU_ITEM_SELECTOR) ?? []);

  const open = (focus: InitialFocus) => {
    initialFocusRef.current = focus;
    setIsOpen(true);
  };

  const close = ({ returnFocus }: { returnFocus: boolean }) => {
    setIsOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  // Menu-button pattern: focus moves into the menu as soon as it opens.
  useEffect(() => {
    if (!isOpen) return;
    const items = getItems();
    if (items.length === 0) return;
    const active = items.find((item) => item.getAttribute('aria-checked') === 'true');
    const target =
      initialFocusRef.current === 'last'
        ? items[items.length - 1]
        : initialFocusRef.current === 'active'
          ? (active ?? items[0])
          : items[0];
    target.focus();
  }, [isOpen]);

  // Close when clicking outside; focus stays wherever the click landed.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (collection: Collection) => {
    onSelect(collection);
    close({ returnFocus: true });
  };

  const handleCreate = () => {
    close({ returnFocus: true });
    onCreateClick();
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      open('first');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      open('last');
    }
  };

  // Arrow keys move focus through the menu, wrapping at both ends. Escape
  // and Tab close it and hand focus back to the trigger.
  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault();
      close({ returnFocus: true });
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = getItems();
    if (items.length === 0) return;

    event.preventDefault();
    const currentIndex = items.findIndex((item) => item === document.activeElement);
    let nextIndex = 0;
    if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % items.length;
    else if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + items.length) % items.length;
    else if (event.key === 'End') nextIndex = items.length - 1;
    items[nextIndex].focus();
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        ref={triggerRef}
        className={styles.trigger}
        onClick={() => (isOpen ? close({ returnFocus: false }) : open('active'))}
        onKeyDown={handleTriggerKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="menu"
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

      {onSettingsClick && (
        <button
          type="button"
          className={styles.settingsButton}
          onClick={onSettingsClick}
          aria-label="Collection settings"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      )}

      {isOpen && (
        <div
          className={styles.dropdown}
          role="menu"
          aria-label="Collections"
          ref={menuRef}
          onKeyDown={handleMenuKeyDown}
        >
          {collections.map((collection) => {
            const isActive = collection.id === activeCollection?.id;
            return (
              <button
                key={collection.id}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                tabIndex={-1}
                className={`${styles.option} ${isActive ? styles.optionSelected : ''}`}
                onClick={() => handleSelect(collection)}
              >
                <span className={styles.optionName}>{collection.name}</span>
                <span className={styles.optionOwners}>{collection.owners.join(', ')}</span>
              </button>
            );
          })}

          <div className={styles.separator} role="separator" />

          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            className={`${styles.option} ${styles.createOption}`}
            onClick={handleCreate}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            <span className={styles.optionName}>New collection</span>
          </button>
        </div>
      )}
    </div>
  );
}
