'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SetCard } from '@/components/SetCard';
import { SetPlate } from '@/components/SetPlate';
import type { LegoSet, SectionDisplay } from '@/types';
import styles from './SetCarousel.module.css';

interface SetCarouselProps {
  title: string;
  sets: LegoSet[];
  /** Short editorial description, shown as a subtitle in the featured display. */
  description?: string;
  viewAllHref?: string;
  emptyMessage?: string;
  /** Extract a detail string from a set for display on each card. */
  getDetail?: (set: LegoSet) => string | undefined;
  /** Display style: standard carousel, featured (enlarged), or gallery (denser). */
  display?: SectionDisplay;
  linkPrefix?: string;
  hideStatus?: boolean;
}

const DISPLAY_CLASS: Record<SectionDisplay, string> = {
  standard: '',
  featured: styles.featured,
  gallery: styles.gallery,
};

/** On desktop the track becomes a grid; cap it to this many complete rows. */
const GRID_ROWS = 2;

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function SetCarousel({
  title,
  sets,
  description,
  viewAllHref,
  emptyMessage = 'No sets to display',
  getDetail,
  display = 'standard',
  linkPrefix,
  hideStatus,
}: SetCarouselProps): React.JSX.Element {
  const isFeatured = display === 'featured';
  const trackRef = useRef<HTMLDivElement>(null);
  // null = show every set (mobile scroll carousel); a number caps the desktop
  // grid to whole rows so the last row is never ragged.
  const [visibleCount, setVisibleCount] = useState<number | null>(null);

  useIsomorphicLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = (): void => {
      const columns = getComputedStyle(track).gridTemplateColumns;
      // 'none' means the track is the mobile flex carousel — show everything.
      if (columns === 'none') {
        setVisibleCount(null);
        return;
      }
      const columnCount = columns.trim().split(/\s+/).length;
      setVisibleCount(columnCount * GRID_ROWS);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [display]);

  const displaySets =
    visibleCount === null ? sets : sets.slice(0, visibleCount);

  return (
    <section className={`${styles.section} ${DISPLAY_CLASS[display]}`.trim()}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h2 className={styles.title}>{title}</h2>
          {isFeatured && description && (
            <p className={styles.subtitle}>{description}</p>
          )}
        </div>
        {viewAllHref && sets.length > 0 && (
          <Link href={viewAllHref} className={styles.viewAll}>
            View All
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
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        )}
      </div>

      {displaySets.length === 0 ? (
        <div className={styles.empty}>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className={styles.carousel}>
          <div className={styles.track} ref={trackRef}>
            {displaySets.map((set) => (
              <div key={set.id} className={styles.item}>
                {isFeatured ? (
                  <SetPlate set={set} linkPrefix={linkPrefix} hideStatus={hideStatus} />
                ) : (
                  <SetCard
                    set={set}
                    compact
                    detail={getDetail?.(set)}
                    linkPrefix={linkPrefix}
                    hideStatus={hideStatus}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
