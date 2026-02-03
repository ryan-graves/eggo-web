'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCollection } from '@/hooks/useCollection';
import { EditSetModal } from '@/components/EditSetModal';
import { formatDateForDisplay } from '@/lib/date';
import type { LegoSet } from '@/types';
import styles from './SetDetailModal.module.css';

interface SetDetailModalProps {
  setId: string;
}

const STATUS_LABELS: Record<LegoSet['status'], string> = {
  unopened: 'Unopened',
  in_progress: 'In Progress',
  rebuild_in_progress: 'Rebuilding',
  assembled: 'Assembled',
  disassembled: 'Disassembled',
};

export function SetDetailModal({ setId }: SetDetailModalProps): React.JSX.Element | null {
  const router = useRouter();
  const { sets, activeCollection } = useCollection();
  const [showEditModal, setShowEditModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const set = sets.find((s) => s.id === setId);

  // Lock body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      router.back();
    }, 200);
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
  };

  if (!set) {
    return (
      <div className={styles.overlay} onClick={handleClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.notFound}>
            <h2>Set Not Found</h2>
            <p>The set you&apos;re looking for doesn&apos;t exist or has been removed.</p>
            <button type="button" onClick={handleClose} className={styles.closeButton}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const imageUrl = set.customImageUrl || set.imageUrl;

  return (
    <>
      <div
        className={`${styles.overlay} ${isClosing ? styles.overlayClosing : ''}`}
        onClick={handleClose}
      >
        <div
          className={`${styles.modal} ${isClosing ? styles.modalClosing : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.header}>
            <button
              type="button"
              onClick={handleClose}
              className={styles.backButton}
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M12.5 15L7.5 10L12.5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <h1 className={styles.title}>{set.name}</h1>
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className={styles.editButton}
              aria-label="Edit set"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M11.5 2.5L13.5 4.5M10 14H14M2 10L10.5 1.5C11.3284 0.671573 12.6716 0.671573 13.5 1.5C14.3284 2.32843 14.3284 3.67157 13.5 4.5L5 13L1 14L2 10Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <div className={styles.scrollArea}>
            <div className={styles.content}>
              <div className={styles.imageSection}>
                <div className={styles.imageContainer}>
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={set.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 400px"
                      className={styles.image}
                      priority
                    />
                  ) : (
                    <div className={styles.placeholder}>No Image</div>
                  )}
                </div>
              </div>

              <div className={styles.details}>
                <div className={styles.titleSection}>
                  <h2 className={styles.name}>{set.name}</h2>
                  <span className={`${styles.status} ${styles[set.status]}`}>
                    {STATUS_LABELS[set.status]}
                  </span>
                </div>

                <div className={styles.setStats}>
                  <span className={styles.stat}>#{set.setNumber}</span>
                  {set.pieceCount && (
                    <span className={styles.stat}>
                      <strong>{set.pieceCount.toLocaleString()}</strong> pieces
                    </span>
                  )}
                  {set.year && (
                    <span className={styles.stat}>
                      Released <strong>{set.year}</strong>
                    </span>
                  )}
                  {set.theme && (
                    <span className={styles.stat}>
                      {set.theme}
                      {set.subtheme && ` / ${set.subtheme}`}
                    </span>
                  )}
                </div>

                {(set.owners.length > 0 || set.dateReceived || set.hasBeenAssembled) && (
                  <div className={styles.storyCard}>
                    <p className={styles.storyText}>
                      {set.owners.length > 0 && set.dateReceived ? (
                        <>
                          {set.owners.join(' & ')} got this on {formatDateForDisplay(set.dateReceived)}
                          {set.occasion ? <> for {set.occasion}</> : <>, for fun</>}
                        </>
                      ) : set.owners.length > 0 ? (
                        <>
                          Belongs to {set.owners.join(' & ')}
                          {set.occasion && <> — {set.occasion}</>}
                        </>
                      ) : set.dateReceived ? (
                        <>
                          Got this on {formatDateForDisplay(set.dateReceived)}
                          {set.occasion ? <> for {set.occasion}</> : <>, for fun</>}
                        </>
                      ) : null}
                    </p>
                    {set.hasBeenAssembled && (
                      <span className={styles.builtBadge}>Built before</span>
                    )}
                  </div>
                )}

                {set.notes && (
                  <div className={styles.notesSection}>
                    <h3 className={styles.notesTitle}>Notes</h3>
                    <p className={styles.notesContent}>{set.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showEditModal && activeCollection && (
        <EditSetModal
          set={set}
          availableOwners={activeCollection.owners}
          onSuccess={handleEditSuccess}
          onCancel={() => setShowEditModal(false)}
        />
      )}
    </>
  );
}
