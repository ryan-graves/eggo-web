'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useCollection } from '@/hooks/useCollection';
import { Header } from '@/components/Header';
import { EditSetModal } from '@/components/EditSetModal';
import { formatDateForDisplay } from '@/lib/date';
import type { LegoSet } from '@/types';
import styles from './page.module.css';

const STATUS_LABELS: Record<LegoSet['status'], string> = {
  unopened: 'Unopened',
  in_progress: 'In Progress',
  rebuild_in_progress: 'Rebuilding',
  assembled: 'Assembled',
  disassembled: 'Disassembled',
};

function SetDetailLoading(): React.JSX.Element {
  return (
    <div className={styles.page}>
      <div className={styles.loading}>Loading...</div>
    </div>
  );
}

function SetDetailContent(): React.JSX.Element {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { sets, activeCollection, isInitializing } = useCollection();

  const setId = params.id as string;
  const set = sets.find((s) => s.id === setId);

  const action = searchParams.get('action');
  const showEditModal = action === 'edit';

  const openEditModal = () => {
    router.push(`/set/${setId}?action=edit`);
  };

  const closeEditModal = () => {
    router.push(`/set/${setId}`);
  };

  const handleEditSuccess = () => {
    closeEditModal();
  };

  if (isInitializing) {
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
          <Link href="/home" className={styles.backLink}>
            Back to Collection
          </Link>
        </div>
      </div>
    );
  }

  const imageUrl = set.customImageUrl || set.imageUrl;

  const editButton = (
    <button type="button" onClick={openEditModal} className={styles.editButton} aria-label="Edit set">
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
  );

  return (
    <div className={styles.page}>
      <Header variant="detail" title={set.name} rightContent={editButton} />

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
              <span className={`${styles.status} ${styles[set.status]}`}>
                {STATUS_LABELS[set.status]}
              </span>
            </div>

            {/* Set Info - compact horizontal stats */}
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

            {/* Collection Story */}
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
          availableOwners={activeCollection.owners}
          onSuccess={handleEditSuccess}
          onCancel={closeEditModal}
        />
      )}
    </div>
  );
}

export default function SetDetailPage(): React.JSX.Element {
  return (
    <Suspense fallback={<SetDetailLoading />}>
      <SetDetailContent />
    </Suspense>
  );
}
