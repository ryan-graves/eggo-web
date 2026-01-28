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

const STATUS_OPTIONS: { value: SetStatus; label: string; icon: string }[] = [
  { value: 'unopened', label: 'Unopened', icon: '📦' },
  { value: 'in_progress', label: 'Building', icon: '🔧' },
  { value: 'rebuild_in_progress', label: 'Rebuilding', icon: '🔄' },
  { value: 'assembled', label: 'Assembled', icon: '✓' },
  { value: 'disassembled', label: 'Disassembled', icon: '📤' },
];

function formatDate(timestamp: Timestamp | null): string {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  return date.toISOString().split('T')[0];
}

function formatDisplayDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
            {/* Hero Section - Image & Set Info */}
            <div className={styles.hero}>
              <div className={styles.imageWrapper}>
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={currentSet.name}
                    fill
                    style={{ objectFit: 'contain' }}
                    sizes="160px"
                  />
                ) : (
                  <div className={styles.noImage}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="m21 15-5-5L5 21" />
                    </svg>
                  </div>
                )}
              </div>
              <div className={styles.heroInfo}>
                <span className={styles.setNumber}>{currentSet.setNumber}</span>
                <h3 className={styles.setName}>{currentSet.name}</h3>
                <div className={styles.metaRow}>
                  {currentSet.pieceCount && (
                    <span className={styles.metaItem}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                      </svg>
                      {currentSet.pieceCount.toLocaleString()}
                    </span>
                  )}
                  {currentSet.year && (
                    <span className={styles.metaItem}>{currentSet.year}</span>
                  )}
                </div>
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
                  {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                </button>
              </div>
            </div>

            {/* Status Section */}
            <div className={styles.section}>
              <label className={styles.sectionLabel}>Status</label>
              <div className={styles.statusGrid}>
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.statusOption} ${status === opt.value ? styles.statusSelected : ''}`}
                    onClick={() => setStatus(opt.value)}
                  >
                    <span className={styles.statusIcon}>{opt.icon}</span>
                    <span className={styles.statusLabel}>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Ownership Section */}
            <div className={styles.section}>
              <label className={styles.sectionLabel}>Owned by</label>
              <div className={styles.ownerChips}>
                {availableOwners.map((ownerName) => (
                  <button
                    key={ownerName}
                    type="button"
                    className={`${styles.ownerChip} ${selectedOwners.includes(ownerName) ? styles.ownerSelected : ''}`}
                    onClick={() => toggleOwner(ownerName)}
                  >
                    {selectedOwners.includes(ownerName) && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    {ownerName}
                  </button>
                ))}
              </div>
            </div>

            {/* Details Section */}
            <div className={styles.section}>
              <label className={styles.sectionLabel}>Details</label>
              <div className={styles.detailsCard}>
                <div className={styles.field}>
                  <label htmlFor="name" className={styles.fieldLabel}>
                    Display Name
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

                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label htmlFor="occasion" className={styles.fieldLabel}>
                      Occasion
                    </label>
                    <input
                      id="occasion"
                      type="text"
                      value={occasion}
                      onChange={(e) => setOccasion(e.target.value)}
                      placeholder="e.g., Birthday 2024"
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="dateReceived" className={styles.fieldLabel}>
                      Date Received
                    </label>
                    <div className={styles.dateInputWrapper}>
                      <input
                        id="dateReceived"
                        type="date"
                        value={dateReceived}
                        onChange={(e) => setDateReceived(e.target.value)}
                        className={styles.input}
                      />
                      {dateReceived && (
                        <span className={styles.dateDisplay}>{formatDisplayDate(dateReceived)}</span>
                      )}
                    </div>
                  </div>
                </div>

                <label className={styles.toggleLabel}>
                  <div className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={hasBeenAssembled}
                      onChange={(e) => setHasBeenAssembled(e.target.checked)}
                      className={styles.toggleInput}
                    />
                    <span className={styles.toggleTrack} />
                  </div>
                  <span>Has been assembled before</span>
                </label>

                <div className={styles.field}>
                  <label htmlFor="notes" className={styles.fieldLabel}>
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={styles.textarea}
                    rows={2}
                    placeholder="Any additional notes..."
                  />
                </div>
              </div>
            </div>

            {error && <p className={styles.error}>{error}</p>}
          </div>

          <div className={styles.footer}>
            {showDeleteConfirm ? (
              <div className={styles.deleteConfirm}>
                <span>Delete this set?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  className={styles.confirmDeleteButton}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete'}
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
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
