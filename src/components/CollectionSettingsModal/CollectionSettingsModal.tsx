'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Drawer } from 'vaul';
import { updateCollection, deleteCollection } from '@/lib/firebase';
import type { Collection } from '@/types';
import styles from './CollectionSettingsModal.module.css';

interface CollectionSettingsModalProps {
  open: boolean;
  onClose: () => void;
  collection: Collection;
  onSuccess: () => void;
}

export function CollectionSettingsModal({
  open,
  onClose,
  collection,
  onSuccess,
}: CollectionSettingsModalProps): React.JSX.Element {
  const [name, setName] = useState(collection.name);
  const [ownersInput, setOwnersInput] = useState(collection.owners.join(', '));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset all form state on the open transition (false → true).
  // Uses prevOpen ref (same pattern as AddSetForm) so the reset body only
  // runs once per open, not on every Firestore snapshot reference change.
  const prevOpen = useRef(false);
  useEffect(() => {
    if (open && !prevOpen.current) {
      setName(collection.name);
      setOwnersInput(collection.owners.join(', '));
      setIsSubmitting(false);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setError(null);
    }
    prevOpen.current = open;
  }, [open, collection]);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) onClose();
    },
    [onClose]
  );

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
    <Drawer.Root open={open} onOpenChange={handleOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay />
        <Drawer.Content className={`modal-sheet ${styles.scrollable}`} aria-describedby={undefined}>
          <Drawer.Handle />
          <div className="modal-header">
            <Drawer.Title className="modal-title">Collection Settings</Drawer.Title>
            <Drawer.Close className="modal-icon-button" aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M15 5L5 15M5 5L15 15"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </Drawer.Close>
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
          ) : (
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className="form-field">
                <label htmlFor="collectionName" className="form-label">
                  Collection Name
                </label>
                <input
                  id="collectionName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`form-input ${styles.input}`}
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
                  className={`form-input ${styles.input}`}
                  disabled={isSubmitting}
                />
                <p className={styles.hint}>Separate multiple owners with commas</p>
              </div>

              {error && <p className="form-error">{error}</p>}

              <div className={styles.actions}>
                <Drawer.Close className="btn-default btn-secondary" disabled={isSubmitting}>
                  Cancel
                </Drawer.Close>
                <button type="submit" className="btn-default btn-primary" disabled={isSubmitting}>
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
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
