'use client';

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Link } from 'next-view-transitions';
import { PublicCollectionProvider, usePublicCollection } from '@/hooks/usePublicCollection';
import { PublicBanner } from '@/components/PublicBanner';
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

function PublicSetDetailContent(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const { collection, sets, isLoading, error, shareToken } = usePublicCollection();

  const setId = params.setId as string;
  const set = sets.find((s) => s.id === setId);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <h1>Collection Not Found</h1>
          <p>This collection is not available or is no longer public.</p>
          <Link href="/sign-in" className={styles.backLink}>
            Start Your Own Collection
          </Link>
        </div>
      </div>
    );
  }

  if (!set) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <h1>Set Not Found</h1>
          <p>The set you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <Link href={`/share/${shareToken}`} className={styles.backLink}>
            Back to Collection
          </Link>
        </div>
      </div>
    );
  }

  const viewSettings = collection.publicViewSettings;
  const showOwner = viewSettings?.showOwner ?? true;
  const showDateReceived = viewSettings?.showDateReceived ?? true;
  const showOccasion = viewSettings?.showOccasion ?? true;
  const showNotes = viewSettings?.showNotes ?? true;

  const imageUrl = set.customImageUrl || set.imageUrl;

  // Build story text based on visibility settings
  const buildStoryText = () => {
    const parts: string[] = [];

    if (showOwner && set.owners.length > 0 && showDateReceived && set.dateReceived) {
      parts.push(`${set.owners.join(' & ')} got this on ${formatDateForDisplay(set.dateReceived)}`);
      if (showOccasion && set.occasion) {
        parts.push(`for ${set.occasion}`);
      }
    } else if (showOwner && set.owners.length > 0) {
      parts.push(`Belongs to ${set.owners.join(' & ')}`);
      if (showOccasion && set.occasion) {
        parts.push(`— ${set.occasion}`);
      }
    } else if (showDateReceived && set.dateReceived) {
      parts.push(`Got this on ${formatDateForDisplay(set.dateReceived)}`);
      if (showOccasion && set.occasion) {
        parts.push(`for ${set.occasion}`);
      }
    } else if (showOccasion && set.occasion) {
      parts.push(set.occasion);
    }

    return parts.join(' ');
  };

  const storyText = buildStoryText();
  const hasStory = storyText || set.hasBeenAssembled;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          type="button"
          onClick={() => router.back()}
          className={styles.backButton}
          aria-label="Back to collection"
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
            {hasStory && (
              <div className={styles.storyCard}>
                {storyText && <p className={styles.storyText}>{storyText}</p>}
                {set.hasBeenAssembled && (
                  <span className={styles.builtBadge}>Built before</span>
                )}
              </div>
            )}

            {showNotes && set.notes && (
              <div className={styles.notesSection}>
                <h2 className={styles.notesTitle}>Notes</h2>
                <p className={styles.notesContent}>{set.notes}</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <PublicBanner />
    </div>
  );
}

export default function PublicSetDetailPage(): React.JSX.Element {
  const params = useParams();
  const shareToken = params.shareToken as string;

  return (
    <PublicCollectionProvider shareToken={shareToken}>
      <PublicSetDetailContent />
    </PublicCollectionProvider>
  );
}
