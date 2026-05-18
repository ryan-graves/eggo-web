'use client';

import { useState, useEffect, Suspense, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCollection } from '@/hooks/useCollection';
import { Header } from '@/components/Header';
import { CreateCollection } from '@/components/CreateCollection';
import { CollectionSelector } from '@/components/CollectionSelector';
import { SetCardSkeleton } from '@/components/SetCardSkeleton';
import { LAST_BROWSE_PATH_KEY, SCROLL_POSITION_PREFIX, useNavigation } from '@/hooks/useNavigation';
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
      <div className={styles.skeletonCustomizeRow}>
        <div className={`${styles.skeleton} ${styles.skeletonCustomizeButton}`} />
      </div>

      {/* Featured section — title, subtitle, and a pair of catalog plates */}
      <div className={styles.skeletonSection}>
        <div className={`${styles.skeleton} ${styles.skeletonFeaturedTitle}`} />
        <div className={`${styles.skeleton} ${styles.skeletonSubtitle}`} />
        <div className={styles.skeletonFeaturedGrid}>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className={styles.skeletonPlate}>
              <div className={`${styles.skeleton} ${styles.skeletonPlateImage}`} />
              <div className={styles.skeletonPlateInfo}>
                <div className={`${styles.skeleton} ${styles.skeletonPlateName}`} />
                <div className={`${styles.skeleton} ${styles.skeletonPlateLine}`} />
                <div className={`${styles.skeleton} ${styles.skeletonPlateLine}`} />
                <div className={`${styles.skeleton} ${styles.skeletonPlateStatus}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Standard carousel sections — matches the curated default's count */}
      {Array.from({ length: 3 }).map((_, section) => (
        <div key={section} className={styles.skeletonSection}>
          <div className={`${styles.skeleton} ${styles.skeletonSectionTitle}`} />
          <div className={styles.skeletonCarousel}>
            {Array.from({ length: 5 }).map((_, i) => (
              <SetCardSkeleton key={i} compact />
            ))}
          </div>
        </div>
      ))}
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

function CollectionError(): React.JSX.Element {
  return (
    <div className={styles.errorState}>
      <h2 className={styles.errorTitle}>We couldn’t load your collection</h2>
      <p className={styles.errorBody}>
        Something went wrong while loading. Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="btn-default btn-primary"
      >
        Try again
      </button>
    </div>
  );
}

function CollectionLayoutContent({ children }: CollectionLayoutProps): React.JSX.Element {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { navigateTo } = useNavigation();
  const { user } = useAuth();
  const { collections, activeCollection, setActiveCollection, sets, isInitializing, collectionsError, setsError } = useCollection();
  const [isPending, startTransition] = useTransition();
  const [pendingView, setPendingView] = useState<'home' | 'all' | null>(null);

  const actualIsAllSets = pathname === '/all';
  // Use pending view during transition, fall back to actual path
  const isAllSetsView = isPending && pendingView !== null ? pendingView === 'all' : actualIsAllSets;

  // Store the current browse path, including any active filter query, so set
  // detail pages can return to the same filtered view.
  useEffect(() => {
    const query = searchParams.toString();
    sessionStorage.setItem(
      LAST_BROWSE_PATH_KEY,
      query ? `${pathname}?${query}` : pathname
    );
  }, [pathname, searchParams]);

  // Restore scroll position when returning to this browse view
  useEffect(() => {
    if (isInitializing) return;

    const key = `${SCROLL_POSITION_PREFIX}${pathname}`;
    const savedScroll = sessionStorage.getItem(key);
    if (savedScroll) {
      const scrollY = parseInt(savedScroll, 10);
      sessionStorage.removeItem(key);
      // Restore saved scroll position
      window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior });
    }
  }, [pathname, isInitializing]);

  // Prefetch sibling routes for instant navigation
  useEffect(() => {
    router.prefetch('/home');
    router.prefetch('/all');
    router.prefetch('/settings');
  }, [router]);

  // Prefetch all set detail routes and preload images for instant navigation
  useEffect(() => {
    if (sets.length === 0) return;

    const prefetchSets = () => {
      for (const set of sets) {
        router.prefetch(`/set/${set.id}`);

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
  }, [sets, router]);

  const handleViewChange = (view: 'home' | 'all') => {
    const targetPath = view === 'all' ? '/all' : '/home';
    if (pathname === targetPath) return;

    // Track pending view for immediate visual feedback
    setPendingView(view);

    // Navigate in a transition so it doesn't block the UI
    startTransition(() => {
      router.push(targetPath);
    });
  };

  const openAddForm = () => {
    navigateTo('/add-set');
  };

  const avatarLink = user?.user_metadata?.avatar_url ? (
    <Link href="/settings" className={styles.avatarLink}>
      <Image
        src={user.user_metadata?.avatar_url}
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

  // A failed collections load leaves nothing to work with — show a full-page
  // error. A failed sets load is handled inside the normal shell below, so the
  // collection switcher stays available.
  if (collectionsError) {
    return (
      <div className={styles.page}>
        <Header variant="main" rightContent={avatarLink} />
        <CollectionError />
      </div>
    );
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
            onSettingsClick={activeCollection ? () => navigateTo('/collection-settings') : undefined}
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

        {setsError ? (
          <CollectionError />
        ) : isPending ? (
          isAllSetsView ? <AllSetsSkeleton /> : <HomeSkeleton />
        ) : (
          children
        )}
      </main>

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
