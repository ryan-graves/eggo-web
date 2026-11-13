'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { PublicCollectionProvider, usePublicCollection } from '@/hooks/usePublicCollection';
import { useScrollMemory } from '@/hooks/useScrollMemory';
import { SetList } from '@/components/SetList';
import { CollectionHome } from '@/components/CollectionHome';
import { PublicBanner } from '@/components/PublicBanner';
import { Header } from '@/components/Header';
import styles from './page.module.css';

type PublicView = 'home' | 'all';

/** SessionStorage key prefix for the public page's remembered view, per share token. */
const PUBLIC_VIEW_PREFIX = 'eggo_share_view:';

function readRememberedView(shareToken: string): PublicView {
  try {
    return sessionStorage.getItem(`${PUBLIC_VIEW_PREFIX}${shareToken}`) === 'all' ? 'all' : 'home';
  } catch {
    return 'home';
  }
}

function PublicCollectionContent(): React.JSX.Element {
  const { collection, sets, isLoading, error, shareToken } = usePublicCollection();
  const pathname = usePathname();
  // The view is remembered per tab so coming back from a set (this page
  // remounts) lands on the same view, with its own scroll position.
  const [activeView, setActiveView] = useState<PublicView>(() => readRememberedView(shareToken));
  useEffect(() => {
    try {
      sessionStorage.setItem(`${PUBLIC_VIEW_PREFIX}${shareToken}`, activeView);
    } catch {
      // Storage unavailable: the view just resets on return.
    }
  }, [shareToken, activeView]);

  const showHomeView = collection?.publicViewSettings?.showHomeView ?? false;
  const currentView: PublicView = showHomeView && activeView === 'home' ? 'home' : 'all';
  useScrollMemory(pathname, {
    paused: false,
    ready: !isLoading && !!collection,
    key: `${pathname}:${currentView}`,
  });

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
          <Link href="/" className="btn-default btn-primary">
            Start Your Own Collection
          </Link>
        </div>
      </div>
    );
  }

  const viewSettings = collection.publicViewSettings;
  const hideStatus = viewSettings ? !(viewSettings.showStatus ?? true) : false;
  const linkPrefix = `/share/${shareToken}/set`;

  return (
    <div className={styles.page}>
      <Header
        variant="main"
        leftContent={
          <div className={styles.collectionPill}>
            <span className={styles.collectionName}>{collection.name}</span>
          </div>
        }
        rightContent={
          <Link href="/" className="btn-default btn-primary">
            Sign Up
          </Link>
        }
      />

      <main className={`${styles.main} content-column`}>
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

        {currentView === 'home' ? (
          <CollectionHome
            sets={sets}
            sections={collection.homeSections}
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
