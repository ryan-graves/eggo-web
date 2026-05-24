'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { LegoSet } from '@/types';
import { useNavigationLoading } from '@/hooks/useNavigationLoading';
import { navigateWithSetMorph } from '@/lib/viewTransitions';
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
  const router = useRouter();
  const linkRef = useRef<HTMLAnchorElement>(null);

  // Intercept primary-button click to morph the image + name into the
  // detail-page hero via View Transitions. Modifier-key / non-primary clicks
  // fall through to the default Link behavior (open in new tab, etc.).
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (!linkRef.current) return;
    e.preventDefault();
    navigateWithSetMorph(linkRef.current, () => router.push(href));
  };

  const spec = [
    set.pieceCount ? `${set.pieceCount.toLocaleString()} pieces` : null,
    set.year ? String(set.year) : null,
    set.theme || null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link
      ref={linkRef}
      href={href}
      onClick={handleClick}
      className={`${styles.plate} ${isLoading ? styles.plateLoading : ''}`.trim()}
    >
      <div className={styles.imageWrap} data-vt-image>
        <div className={styles.imageInner}>
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={set.name}
              fill
              sizes="280px"
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
        <h3 className={styles.name} data-vt-name>
          {set.name}
        </h3>
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
