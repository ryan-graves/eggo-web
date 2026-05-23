'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useCollection } from '@/hooks/useCollection';
import { Header } from '@/components/Header';
import { StatusControl } from '@/components/StatusControl';
import { formatDateForDisplay } from '@/lib/date';
import { LAST_BROWSE_PATH_KEY, useNavigation } from '@/hooks/useNavigation';
import { SET_IMAGE_VT_NAME, SET_NAME_VT_NAME } from '@/lib/viewTransitions';
import styles from './page.module.css';

function SetDetailLoading(): React.JSX.Element {
  return (
    <div className={styles.page}>
      <div className={styles.loading}>Loading...</div>
    </div>
  );
}

function SetDetailContent(): React.JSX.Element {
  const params = useParams();
  const { navigateTo, router } = useNavigation();
  const { sets, isInitializing } = useCollection();
  const [imageLoaded, setImageLoaded] = useState(false);

  const setId = params.id as string;
  const set = sets.find((s) => s.id === setId);

  // Prefetch the back navigation target for instant return
  useEffect(() => {
    const lastBrowsePath =
      typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(LAST_BROWSE_PATH_KEY) : null;
    router.prefetch(lastBrowsePath || '/home');
  }, [router]);

  const openEdit = () => {
    navigateTo(`/set/${setId}/edit`);
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

  // Distilled metadata line: skip missing fields and collapse separators.
  const metadataParts: React.ReactNode[] = [];
  if (set.pieceCount) {
    metadataParts.push(
      <span key="pieces">{set.pieceCount.toLocaleString()} pieces</span>
    );
  }
  if (set.year) metadataParts.push(<span key="year">{set.year}</span>);
  if (set.theme) {
    const themeLabel = set.subtheme ? `${set.theme} › ${set.subtheme}` : set.theme;
    const themeHref = `/all?theme=${encodeURIComponent(set.theme)}`;
    metadataParts.push(
      <Link key="theme" href={themeHref} className={styles.themeLink}>
        {themeLabel}
      </Link>
    );
  }

  const editButton = (
    <button
      type="button"
      onClick={openEdit}
      className="btn-default btn-icon btn-primary"
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
  );

  return (
    <div className={styles.page}>
      <Header variant="detail" title={set.name} rightContent={editButton} />

      <main className={styles.main}>
        <div className={styles.content}>
          <div
            className={styles.imageSection}
            style={{ viewTransitionName: SET_IMAGE_VT_NAME }}
          >
            <div className={styles.imageContainer}>
              {imageUrl ? (
                <>
                  {!imageLoaded && <div className={styles.imageSkeleton} />}
                  <Image
                    src={imageUrl}
                    alt={set.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                    className={`${styles.image} ${imageLoaded ? styles.imageLoaded : ''}`}
                    priority
                    onLoad={() => setImageLoaded(true)}
                  />
                </>
              ) : (
                <div className={styles.placeholder}>No Image</div>
              )}
            </div>
          </div>

          <div className={styles.details}>
            <div className={styles.heading}>
              <p
                className={styles.setNumber}
                aria-label={`Set number ${set.setNumber}`}
              >
                #{set.setNumber}
              </p>
              <h1
                className={styles.name}
                style={{ viewTransitionName: SET_NAME_VT_NAME }}
              >
                {set.name}
              </h1>
              {metadataParts.length > 0 && (
                <p className={styles.metadata}>
                  {metadataParts.map((node, idx) => (
                    <span key={idx} className={styles.metadataItem}>
                      {idx > 0 && <span className={styles.metadataSep}>{'·'}</span>}
                      {node}
                    </span>
                  ))}
                </p>
              )}
              <div className={styles.statusRow}>
                <StatusControl setId={set.id} currentStatus={set.status} />
              </div>
            </div>

            {/* Collection Story — narrative engine unchanged per design direction. */}
            {(set.owners.length > 0 || set.dateReceived || set.hasBeenAssembled) && (
              <div className={styles.story}>
                <p className={styles.storyText}>
                  {set.owners.length > 0 && set.dateReceived ? (
                    <>
                      {set.owners.join(' & ')} got this on {formatDateForDisplay(set.dateReceived)}
                      {set.occasion ? <> for {set.occasion}</> : <>, for fun</>}
                    </>
                  ) : set.owners.length > 0 ? (
                    <>
                      Belongs to {set.owners.join(' & ')}
                      {set.occasion && <> {'—'} {set.occasion}</>}
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
              <section className={styles.notesSection}>
                <h2 className={styles.notesTitle}>Notes</h2>
                <p className={styles.notesContent}>{set.notes}</p>
              </section>
            )}
          </div>
        </div>
      </main>
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
