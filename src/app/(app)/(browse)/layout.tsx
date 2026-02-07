'use client';

import { useState, useEffect, Suspense, useTransition } from 'react';
import Image from 'next/image';
import { Link, useTransitionRouter } from 'next-view-transitions';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCollection } from '@/hooks/useCollection';
import { Header } from '@/components/Header';
import { CreateCollection } from '@/components/CreateCollection';
import { CollectionSelector } from '@/components/CollectionSelector';
import { CollectionSettingsModal } from '@/components/CollectionSettingsModal';
import { AddSetForm } from '@/components/AddSetForm';
import { SetCardSkeleton } from '@/components/SetCardSkeleton';
import { LAST_BROWSE_PATH_KEY } from '@/hooks/useViewTransition';
import styles from './page.module.css';

interface CollectionLayoutProps {
  children: React.ReactNode;
}

function SkeletonHeader(): React.JSX.Element {
  return (
    <div className={styles.skeletonHeader}>
      <div className={styles.skeletonHeaderLeft}>
        <div className={`${styles.skeleton} ${styles.skeletonLogo}`} />
        <div className={`${styles.skeleton} ${styles.skeletonSelector}`} />
      </div>
      <div className={`${styles.skeleton} ${styles.skeletonAvatar}`} />
    </div>
  );
}

function SkeletonToolbar(): React.JSX.Element {
  return (
    <div className={styles.toolbar}>
      <div className={`${styles.skeleton} ${styles.skeletonToggle}`} />
      <div className={`${styles.skeleton} ${styles.skeletonAddButton}`} />
    </div>
  );
}

function HomeSkeleton(): React.JSX.Element {
  return (
    <>
      <div className={styles.skeletonSection}>
        <div className={`${styles.skeleton} ${styles.skeletonSectionTitle}`} />
        <div className={styles.skeletonCarousel}>
          {Array.from({ length: 3 }).map((_, i) => (
            <SetCardSkeleton key={i} compact />
          ))}
        </div>
      </div>

      <div className={styles.skeletonSection}>
        <div className={`${styles.skeleton} ${styles.skeletonSectionTitle}`} />
        <div className={styles.skeletonCarousel}>
          {Array.from({ length: 3 }).map((_, i) => (
            <SetCardSkeleton key={i} compact />
          ))}
        </div>
      </div>
    </>
  );
}

function AllSetsSkeleton(): React.JSX.Element {
  return (
    <div className={styles.skeletonAllSetsContainer}>
      {/* Desktop filters */}
      <div className={styles.skeletonFilters}>
        <div className={`${styles.skeleton} ${styles.skeletonSearchInput}`} />
        <div className={`${styles.skeleton} ${styles.skeletonSelect}`} />
        <div className={`${styles.skeleton} ${styles.skeletonSelect}`} />
        <div className={`${styles.skeleton} ${styles.skeletonSelect}`} />
        <div className={styles.skeletonSortGroup}>
          <div className={`${styles.skeleton} ${styles.skeletonSelect}`} />
          <div className={`${styles.skeleton} ${styles.skeletonSortButton}`} />
        </div>
      </div>

      {/* Mobile filters */}
      <div className={styles.skeletonMobileFilters}>
        <div className={`${styles.skeleton} ${styles.skeletonSearchInput}`} />
        <div className={`${styles.skeleton} ${styles.skeletonFilterButton}`} />
      </div>

      <div className={styles.skeletonStats}>
        <div className={`${styles.skeleton} ${styles.skeletonStatText}`} />
        <div className={`${styles.skeleton} ${styles.skeletonStatTextLong}`} />
      </div>

      <div className={styles.skeletonGrid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SetCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function CollectionSkeleton({ isAllSets = false }: { isAllSets?: boolean }): React.JSX.Element {
  return (
    <div className={styles.page}>
      <SkeletonHeader />
      <main className={styles.main}>
        <SkeletonToolbar />
        {isAllSets ? <AllSetsSkeleton /> : <HomeSkeleton />}
      </main>
    </div>
  );
}

function SuspenseFallback(): React.JSX.Element {
  // Check path directly since we can't use hooks in fallback
  const isAllSets = typeof window !== 'undefined' && window.location.pathname === '/all';
  return <CollectionSkeleton isAllSets={isAllSets} />;
}

function CollectionLayoutContent({ children }: CollectionLayoutProps): React.JSX.Element {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const transitionRouter = useTransitionRouter();
  const standardRouter = useRouter();
  const { user } = useAuth();
  const { collections, activeCollection, setActiveCollection, sets, isInitializing } = useCollection();
  const [showCollectionSettings, setShowCollectionSettings] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [pendingView, setPendingView] = useState<'home' | 'all' | null>(null);

  const actualIsAllSets = pathname === '/all';
  // Use pending view during transition, fall back to actual path
  const isAllSetsView = isPending && pendingView !== null ? pendingView === 'all' : actualIsAllSets;
  const action = searchParams.get('action');
  const showAddForm = action === 'add-set';

  // Store the current browse path so set detail pages know where to return to
  useEffect(() => {
    sessionStorage.setItem(LAST_BROWSE_PATH_KEY, pathname);
  }, [pathname]);

  // Prefetch sibling routes for instant navigation
  useEffect(() => {
    transitionRouter.prefetch('/home');
    transitionRouter.prefetch('/all');
    transitionRouter.prefetch('/settings');
  }, [transitionRouter]);

  // Prefetch all set detail routes and preload images for instant navigation
  useEffect(() => {
    if (sets.length === 0) return;

    const prefetchSets = () => {
      for (const set of sets) {
        transitionRouter.prefetch(`/set/${set.id}`);

        // Preload the set image into the browser cache
        const imageUrl = set.customImageUrl || set.imageUrl;
        if (imageUrl) {
          const img = new window.Image();
          img.src = imageUrl;
        }
      }
    };

    // Use requestIdleCallback to avoid blocking the main thread
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(prefetchSets);
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(prefetchSets, 200);
    return () => clearTimeout(id);
  }, [sets, transitionRouter]);

  const handleViewChange = (view: 'home' | 'all') => {
    const targetPath = view === 'all' ? '/all' : '/home';
    if (pathname === targetPath) return;

    // Track pending view for immediate visual feedback
    setPendingView(view);

    // Navigate in a transition so it doesn't block the UI
    startTransition(() => {
      transitionRouter.push(targetPath);
    });
  };

  // Use the standard router for modal open/close — these are query param
  // changes, not page navigations, so a view transition crossfade would
  // fight the modal's own CSS animation and break the overlay's fixed
  // positioning on iOS Safari (safe area clipping).
  const openAddForm = () => {
    standardRouter.push(`${pathname}?action=add-set`);
  };

  const closeAddForm = () => {
    standardRouter.push(pathname);
  };

  const handleAddSuccess = () => {
    closeAddForm();
  };

  const avatarLink = user?.photoURL ? (
    <Link href="/settings" className={styles.avatarLink}>
      <Image
        src={user.photoURL}
        alt=""
        width={32}
        height={32}
        className={styles.avatar}
        referrerPolicy="no-referrer"
      />
    </Link>
  ) : null;

  if (isInitializing) {
    return <CollectionSkeleton isAllSets={pathname === '/all'} />;
  }

  if (collections.length === 0) {
    return (
      <div className={styles.page}>
        <Header variant="main" rightContent={avatarLink} />
        <CreateCollection />
      </div>
    );
  }

  return (
    <div className={`${styles.page} ${styles.content}`}>
      <Header
        variant="main"
        leftContent={
          <CollectionSelector
            collections={collections}
            activeCollection={activeCollection}
            onSelect={setActiveCollection}
            onSettingsClick={activeCollection ? () => setShowCollectionSettings(true) : undefined}
          />
        }
        rightContent={avatarLink}
      />

      <main className={styles.main}>
        <div className={styles.toolbar}>
          <div className={styles.viewToggle}>
            <button
              type="button"
              onClick={() => handleViewChange('home')}
              className={`${styles.viewToggleButton} ${!isAllSetsView ? styles.active : ''}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Home
            </button>
            <button
              type="button"
              onClick={() => handleViewChange('all')}
              className={`${styles.viewToggleButton} ${isAllSetsView ? styles.active : ''}`}
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
          <button
            type="button"
            onClick={openAddForm}
            className={styles.addButton}
          >
            + Add Set
          </button>
        </div>

        {isPending ? (
          isAllSetsView ? <AllSetsSkeleton /> : <HomeSkeleton />
        ) : (
          children
        )}
      </main>

      {activeCollection && (
        <AddSetForm
          open={showAddForm}
          onClose={closeAddForm}
          collectionId={activeCollection.id}
          availableOwners={activeCollection.owners}
          onSuccess={handleAddSuccess}
        />
      )}

      {activeCollection && (
        <CollectionSettingsModal
          open={showCollectionSettings}
          onClose={() => setShowCollectionSettings(false)}
          collection={activeCollection}
          onSuccess={() => setShowCollectionSettings(false)}
        />
      )}
    </div>
  );
}

export default function CollectionLayout({ children }: CollectionLayoutProps): React.JSX.Element {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <CollectionLayoutContent>{children}</CollectionLayoutContent>
    </Suspense>
  );
}
