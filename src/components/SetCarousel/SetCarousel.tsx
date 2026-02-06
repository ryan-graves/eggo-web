'use client';

import { Link } from 'next-view-transitions';
import { SetCard } from '@/components/SetCard';
import type { LegoSet } from '@/types';
import styles from './SetCarousel.module.css';

interface SetCarouselProps {
  title: string;
  sets: LegoSet[];
  viewAllHref?: string;
  emptyMessage?: string;
  maxItems?: number;
  /** Extract a detail string from a set for display on each card. */
  getDetail?: (set: LegoSet) => string | undefined;
}

export function SetCarousel({
  title,
  sets,
  viewAllHref,
  emptyMessage = 'No sets to display',
  maxItems,
  getDetail,
}: SetCarouselProps): React.JSX.Element {
  const displaySets = maxItems !== undefined ? sets.slice(0, maxItems) : sets;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
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
          <div className={styles.track}>
            {displaySets.map((set) => (
              <div key={set.id} className={styles.item}>
                <SetCard set={set} compact detail={getDetail?.(set)} />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
