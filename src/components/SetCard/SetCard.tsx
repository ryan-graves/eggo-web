'use client';

import Image from 'next/image';
import { Link } from 'next-view-transitions';
import { useNavigationDirection } from '@/contexts';
import type { LegoSet } from '@/types';
import styles from './SetCard.module.css';

interface SetCardProps {
  set: LegoSet;
  compact?: boolean;
  linkPrefix?: string; // e.g., '/share/abc123/set' for public links
  hideOwner?: boolean; // Hide owner in public view
}

const STATUS_LABELS: Record<LegoSet['status'], string> = {
  unopened: 'Unopened',
  in_progress: 'In Progress',
  rebuild_in_progress: 'Rebuilding',
  assembled: 'Assembled',
  disassembled: 'Disassembled',
};

export function SetCard({ set, compact = false, linkPrefix, hideOwner = false }: SetCardProps): React.JSX.Element {
  const { setDirection } = useNavigationDirection();
  const imageUrl = set.customImageUrl || set.imageUrl;
  const cardClassName = compact ? `${styles.card} ${styles.compact}` : styles.card;
  const href = linkPrefix ? `${linkPrefix}/${set.id}` : `/collection/${set.id}`;

  const handleClick = () => {
    setDirection('forward');
  };

  return (
    <Link href={href} className={cardClassName} onClick={handleClick}>
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
              {!hideOwner && set.owners.length > 0 && (
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
