'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Drawer } from 'vaul';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
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

const SECTION_ICON_PROPS = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function SectionIcon({ type }: { type: string }): React.JSX.Element {
  switch (type) {
    case 'in_progress':
      return (
        <svg {...SECTION_ICON_PROPS}>
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      );
    case 'discover':
      return (
        <svg {...SECTION_ICON_PROPS}>
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      );
    case 'recently_added':
      return (
        <svg {...SECTION_ICON_PROPS}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case 'largest':
      return (
        <svg {...SECTION_ICON_PROPS}>
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      );
    case 'smallest':
      return (
        <svg {...SECTION_ICON_PROPS}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case 'newest_year':
      return (
        <svg {...SECTION_ICON_PROPS}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case 'oldest_year':
      return (
        <svg {...SECTION_ICON_PROPS}>
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <path d="M12 7v5l4 2" />
        </svg>
      );
    case 'unopened':
      return (
        <svg {...SECTION_ICON_PROPS}>
          <path d="m7.5 4.27 9 5.15" />
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
      );
    case 'assembled':
      return (
        <svg {...SECTION_ICON_PROPS}>
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      );
    case 'disassembled':
      return (
        <svg {...SECTION_ICON_PROPS}>
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      );
    default:
      return (
        <svg {...SECTION_ICON_PROPS}>
          <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
          <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
        </svg>
      );
  }
}

interface SortableSectionItemProps {
  config: HomeSectionConfig;
  onRemove: () => void;
}

function SortableSectionItem({
  config,
  onRemove,
}: SortableSectionItemProps): React.JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sectionKey(config),
    animateLayoutChanges: ({ wasDragging }) => !wasDragging,
  });

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
      : undefined,
    transition,
    ...(isDragging && { opacity: 0.4, zIndex: 1, position: 'relative' as const }),
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={styles.sectionItem}
    >
      <div
        className={styles.dragHandle}
        data-vaul-no-drag
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${getSectionLabel(config)}`}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5.5" cy="3" r="1.5" />
          <circle cx="10.5" cy="3" r="1.5" />
          <circle cx="5.5" cy="8" r="1.5" />
          <circle cx="10.5" cy="8" r="1.5" />
          <circle cx="5.5" cy="13" r="1.5" />
          <circle cx="10.5" cy="13" r="1.5" />
        </svg>
      </div>
      <span className={styles.sectionIcon}>
        <SectionIcon type={config.type} />
      </span>
      <div className={styles.sectionInfo}>
        <span className={styles.sectionName}>
          {getSectionLabel(config)}
        </span>
        <span className={styles.sectionDescription}>
          {config.type === 'theme'
            ? 'Theme'
            : getSmartSectionDescription(config.type)}
        </span>
      </div>
      <button
        type="button"
        className={styles.removeButton}
        onClick={onRemove}
        aria-label={`Remove ${getSectionLabel(config)}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </li>
  );
}

export function HomeSectionsSheet({
  isOpen,
  onClose,
  sections,
  onSave,
  availableThemes,
}: HomeSectionsSheetProps): React.JSX.Element {
  const [draft, setDraft] = useState<HomeSectionConfig[]>(sections);
  const [view, setView] = useState<SheetView>('list');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose]
  );

  const removeSection = (index: number): void => {
    setDraft((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setDraft((prev) => {
        const oldIndex = prev.findIndex((c) => sectionKey(c) === active.id);
        const newIndex = prev.findIndex((c) => sectionKey(c) === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
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

  return (
    <Drawer.Root open={isOpen} onOpenChange={handleOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay />
        <Drawer.Content
          className="modal-sheet"
          aria-describedby={undefined}
          aria-label="Customize home sections"
        >
          <Drawer.Handle />

          <div className="modal-header">
            {view === 'list' ? (
              <>
                <Drawer.Title className="modal-title">Customize Home</Drawer.Title>
                <Drawer.Close
                  className="modal-icon-button"
                  aria-label="Close"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </Drawer.Close>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className="modal-icon-button"
                  aria-label="Back"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <Drawer.Title className="modal-title">
                  {view === 'add-smart' ? 'Add Smart Section' : 'Add Theme Section'}
                </Drawer.Title>
                <div className={styles.headerSpacer} />
              </>
            )}
          </div>

          <div className="modal-scroll-area">
            {view === 'list' && (
              <>
                {draft.length === 0 ? (
                  <div className={styles.emptyDraft}>
                    <p>No sections configured.</p>
                    <p>Add sections to customize your home view.</p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={draft.map(sectionKey)}
                      strategy={verticalListSortingStrategy}
                    >
                      <ul className={styles.sectionList} data-vaul-no-drag>
                        {draft.map((config, index) => (
                          <SortableSectionItem
                            key={sectionKey(config)}
                            config={config}
                            onRemove={() => removeSection(index)}
                          />
                        ))}
                      </ul>
                    </SortableContext>
                  </DndContext>
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
            <div className="modal-footer">
              {!isDefaultConfig && (
                <button type="button" onClick={handleResetToDefaults} className={styles.resetButton}>
                  Reset
                </button>
              )}
              <Drawer.Close className={styles.cancelButton}>
                Cancel
              </Drawer.Close>
              <button type="button" onClick={handleSave} className={styles.saveButton}>
                Save
              </button>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
