'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCollection } from '@/hooks/useCollection';
import { CreateCollection } from '@/components/CreateCollection';
import { CollectionSelector } from '@/components/CollectionSelector';
import { CollectionSettingsModal } from '@/components/CollectionSettingsModal';
import { CollectionHome } from '@/components/CollectionHome';
import { SetList } from '@/components/SetList';
import { AddSetForm } from '@/components/AddSetForm';
import { SetCardSkeleton } from '@/components/SetCardSkeleton';
import styles from './page.module.css';

type ViewMode = 'home' | 'all';

function CollectionSkeleton(): React.JSX.Element {
  return (
    <div className={styles.page}>
      {/* Use actual header classes to prevent layout shift */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Eggo</h1>
          <div className={`${styles.skeleton} ${styles.skeletonSelector}`} />
        </div>
        <div className={`${styles.skeleton} ${styles.skeletonAvatar}`} />
      </header>

      <main className={styles.main}>
        <div className={styles.toolbar}>
          <div className={`${styles.skeleton} ${styles.skeletonToggle}`} />
          <div className={`${styles.skeleton} ${styles.skeletonAddButton}`} />
        </div>

        {/* Skeleton section title */}
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

export default function CollectionPage(): React.JSX.Element {
  const { user } = useAuth();
  const { collections, activeCollection, sets, isInitializing, setActiveCollection } = useCollection();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCollectionSettings, setShowCollectionSettings] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('home');

  const handleAddSuccess = () => {
    setShowAddForm(false);
  };

  // Show skeleton UI during initial app load
  if (isInitializing) {
    return <CollectionSkeleton />;
  }

  // Show create collection flow if user has no collections
  if (collections.length === 0) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>Eggo</h1>
          </div>
          <Link href="/settings" className={styles.avatarLink}>
            {user?.photoURL && (
              <Image
                src={user.photoURL}
                alt=""
                width={32}
                height={32}
                className={styles.avatar}
                referrerPolicy="no-referrer"
              />
            )}
          </Link>
        </header>
        <CreateCollection />
      </div>
    );
  }

  return (
    <div className={`${styles.page} ${styles.content}`}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Eggo</h1>
          <CollectionSelector
            collections={collections}
            activeCollection={activeCollection}
            onSelect={setActiveCollection}
            onSettingsClick={activeCollection ? () => setShowCollectionSettings(true) : undefined}
          />
        </div>
        <Link href="/settings" className={styles.avatarLink}>
          {user?.photoURL && (
            <Image
              src={user.photoURL}
              alt=""
              width={32}
              height={32}
              className={styles.avatar}
              referrerPolicy="no-referrer"
            />
          )}
        </Link>
      </header>

      <main className={styles.main}>
        <div className={styles.toolbar}>
          <div className={styles.viewToggle}>
            <button
              type="button"
              className={`${styles.viewToggleButton} ${viewMode === 'home' ? styles.active : ''}`}
              onClick={() => setViewMode('home')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Home
            </button>
            <button
              type="button"
              className={`${styles.viewToggleButton} ${viewMode === 'all' ? styles.active : ''}`}
              onClick={() => setViewMode('all')}
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
            onClick={() => setShowAddForm(true)}
            className={styles.addButton}
          >
            + Add Set
          </button>
        </div>

        {activeCollection && (
          viewMode === 'home' ? (
            <CollectionHome sets={sets} />
          ) : (
            <SetList sets={sets} availableOwners={activeCollection.owners} />
          )
        )}
      </main>

      {showAddForm && activeCollection && (
        <AddSetForm
          collectionId={activeCollection.id}
          availableOwners={activeCollection.owners}
          onSuccess={handleAddSuccess}
          onCancel={() => setShowAddForm(false)}
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
