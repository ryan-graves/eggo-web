'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Timestamp } from 'firebase/firestore';
import { updateSet, deleteSet, refreshSetMetadata } from '@/lib/firebase';
import type { LegoSet, SetStatus } from '@/types';
import styles from './EditSetModal.module.css';

interface EditSetModalProps {
  set: LegoSet;
  owners: string[];
  onSuccess: () => void;
  onCancel: () => void;
}

const STATUS_OPTIONS: { value: SetStatus; label: string }[] = [
  { value: 'unopened', label: 'Unopened' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'rebuild_in_progress', label: 'Rebuilding' },
  { value: 'assembled', label: 'Assembled' },
  { value: 'disassembled', label: 'Disassembled' },
];

function formatDate(timestamp: Timestamp | null): string {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  return date.toISOString().split('T')[0];
}

export function EditSetModal({
  set,
  owners,
  onSuccess,
  onCancel,
}: EditSetModalProps): React.JSX.Element {
  const [name, setName] = useState(set.name);
  const [status, setStatus] = useState<SetStatus>(set.status);
  const [owner, setOwner] = useState(set.owner);
  const [occasion, setOccasion] = useState(set.occasion);
  const [dateReceived, setDateReceived] = useState(formatDate(set.dateReceived));
  const [notes, setNotes] = useState(set.notes || '');
  const [hasBeenAssembled, setHasBeenAssembled] = useState(set.hasBeenAssembled);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [currentSet, setCurrentSet] = useState(set);
  const imageUrl = currentSet.customImageUrl || currentSet.imageUrl;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const updated = await refreshSetMetadata(set.id);
      if (updated) {
        setCurrentSet(updated);
        setName(updated.name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh metadata');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Set name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await updateSet(set.id, {
        name: name.trim(),
        status,
        hasBeenAssembled:
          hasBeenAssembled || status === 'assembled' || status === 'disassembled',
        owner,
        occasion: occasion.trim(),
        dateReceived: dateReceived ? Timestamp.fromDate(new Date(dateReceived)) : null,
        notes: notes.trim() || undefined,
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update set');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await deleteSet(set.id);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete set');
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Edit Set</h2>
          <button type="button" onClick={onCancel} className={styles.closeButton}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.setInfo}>
            {imageUrl ? (
              <div className={styles.imageContainer}>
                <Image
                  src={imageUrl}
                  alt={currentSet.name}
                  width={120}
                  height={90}
                  style={{ objectFit: 'contain' }}
                />
              </div>
            ) : (
              <div className={styles.noImage}>No Image</div>
            )}
            <div className={styles.setMeta}>
              <p className={styles.setNumber}>{currentSet.setNumber}</p>
              {currentSet.pieceCount && (
                <p className={styles.pieces}>{currentSet.pieceCount.toLocaleString()} pieces</p>
              )}
              {currentSet.theme && (
                <p className={styles.theme}>
                  {currentSet.theme}
                  {currentSet.subtheme && ` › ${currentSet.subtheme}`}
                </p>
              )}
              {currentSet.year && <p className={styles.year}>{currentSet.year}</p>}
              <button
                type="button"
                onClick={handleRefresh}
                className={styles.refreshButton}
                disabled={isRefreshing}
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
              </button>
            </div>
          </div>

          <div className={styles.fields}>
            <div className={styles.field}>
              <label htmlFor="name" className={styles.label}>
                Name *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.input}
                required
              />
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="status" className={styles.label}>
                  Status
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as SetStatus)}
                  className={styles.select}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="owner" className={styles.label}>
                  Owner
                </label>
                <select
                  id="owner"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className={styles.select}
                >
                  {owners.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={hasBeenAssembled}
                  onChange={(e) => setHasBeenAssembled(e.target.checked)}
                  className={styles.checkbox}
                />
                Has been assembled before
              </label>
            </div>

            <div className={styles.field}>
              <label htmlFor="occasion" className={styles.label}>
                Occasion
              </label>
              <input
                id="occasion"
                type="text"
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                placeholder="e.g., Christmas 2024 from Alyssa's parents"
                className={styles.input}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="dateReceived" className={styles.label}>
                Date Received
              </label>
              <input
                id="dateReceived"
                type="date"
                value={dateReceived}
                onChange={(e) => setDateReceived(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="notes" className={styles.label}>
                Notes
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={styles.textarea}
                rows={3}
              />
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            {showDeleteConfirm ? (
              <div className={styles.deleteConfirm}>
                <span>Delete this set?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  className={styles.confirmDeleteButton}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Yes, delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className={styles.cancelDeleteButton}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className={styles.deleteButton}
              >
                Delete
              </button>
            )}

            <div className={styles.rightActions}>
              <button type="button" onClick={onCancel} className={styles.cancelButton}>
                Cancel
              </button>
              <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
