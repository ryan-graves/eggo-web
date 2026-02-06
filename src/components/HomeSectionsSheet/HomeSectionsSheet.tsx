'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { HomeSectionConfig } from '@/types';
import {
  getSectionLabel,
  getSmartSectionTitle,
  getSmartSectionDescription,
  getAllSmartTypes,
  sectionKey,
  DEFAULT_HOME_SECTIONS,
} from '@/components/CollectionHome/sectionRegistry';
import styles from './HomeSectionsSheet.module.css';

interface HomeSectionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  sections: HomeSectionConfig[];
  onSave: (sections: HomeSectionConfig[]) => void;
  availableThemes: string[];
}

type SheetView = 'list' | 'add-smart' | 'add-theme';

const DRAG_CLOSE_THRESHOLD = 100;

export function HomeSectionsSheet({
  isOpen,
  onClose,
  sections,
  onSave,
  availableThemes,
}: HomeSectionsSheetProps): React.JSX.Element | null {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);

  const [draft, setDraft] = useState<HomeSectionConfig[]>(sections);
  const [view, setView] = useState<SheetView>('list');

  const isVisible = isOpen || isClosing;

  // Reset draft when sheet opens
  const prevIsOpen = useRef(false);
  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing draft from props when sheet opens is intentional
      setDraft(sections);
      setView('list');
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, sections]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setDragOffset(0);
      onClose();
    }, 200);
  }, [onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        if (view !== 'list') {
          setView('list');
        } else {
          handleClose();
        }
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
  }, [isOpen, handleClose, view]);

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

  const handleTouchStart = (e: React.TouchEvent): void => {
    dragStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent): void => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const offset = Math.max(0, currentY - dragStartY.current);
    setDragOffset(offset);
  };

  const handleTouchEnd = (): void => {
    setIsDragging(false);
    if (dragOffset > DRAG_CLOSE_THRESHOLD) {
      handleClose();
    } else {
      setDragOffset(0);
    }
  };

  const moveSection = (index: number, direction: 'up' | 'down'): void => {
    const newDraft = [...draft];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newDraft.length) return;
    [newDraft[index], newDraft[targetIndex]] = [newDraft[targetIndex], newDraft[index]];
    setDraft(newDraft);
  };

  const removeSection = (index: number): void => {
    setDraft(draft.filter((_, i) => i !== index));
  };

  const addSection = (config: HomeSectionConfig): void => {
    setDraft([...draft, config]);
    setView('list');
  };

  const existingKeys = new Set(draft.map(sectionKey));

  const availableSmartTypes = getAllSmartTypes().filter(
    (type) => !existingKeys.has(type)
  );

  const availableThemesForAdd = availableThemes.filter(
    (theme) => !existingKeys.has(`theme:${theme.toLowerCase()}`)
  );

  const handleSave = (): void => {
    onSave(draft);
  };

  const handleResetToDefaults = (): void => {
    setDraft(DEFAULT_HOME_SECTIONS);
  };

  const isDefaultConfig =
    draft.length === DEFAULT_HOME_SECTIONS.length &&
    draft.every((config, i) => sectionKey(config) === sectionKey(DEFAULT_HOME_SECTIONS[i]));

  if (!isVisible) return null;

  const sheetStyle = {
    transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
    transition: isDragging ? 'none' : undefined,
  };

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
        aria-label="Customize home sections"
      >
        <div
          className={styles.handleArea}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className={styles.handle} />
        </div>

        <div className={styles.header}>
          {view === 'list' ? (
            <>
              <h2 className={styles.title}>Customize Home</h2>
              <button
                type="button"
                onClick={handleClose}
                className={styles.closeButton}
                aria-label="Close"
              >
                &times;
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setView('list')}
                className={styles.backButton}
                aria-label="Back"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <h2 className={styles.title}>
                {view === 'add-smart' ? 'Add Smart Section' : 'Add Theme Section'}
              </h2>
              <div className={styles.headerSpacer} />
            </>
          )}
        </div>

        <div className={styles.content}>
          {view === 'list' && (
            <>
              {draft.length === 0 ? (
                <div className={styles.emptyDraft}>
                  <p>No sections configured.</p>
                  <p>Add sections to customize your home view.</p>
                </div>
              ) : (
                <ul className={styles.sectionList}>
                  {draft.map((config, index) => (
                    <li key={`${sectionKey(config)}-${index}`} className={styles.sectionItem}>
                      <div className={styles.sectionInfo}>
                        <span className={styles.sectionType}>
                          {config.type === 'theme' ? 'Theme' : 'Smart'}
                        </span>
                        <span className={styles.sectionName}>
                          {getSectionLabel(config)}
                        </span>
                      </div>
                      <div className={styles.sectionActions}>
                        <button
                          type="button"
                          className={styles.moveButton}
                          onClick={() => moveSection(index, 'up')}
                          disabled={index === 0}
                          aria-label="Move up"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="18 15 12 9 6 15" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className={styles.moveButton}
                          onClick={() => moveSection(index, 'down')}
                          disabled={index === draft.length - 1}
                          aria-label="Move down"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className={styles.removeButton}
                          onClick={() => removeSection(index)}
                          aria-label={`Remove ${getSectionLabel(config)}`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className={styles.addButtons}>
                {availableSmartTypes.length > 0 && (
                  <button
                    type="button"
                    className={styles.addButton}
                    onClick={() => setView('add-smart')}
                  >
                    + Add Smart Section
                  </button>
                )}
                {availableThemesForAdd.length > 0 && (
                  <button
                    type="button"
                    className={styles.addButton}
                    onClick={() => setView('add-theme')}
                  >
                    + Add Theme Section
                  </button>
                )}
              </div>
            </>
          )}

          {view === 'add-smart' && (
            <ul className={styles.addList}>
              {availableSmartTypes.map((type) => (
                <li key={type}>
                  <button
                    type="button"
                    className={styles.addListItem}
                    onClick={() => addSection({ type })}
                  >
                    <span className={styles.addItemName}>
                      {getSmartSectionTitle(type)}
                    </span>
                    <span className={styles.addItemDescription}>
                      {getSmartSectionDescription(type)}
                    </span>
                  </button>
                </li>
              ))}
              {availableSmartTypes.length === 0 && (
                <li className={styles.addListEmpty}>
                  All smart sections have been added.
                </li>
              )}
            </ul>
          )}

          {view === 'add-theme' && (
            <ul className={styles.addList}>
              {availableThemesForAdd.map((theme) => (
                <li key={theme}>
                  <button
                    type="button"
                    className={styles.addListItem}
                    onClick={() => addSection({ type: 'theme', themeName: theme })}
                  >
                    <span className={styles.addItemName}>{theme}</span>
                  </button>
                </li>
              ))}
              {availableThemesForAdd.length === 0 && (
                <li className={styles.addListEmpty}>
                  All themes from your collection have been added.
                </li>
              )}
            </ul>
          )}
        </div>

        {view === 'list' && (
          <div className={styles.footer}>
            {!isDefaultConfig && (
              <button type="button" onClick={handleResetToDefaults} className={styles.resetButton}>
                Reset
              </button>
            )}
            <button type="button" onClick={handleClose} className={styles.cancelButton}>
              Cancel
            </button>
            <button type="button" onClick={handleSave} className={styles.saveButton}>
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
