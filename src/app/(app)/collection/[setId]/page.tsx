'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useCollection } from '@/hooks/useCollection';
import { EditSetModal } from '@/components/EditSetModal';
import type { LegoSet } from '@/types';
import styles from './page.module.css';

const STATUS_LABELS: Record<LegoSet['status'], string> = {
  unopened: 'Unopened',
  in_progress: 'In Progress',
  rebuild_in_progress: 'Rebuilding',
  assembled: 'Assembled',
  disassembled: 'Disassembled',
};

function formatDate(timestamp: LegoSet['dateReceived']): string {
  if (!timestamp) return 'Not set';
  const date = timestamp.toDate();
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function SetDetailPage(): React.JSX.Element {
  const params = useParams();
  const { sets, activeCollection, loading } = useCollection();
  const [showEditModal, setShowEditModal] = useState(false);

  const setId = params.setId as string;
  const set = sets.find((s) => s.id === setId);

  const handleEditSuccess = () => {
    setShowEditModal(false);
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!set) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <h1>Set Not Found</h1>
          <p>The set you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <Link href="/collection" className={styles.backLink}>
            Back to Collection
          </Link>
        </div>
      </div>
    );
  }

  const imageUrl = set.customImageUrl || set.imageUrl;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/collection" className={styles.backButton}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M12.5 15L7.5 10L12.5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back
        </Link>
        <button type="button" onClick={() => setShowEditModal(true)} className={styles.editButton}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M11.5 2.5L13.5 4.5M10 14H14M2 10L10.5 1.5C11.3284 0.671573 12.6716 0.671573 13.5 1.5C14.3284 2.32843 14.3284 3.67157 13.5 4.5L5 13L1 14L2 10Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Edit
        </button>
      </header>

      <main className={styles.main}>
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
              <h1 className={styles.name}>{set.name}</h1>
              <p className={styles.setNumber}>{set.setNumber}</p>
            </div>

            <div className={styles.badges}>
              <span className={`${styles.status} ${styles[set.status]}`}>
                {STATUS_LABELS[set.status]}
              </span>
              {set.owner && <span className={styles.owner}>{set.owner}</span>}
            </div>

            <dl className={styles.specs}>
              {set.pieceCount && (
                <div className={styles.spec}>
                  <dt>Pieces</dt>
                  <dd>{set.pieceCount.toLocaleString()}</dd>
                </div>
              )}
              {set.year && (
                <div className={styles.spec}>
                  <dt>Year</dt>
                  <dd>{set.year}</dd>
                </div>
              )}
              {set.theme && (
                <div className={styles.spec}>
                  <dt>Theme</dt>
                  <dd>
                    {set.theme}
                    {set.subtheme && ` / ${set.subtheme}`}
                  </dd>
                </div>
              )}
              <div className={styles.spec}>
                <dt>Previously Built</dt>
                <dd>{set.hasBeenAssembled ? 'Yes' : 'No'}</dd>
              </div>
              {set.occasion && (
                <div className={styles.spec}>
                  <dt>Occasion</dt>
                  <dd>{set.occasion}</dd>
                </div>
              )}
              <div className={styles.spec}>
                <dt>Date Received</dt>
                <dd>{formatDate(set.dateReceived)}</dd>
              </div>
            </dl>

            {set.notes && (
              <div className={styles.notesSection}>
                <h2 className={styles.notesTitle}>Notes</h2>
                <p className={styles.notesContent}>{set.notes}</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {showEditModal && activeCollection && (
        <EditSetModal
          set={set}
          owners={activeCollection.owners}
          onSuccess={handleEditSuccess}
          onCancel={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}
