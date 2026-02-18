'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useViewTransition } from '@/hooks/useViewTransition';
import { useCollection } from '@/hooks/useCollection';
import { Header } from '@/components/Header';
import { updateCollection, deleteCollection } from '@/lib/firebase';
import styles from './page.module.css';

function CollectionSettingsContent(): React.JSX.Element {
  const { goBack, navigateBack } = useViewTransition();
  const { activeCollection, isInitializing } = useCollection();

  const [name, setName] = useState(activeCollection?.name ?? '');
  const [ownersInput, setOwnersInput] = useState(activeCollection?.owners.join(', ') ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync form state when collection data first becomes available (e.g.
  // deep-link before Firestore has loaded). Only runs once to avoid
  // overwriting edits.
  const hasInitializedForm = useRef(!!activeCollection);
  useEffect(() => {
    if (activeCollection && !hasInitializedForm.current) {
      hasInitializedForm.current = true;
      setName(activeCollection.name);
      setOwnersInput(activeCollection.owners.join(', '));
    }
  }, [activeCollection]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeCollection) return;

    if (!name.trim()) {
      setError('Please enter a collection name');
      return;
    }

    const owners = ownersInput
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o.length > 0);

    if (owners.length === 0) {
      setError('Please enter at least one owner name');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await updateCollection(activeCollection.id, {
        name: name.trim(),
        owners,
      });
      goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update collection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!activeCollection) return;

    setIsDeleting(true);
    setError(null);

    try {
      await deleteCollection(activeCollection.id);
      navigateBack('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete collection');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (isInitializing) {
    return (
      <div className={styles.page}>
        <Header variant="detail" title="Collection Settings" backHref="/home" />
        <main className={styles.main}>
          <div className={styles.loading}>Loading...</div>
        </main>
      </div>
    );
  }

  if (!activeCollection) {
    return (
      <div className={styles.page}>
        <Header variant="detail" title="Collection Settings" backHref="/home" />
        <main className={styles.main}>
          <div className={styles.loading}>No collection selected</div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header variant="detail" title="Collection Settings" backHref="/home" />

      <main className={styles.main}>
        {showDeleteConfirm ? (
          <div className={styles.container}>
            <div className={styles.deleteConfirmSection}>
              <p className={styles.deleteWarning}>
                Are you sure you want to delete <strong>{activeCollection.name}</strong>?
              </p>
              <p className={styles.deleteNote}>
                This will permanently delete the collection and all its sets. This action cannot be
                undone.
              </p>
              {error && <p className="form-error">{error}</p>}
              <div className={styles.deleteActions}>
                <button
                  type="button"
                  className="btn-default btn-secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-default btn-danger"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Collection'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form id="collection-settings-form" onSubmit={handleSubmit} className={styles.container}>
            <div className="form-field">
              <label htmlFor="collectionName" className="form-label">
                Collection Name
              </label>
              <input
                id="collectionName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-field">
              <label htmlFor="owners" className="form-label">
                Owners
              </label>
              <input
                id="owners"
                type="text"
                value={ownersInput}
                onChange={(e) => setOwnersInput(e.target.value)}
                placeholder="e.g., Ryan, Alyssa"
                className="form-input"
                disabled={isSubmitting}
              />
              <p className={styles.hint}>Separate multiple owners with commas</p>
            </div>

            {error && <p className="form-error">{error}</p>}

            {/* Danger Zone */}
            <div className={styles.dangerZone}>
              <h3 className={styles.dangerTitle}>Danger Zone</h3>
              <p className={styles.dangerDescription}>
                Permanently delete this collection and all its sets.
              </p>
              <button
                type="button"
                className={styles.deleteButton}
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting}
              >
                Delete Collection
              </button>
            </div>
          </form>
        )}
      </main>

      {!showDeleteConfirm && (
        <footer className={styles.footer}>
          <button type="button" onClick={goBack} className="btn-default btn-secondary" disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" form="collection-settings-form" className="btn-default btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </footer>
      )}
    </div>
  );
}

export default function CollectionSettingsPage(): React.JSX.Element {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh' }} />}>
      <CollectionSettingsContent />
    </Suspense>
  );
}
