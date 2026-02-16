'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PublicCollectionProvider, usePublicCollection } from '@/hooks/usePublicCollection';
import { SetList } from '@/components/SetList';
import { CollectionHome } from '@/components/CollectionHome';
import { PublicBanner } from '@/components/PublicBanner';
import styles from './page.module.css';

function PublicCollectionContent(): React.JSX.Element {
  const { collection, sets, isLoading, error, shareToken } = usePublicCollection();
  const [activeView, setActiveView] = useState<'home' | 'all'>('home');

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

  const viewSettings = collection.publicViewSettings;
  const showHomeView = viewSettings?.showHomeView ?? false;
  const hideStatus = viewSettings ? !viewSettings.showStatus : false;
  const linkPrefix = `/share/${shareToken}/set`;

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
        {showHomeView && (
          <div className={styles.toolbar}>
            <div className={styles.viewToggle}>
              <button
                type="button"
                onClick={() => setActiveView('home')}
                className={`${styles.viewToggleButton} ${activeView === 'home' ? styles.active : ''}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Home
              </button>
              <button
                type="button"
                onClick={() => setActiveView('all')}
                className={`${styles.viewToggleButton} ${activeView === 'all' ? styles.active : ''}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                All Sets
              </button>
            </div>
          </div>
        )}

        {showHomeView && activeView === 'home' ? (
          <CollectionHome
            sets={sets}
            readOnly
            linkPrefix={linkPrefix}
            hideStatus={hideStatus}
          />
        ) : (
          <SetList
            sets={sets}
            availableOwners={collection.owners}
            linkPrefix={linkPrefix}
            viewSettings={viewSettings}
            emptyMessage="This collection is empty."
          />
        )}
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
