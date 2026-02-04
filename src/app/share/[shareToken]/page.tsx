'use client';

import { useParams } from 'next/navigation';
import { Link } from 'next-view-transitions';
import { PublicCollectionProvider, usePublicCollection } from '@/hooks/usePublicCollection';
import { PublicSetList } from '@/components/PublicSetList';
import { PublicBanner } from '@/components/PublicBanner';
import styles from './page.module.css';

function PublicCollectionContent(): React.JSX.Element {
  const { collection, sets, isLoading, error, shareToken } = usePublicCollection();

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading collection...</div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <h1>Collection Not Found</h1>
          <p>{error || 'This collection is not available or is no longer public.'}</p>
          <Link href="/sign-in" className="btn-default btn-primary">
            Start Your Own Collection
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={`${styles.title} eggo-logo`}>Eggo</h1>
          <div className={styles.collectionPill}>
            <span className={styles.collectionName}>{collection.name}</span>
          </div>
        </div>
        <Link href="/sign-in" className="btn-default btn-primary">
          Sign Up
        </Link>
      </header>

      <main className={styles.main}>
        <PublicSetList
          sets={sets}
          availableOwners={collection.owners}
          shareToken={shareToken}
          viewSettings={collection.publicViewSettings}
        />
      </main>

      <PublicBanner />
    </div>
  );
}

export default function PublicCollectionPage(): React.JSX.Element {
  const params = useParams();
  const shareToken = params.shareToken as string;

  return (
    <PublicCollectionProvider shareToken={shareToken}>
      <PublicCollectionContent />
    </PublicCollectionProvider>
  );
}
