'use client';

import { useMemo, useState } from 'react';
import { SetCarousel } from '@/components/SetCarousel';
import { HomeSectionsSheet } from '@/components/HomeSectionsSheet';
import { useHomeSections } from '@/hooks/useUserPreferences';
import type { LegoSet, HomeSectionConfig } from '@/types';
import { resolveSection, DEFAULT_HOME_SECTIONS } from './sectionRegistry';
import styles from './CollectionHome.module.css';

interface CollectionHomeProps {
  sets: LegoSet[];
}

export function CollectionHome({ sets }: CollectionHomeProps): React.JSX.Element {
  const { homeSections, setHomeSections } = useHomeSections();
  const [showCustomize, setShowCustomize] = useState(false);

  const sectionConfigs = homeSections ?? DEFAULT_HOME_SECTIONS;

  const availableThemes = useMemo(() => {
    const themeSet = new Set<string>();
    sets.forEach((s) => {
      if (s.theme) themeSet.add(s.theme);
    });
    return Array.from(themeSet).sort();
  }, [sets]);

  const sections = useMemo(() => {
    return sectionConfigs
      .map((config) => {
        const resolved = resolveSection(config);
        return {
          ...resolved,
          sets: resolved.getSets(sets),
        };
      })
      .filter((section) => section.sets.length > 0);
  }, [sectionConfigs, sets]);

  const handleSaveSections = (newSections: HomeSectionConfig[]): void => {
    setHomeSections(newSections);
    setShowCustomize(false);
  };

  if (sets.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Your collection is empty.</p>
        <p>Add some sets to get started!</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
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

      {sections.length === 0 ? (
        <div className={styles.emptySections}>
          <p>No sections have matching sets.</p>
          <button
            type="button"
            className={styles.customizeLinkButton}
            onClick={() => setShowCustomize(true)}
          >
            Customize your home sections
          </button>
        </div>
      ) : (
        sections.map((section) => (
          <SetCarousel
            key={section.id}
            title={section.title}
            sets={section.sets}
            emptyMessage={section.emptyMessage}
            maxItems={section.maxItems}
          />
        ))
      )}

      <HomeSectionsSheet
        isOpen={showCustomize}
        onClose={() => setShowCustomize(false)}
        sections={sectionConfigs}
        onSave={handleSaveSections}
        availableThemes={availableThemes}
      />
    </div>
  );
}
