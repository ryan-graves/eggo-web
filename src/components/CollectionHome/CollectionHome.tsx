'use client';

import { useMemo, useState } from 'react';
import { SetCarousel } from '@/components/SetCarousel';
import { HomeSectionsSheet } from '@/components/HomeSectionsSheet';
import type { LegoSet, HomeSectionConfig } from '@/types';
import { resolveSection, DEFAULT_HOME_SECTIONS } from './sectionRegistry';
import styles from './CollectionHome.module.css';

interface CollectionHomeProps {
  sets: LegoSet[];
  /**
   * The collection's saved home layout. Falls back to DEFAULT_HOME_SECTIONS
   * when undefined. Shared by all members and inherited by the public link.
   */
  sections?: HomeSectionConfig[];
  /** When true, hides the customize UI (public share view) */
  readOnly?: boolean;
  /** Persists a new layout. Required to enable the customize UI. */
  onSaveSections?: (sections: HomeSectionConfig[]) => void;
  /** Link prefix for set detail URLs (e.g., '/share/abc123/set') */
  linkPrefix?: string;
  /** Hide status badges on cards */
  hideStatus?: boolean;
}

export function CollectionHome({
  sets,
  sections,
  readOnly = false,
  onSaveSections,
  linkPrefix,
  hideStatus,
}: CollectionHomeProps): React.JSX.Element {
  const [showCustomize, setShowCustomize] = useState(false);
  // One seed per mount keeps random sections (Discover) stable across the
  // realtime refetches that would otherwise reshuffle them under the user.
  const [shuffleSeed] = useState(() => Math.random());

  const canCustomize = !readOnly && !!onSaveSections;
  const sectionConfigs = sections ?? DEFAULT_HOME_SECTIONS;

  const availableThemes = useMemo(() => {
    const themeSet = new Set<string>();
    sets.forEach((s) => {
      if (s.theme) themeSet.add(s.theme);
    });
    return Array.from(themeSet).sort();
  }, [sets]);

  const resolvedSections = useMemo(() => {
    return sectionConfigs
      .map((config) => {
        const resolved = resolveSection(config);
        if (!resolved) return null;
        return {
          ...resolved,
          sets: resolved.getSets(sets, shuffleSeed),
          display: config.display ?? 'standard',
          // Public share view has no /all route, so only link there in the app.
          viewAllHref:
            !readOnly && resolved.viewAllFilter
              ? `/all?${resolved.viewAllFilter}`
              : undefined,
        };
      })
      .filter(
        (section): section is NonNullable<typeof section> =>
          section !== null && section.sets.length > 0
      );
  }, [sectionConfigs, sets, readOnly, shuffleSeed]);

  const handleSaveSections = (newSections: HomeSectionConfig[]): void => {
    onSaveSections?.(newSections);
    setShowCustomize(false);
  };

  if (sets.length === 0) {
    return (
      <div className={styles.empty}>
        <p>{readOnly ? 'This collection is empty.' : 'Your collection is empty.'}</p>
        {!readOnly && <p>Add your first set to begin.</p>}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {canCustomize && (
        <div className={styles.customizeRow}>
          <button
            type="button"
            className={styles.customizeButton}
            onClick={() => setShowCustomize(true)}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Customize
          </button>
        </div>
      )}

      {resolvedSections.length === 0 ? (
        <div className={styles.emptySections}>
          <p>None of your home sections have matching sets.</p>
          {canCustomize && (
            <button
              type="button"
              className={styles.customizeLinkButton}
              onClick={() => setShowCustomize(true)}
            >
              Customize your home sections
            </button>
          )}
        </div>
      ) : (
        resolvedSections.map((section) => (
          <SetCarousel
            key={section.id}
            title={section.title}
            description={section.description}
            sets={section.sets}
            emptyMessage={section.emptyMessage}
            getDetail={section.getDetail}
            display={section.display}
            viewAllHref={section.viewAllHref}
            linkPrefix={linkPrefix}
            hideStatus={hideStatus}
          />
        ))
      )}

      {canCustomize && (
        <HomeSectionsSheet
          isOpen={showCustomize}
          onClose={() => setShowCustomize(false)}
          sections={sectionConfigs}
          onSave={handleSaveSections}
          availableThemes={availableThemes}
        />
      )}
    </div>
  );
}
