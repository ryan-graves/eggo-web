'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { useCollection } from '@/hooks/useCollection';
import { CreateCollection } from '@/components/CreateCollection';
import { SetList } from '@/components/SetList';
import { AddSetForm } from '@/components/AddSetForm';
import { EditSetModal } from '@/components/EditSetModal';
import type { LegoSet } from '@/types';
import styles from './page.module.css';

export default function CollectionPage(): React.JSX.Element {
  const { user, signOut } = useAuth();
  const { collections, activeCollection, sets, loading } = useCollection();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSet, setEditingSet] = useState<LegoSet | null>(null);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // Error handling is in auth context
    }
  };

  const handleSetClick = (set: LegoSet) => {
    setEditingSet(set);
  };

  const handleAddSuccess = () => {
    setShowAddForm(false);
  };

  const handleEditSuccess = () => {
    setEditingSet(null);
  };

  // Show loading state
  if (loading) {
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
            <button onClick={handleSignOut} className={styles.signOutButton} type="button">
              Sign Out
            </button>
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
          {activeCollection && (
            <span className={styles.collectionName}>{activeCollection.name}</span>
          )}
        </div>
        <div className={styles.userInfo}>
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
          <button onClick={handleSignOut} className={styles.signOutButton} type="button">
            Sign Out
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.toolbar}>
          <h2 className={styles.sectionTitle}>Your Sets</h2>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className={styles.addButton}
          >
            + Add Set
          </button>
        </div>

        {activeCollection && (
          <SetList
            sets={sets}
            owners={activeCollection.owners}
            onSetClick={handleSetClick}
          />
        )}
      </main>

      {showAddForm && activeCollection && (
        <AddSetForm
          collectionId={activeCollection.id}
          owners={activeCollection.owners}
          onSuccess={handleAddSuccess}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {editingSet && activeCollection && (
        <EditSetModal
          set={editingSet}
          owners={activeCollection.owners}
          onSuccess={handleEditSuccess}
          onCancel={() => setEditingSet(null)}
        />
      )}
    </div>
  );
}
