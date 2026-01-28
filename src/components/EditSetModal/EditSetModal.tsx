'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Timestamp } from 'firebase/firestore';
import { updateSet, deleteSet, refreshSetMetadata } from '@/lib/firebase';
import type { LegoSet, SetStatus } from '@/types';
import styles from './EditSetModal.module.css';

interface EditSetModalProps {
  set: LegoSet;
  availableOwners: string[];
  onSuccess: () => void;
  onCancel: () => void;
}

const STATUS_OPTIONS: { value: SetStatus; label: string }[] = [
  { value: 'unopened', label: 'Unopened' },
  { value: 'in_progress', label: 'Building' },
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
  availableOwners,
  onSuccess,
  onCancel,
}: EditSetModalProps): React.JSX.Element {
  const [name, setName] = useState(set.name);
  const [status, setStatus] = useState<SetStatus>(set.status);
  const [selectedOwners, setSelectedOwners] = useState<string[]>(set.owners);
  const [occasion, setOccasion] = useState(set.occasion);

  const toggleOwner = (ownerName: string) => {
    setSelectedOwners((prev) =>
      prev.includes(ownerName) ? prev.filter((o) => o !== ownerName) : [...prev, ownerName]
    );
  };
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
        owners: selectedOwners,
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

  const isBusy = isSubmitting || isDeleting || isRefreshing;

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Edit Set</h2>
          <button
            type="button"
            onClick={onCancel}
            className={styles.closeButton}
            disabled={isBusy}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.scrollArea}>
            {/* Hero - Image & Core Info */}
            <div className={styles.hero}>
              {imageUrl && (
                <div className={styles.imageWrapper}>
                  <Image
                    src={imageUrl}
                    alt={currentSet.name}
                    fill
                    style={{ objectFit: 'contain' }}
                    sizes="140px"
                  />
                </div>
              )}
              <div className={styles.heroInfo}>
                <span className={styles.setNumber}>{currentSet.setNumber}</span>
                <h3 className={styles.setName}>{currentSet.name}</h3>
                <span className={styles.meta}>
                  {currentSet.pieceCount?.toLocaleString()} pcs
                  {currentSet.year && ` · ${currentSet.year}`}
                </span>
                {currentSet.theme && (
                  <span className={styles.theme}>
                    {currentSet.theme}
                    {currentSet.subtheme && ` › ${currentSet.subtheme}`}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleRefresh}
                  className={styles.refreshButton}
                  disabled={isBusy}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isRefreshing ? styles.spinning : ''}>
                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                  </svg>
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* Status */}
            <div className={styles.field}>
              <label className={styles.label}>Status</label>
              <div className={styles.statusRow}>
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.statusChip} ${status === opt.value ? styles.statusSelected : ''}`}
                    onClick={() => setStatus(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Owner */}
            {availableOwners.length > 1 && (
              <div className={styles.field}>
                <label className={styles.label}>Owner</label>
                <div className={styles.ownerRow}>
                  {availableOwners.map((ownerName) => (
                    <button
                      key={ownerName}
                      type="button"
                      className={`${styles.ownerChip} ${selectedOwners.includes(ownerName) ? styles.ownerSelected : ''}`}
                      onClick={() => toggleOwner(ownerName)}
                    >
                      {selectedOwners.includes(ownerName) && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                      {ownerName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Display Name */}
            <div className={styles.field}>
              <label htmlFor="name" className={styles.label}>Display Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.input}
                required
              />
            </div>

            {/* Occasion & Date */}
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="occasion" className={styles.label}>Occasion</label>
                <input
                  id="occasion"
                  type="text"
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  placeholder="Birthday, Christmas..."
                  className={styles.input}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="dateReceived" className={styles.label}>Date Received</label>
                <input
                  id="dateReceived"
                  type="date"
                  value={dateReceived}
                  onChange={(e) => setDateReceived(e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>

            {/* Has been assembled */}
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={hasBeenAssembled}
                onChange={(e) => setHasBeenAssembled(e.target.checked)}
                className={styles.checkbox}
              />
              Has been assembled before
            </label>

            {/* Notes */}
            <div className={styles.field}>
              <label htmlFor="notes" className={styles.label}>Notes</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={styles.textarea}
                rows={2}
                placeholder="Optional notes..."
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}
          </div>

          <div className={styles.footer}>
            {showDeleteConfirm ? (
              <div className={styles.deleteConfirm}>
                <span>Delete?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  className={styles.confirmDeleteButton}
                  disabled={isDeleting}
                >
                  {isDeleting ? '...' : 'Yes'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className={styles.cancelDeleteButton}
                >
                  No
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
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
