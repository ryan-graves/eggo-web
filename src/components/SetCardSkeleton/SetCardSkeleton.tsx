'use client';

import styles from './SetCardSkeleton.module.css';

interface SetCardSkeletonProps {
  compact?: boolean;
}

export function SetCardSkeleton({ compact = false }: SetCardSkeletonProps): React.JSX.Element {
  const cardClassName = compact ? `${styles.card} ${styles.compact}` : styles.card;

  return (
    <div className={cardClassName}>
      <div className={styles.imageContainer}>
        <div className={`${styles.skeleton} ${styles.imageSkeleton}`} />
      </div>

      <div className={styles.content}>
        <div className={`${styles.skeleton} ${styles.nameSkeleton}`} />
        <div className={`${styles.skeleton} ${styles.setNumberSkeleton}`} />

        {!compact && (
          <>
            <div className={styles.meta}>
              <div className={`${styles.skeleton} ${styles.statusSkeleton}`} />
              <div className={`${styles.skeleton} ${styles.ownerSkeleton}`} />
            </div>

            <div className={styles.details}>
              <div className={`${styles.skeleton} ${styles.detailSkeleton}`} />
              <div className={`${styles.skeleton} ${styles.detailSkeleton}`} />
            </div>
          </>
        )}

        {compact && <div className={`${styles.skeleton} ${styles.statusCompactSkeleton}`} />}
      </div>
    </div>
  );
}
