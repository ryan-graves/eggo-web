'use client';

import { useState } from 'react';
import { updateCollection, deleteCollection } from '@/lib/firebase';
import type { Collection } from '@/types';
import styles from './CollectionSettingsModal.module.css';

interface CollectionSettingsModalProps {
  collection: Collection;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CollectionSettingsModal({
  collection,
  onSuccess,
  onCancel,
}: CollectionSettingsModalProps): React.JSX.Element {
  const [name, setName] = useState(collection.name);
  const [ownersInput, setOwnersInput] = useState(collection.owners.join(', '));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      await updateCollection(collection.id, {
        name: name.trim(),
        owners,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update collection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await deleteCollection(collection.id);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete collection');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Collection Settings</h2>
          <button type="button" className={styles.closeButton} onClick={onCancel}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M15 5L5 15M5 5L15 15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {showDeleteConfirm ? (
          <div className={styles.deleteConfirm}>
            <p className={styles.deleteWarning}>
              Are you sure you want to delete <strong>{collection.name}</strong>?
            </p>
            <p className={styles.deleteNote}>
              This will permanently delete the collection and all its sets. This action cannot be
              undone.
            </p>
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.deleteActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.confirmDeleteButton}
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Collection'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="collectionName" className={styles.label}>
                Collection Name
              </label>
              <input
                id="collectionName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.input}
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="owners" className={styles.label}>
                Owners
              </label>
              <input
                id="owners"
                type="text"
                value={ownersInput}
                onChange={(e) => setOwnersInput(e.target.value)}
                placeholder="e.g., Ryan, Alyssa"
                className={styles.input}
                disabled={isSubmitting}
              />
              <p className={styles.hint}>Separate multiple owners with commas</p>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button type="submit" className={styles.saveButton} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

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
      </div>
    </div>
  );
}
