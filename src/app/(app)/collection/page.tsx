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
import { BulkRefreshModal } from '@/components/BulkRefreshModal';
import styles from './page.module.css';

type ViewMode = 'home' | 'all';

export default function CollectionPage(): React.JSX.Element {
  const { user } = useAuth();
  const { collections, activeCollection, sets, loading, setsLoading, setActiveCollection } = useCollection();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCollectionSettings, setShowCollectionSettings] = useState(false);
  const [showBulkRefresh, setShowBulkRefresh] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('home');

  const handleAddSuccess = () => {
    setShowAddForm(false);
  };

  // Show loading state while collections or sets are loading
  if (loading || (activeCollection && setsLoading)) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading your collection...</div>
      </div>
    );
  }

  // Show create collection flow if user has no collections
  if (collections.length === 0) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>Eggo</h1>
          <div className={styles.userInfo}>
            <Link href="/settings" className={styles.settingsLink}>
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
              <span className={styles.userName}>{user?.displayName || user?.email}</span>
            </Link>
          </div>
        </header>
        <CreateCollection />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Eggo</h1>
          <CollectionSelector
            collections={collections}
            activeCollection={activeCollection}
            onSelect={setActiveCollection}
          />
          {activeCollection && (
            <button
              type="button"
              className={styles.collectionSettingsButton}
              onClick={() => setShowCollectionSettings(true)}
              aria-label="Collection settings"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          )}
        </div>
        <div className={styles.userInfo}>
          <Link href="/settings" className={styles.settingsLink}>
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
            <span className={styles.userName}>{user?.displayName || user?.email}</span>
          </Link>
        </div>
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
          <div className={styles.toolbarActions}>
            <button
              type="button"
              onClick={() => setShowBulkRefresh(true)}
              className={styles.refreshButton}
              title="Refresh set data from Brickset"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
              <span className={styles.buttonLabel}>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className={styles.addButton}
            >
              + Add Set
            </button>
          </div>
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

      {showBulkRefresh && (
        <BulkRefreshModal sets={sets} onClose={() => setShowBulkRefresh(false)} />
      )}
    </div>
  );
}
