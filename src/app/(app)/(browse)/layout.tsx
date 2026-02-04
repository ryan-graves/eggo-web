'use client';

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
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

function CollectionSkeleton(): React.JSX.Element {
  return (
    <div className={styles.page}>
      <div className={styles.skeletonHeader}>
        <div className={styles.skeletonHeaderLeft}>
          <div className={`${styles.skeleton} ${styles.skeletonLogo}`} />
          <div className={`${styles.skeleton} ${styles.skeletonSelector}`} />
        </div>
        <div className={`${styles.skeleton} ${styles.skeletonAvatar}`} />
      </div>

      <main className={styles.main}>
        <div className={styles.toolbar}>
          <div className={`${styles.skeleton} ${styles.skeletonToggle}`} />
          <div className={`${styles.skeleton} ${styles.skeletonAddButton}`} />
        </div>

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
      </main>
    </div>
  );
}

function CollectionLayoutContent({ children }: CollectionLayoutProps): React.JSX.Element {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { collections, activeCollection, setActiveCollection, isInitializing } = useCollection();
  const [showCollectionSettings, setShowCollectionSettings] = useState(false);

  const isAllSetsView = pathname === '/all';
  const action = searchParams.get('action');
  const showAddForm = action === 'add-set';

  // Store the current browse path so set detail pages know where to return to
  useEffect(() => {
    sessionStorage.setItem(LAST_BROWSE_PATH_KEY, pathname);
  }, [pathname]);

  const openAddForm = () => {
    router.push(`${pathname}?action=add-set`);
  };

  const closeAddForm = () => {
    router.push(pathname);
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
    return <CollectionSkeleton />;
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
            <Link
              href="/home"
              className={`${styles.viewToggleButton} ${!isAllSetsView ? styles.active : ''}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Home
            </Link>
            <Link
              href="/all"
              className={`${styles.viewToggleButton} ${isAllSetsView ? styles.active : ''}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              All Sets
            </Link>
          </div>
          <button
            type="button"
            onClick={openAddForm}
            className={styles.addButton}
          >
            + Add Set
          </button>
        </div>

        {children}
      </main>

      {showAddForm && activeCollection && (
        <AddSetForm
          collectionId={activeCollection.id}
          availableOwners={activeCollection.owners}
          onSuccess={handleAddSuccess}
          onCancel={closeAddForm}
        />
      )}

      {showCollectionSettings && activeCollection && (
        <CollectionSettingsModal
          collection={activeCollection}
          onSuccess={() => setShowCollectionSettings(false)}
          onCancel={() => setShowCollectionSettings(false)}
        />
      )}
    </div>
  );
}

export default function CollectionLayout({ children }: CollectionLayoutProps): React.JSX.Element {
  return (
    <Suspense fallback={<CollectionSkeleton />}>
      <CollectionLayoutContent>{children}</CollectionLayoutContent>
    </Suspense>
  );
}
