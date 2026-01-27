'use client';

import Image from 'next/image';
import type { LegoSet } from '@/types';
import styles from './SetCard.module.css';

interface SetCardProps {
  set: LegoSet;
  onClick?: () => void;
}

const STATUS_LABELS: Record<LegoSet['status'], string> = {
  unopened: 'Unopened',
  in_progress: 'In Progress',
  rebuild_in_progress: 'Rebuilding',
  assembled: 'Assembled',
  disassembled: 'Disassembled',
};

export function SetCard({ set, onClick }: SetCardProps): React.JSX.Element {
  const imageUrl = set.customImageUrl || set.imageUrl;

  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <div className={styles.imageContainer}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={set.name}
            fill
            sizes="(max-width: 768px) 50vw, 200px"
            className={styles.image}
          />
        ) : (
          <div className={styles.placeholder}>No Image</div>
        )}
      </div>

      <div className={styles.content}>
        <h3 className={styles.name}>{set.name}</h3>
        <p className={styles.setNumber}>{set.setNumber}</p>

        <div className={styles.meta}>
          <span className={`${styles.status} ${styles[set.status]}`}>
            {STATUS_LABELS[set.status]}
          </span>
          {set.owner && <span className={styles.owner}>{set.owner}</span>}
        </div>

        <div className={styles.details}>
          {set.pieceCount && <span>{set.pieceCount.toLocaleString()} pcs</span>}
          {set.theme && <span>{set.theme}</span>}
        </div>
      </div>
    </button>
  );
}
