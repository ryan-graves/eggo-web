'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { LegoSet } from '@/types';
import { useNavigationLoading } from '@/hooks/useNavigationLoading';
import styles from './SetPlate.module.css';

interface SetPlateProps {
  set: LegoSet;
  /** Link prefix for set detail URLs (e.g., '/share/abc123/set'). */
  linkPrefix?: string;
  /** Hide the status badge (public view). */
  hideStatus?: boolean;
}

const STATUS_LABELS: Record<LegoSet['status'], string> = {
  unopened: 'Unopened',
  in_progress: 'In Progress',
  rebuild_in_progress: 'Rebuilding',
  assembled: 'Assembled',
  disassembled: 'Disassembled',
};

/**
 * Horizontal "catalog plate" card used by featured home sections: a large set
 * image alongside an editorial info column (serif name, spec line, status).
 */
export function SetPlate({
  set,
  linkPrefix,
  hideStatus = false,
}: SetPlateProps): React.JSX.Element {
  const imageUrl = set.customImageUrl || set.imageUrl;
  const href = linkPrefix ? `${linkPrefix}/${set.id}` : `/set/${set.id}`;
  const { pendingHref } = useNavigationLoading();
  const isLoading = pendingHref === href;

  const spec = [
    set.pieceCount ? `${set.pieceCount.toLocaleString()} pieces` : null,
    set.year ? String(set.year) : null,
    set.theme || null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link
      href={href}
      className={`${styles.plate} ${isLoading ? styles.plateLoading : ''}`.trim()}
    >
      <div className={styles.imageWrap}>
        <div className={styles.imageInner}>
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={set.name}
              fill
              sizes="120px"
              className={styles.image}
            />
          ) : (
            <div className={styles.placeholder}>No Image</div>
          )}
        </div>
        {set.imageUrl && !set.customImageUrl && (
          <span className={styles.imageDot} aria-label="Missing processed image" />
        )}
      </div>

      <div className={styles.info}>
        <h3 className={styles.name}>{set.name}</h3>
        <p className={styles.setNumber}>#{set.setNumber}</p>
        {spec && <p className={styles.spec}>{spec}</p>}
        {!hideStatus && (
          <span className={`status-badge-sm status-${set.status} ${styles.status}`}>
            {STATUS_LABELS[set.status]}
          </span>
        )}
      </div>
    </Link>
  );
}
