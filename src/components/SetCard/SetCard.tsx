'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { LegoSet } from '@/types';
import styles from './SetCard.module.css';

interface SetCardProps {
  set: LegoSet;
  compact?: boolean;
}

const STATUS_LABELS: Record<LegoSet['status'], string> = {
  unopened: 'Unopened',
  in_progress: 'In Progress',
  rebuild_in_progress: 'Rebuilding',
  assembled: 'Assembled',
  disassembled: 'Disassembled',
};

export function SetCard({ set, compact = false }: SetCardProps): React.JSX.Element {
  const imageUrl = set.customImageUrl || set.imageUrl;
  const cardClassName = compact ? `${styles.card} ${styles.compact}` : styles.card;

  return (
    <Link href={`/collection/${set.id}`} className={cardClassName}>
      <div className={styles.imageContainer}>
        <div className={styles.imageInner}>
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={set.name}
              fill
              sizes={compact ? '160px' : '(max-width: 768px) 50vw, 200px'}
              className={styles.image}
            />
          ) : (
            <div className={styles.placeholder}>No Image</div>
          )}
        </div>
      </div>

      <div className={styles.content}>
        <h3 className={styles.name}>{set.name}</h3>
        <p className={styles.setNumber}>#{set.setNumber}</p>

        {!compact && (
          <>
            <div className={styles.meta}>
              <span className={`${styles.status} ${styles[set.status]}`}>
                {STATUS_LABELS[set.status]}
              </span>
              {set.owners.length > 0 && (
                <span className={styles.owner}>{set.owners.join(', ')}</span>
              )}
            </div>

            <div className={styles.details}>
              {set.pieceCount && <span>{set.pieceCount.toLocaleString()} pcs</span>}
              {set.theme && <span>{set.theme}</span>}
            </div>
          </>
        )}

        {compact && (
          <span className={`${styles.statusCompact} ${styles[set.status]}`}>
            {STATUS_LABELS[set.status]}
          </span>
        )}
      </div>
    </Link>
  );
}
