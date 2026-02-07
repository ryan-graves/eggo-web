'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
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
  const [dateReceived, setDateReceived] = useState(set.dateReceived || '');
  const [notes, setNotes] = useState(set.notes || '');
  const [hasBeenAssembled, setHasBeenAssembled] = useState(set.hasBeenAssembled);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [currentSet, setCurrentSet] = useState(set);
  const [isClosing, setIsClosing] = useState(false);
  const imageUrl = currentSet.customImageUrl || currentSet.imageUrl;

  // Lock body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onCancel();
    }, 200);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const result = await refreshSetMetadata(set.id);
      if (result.set) {
        setCurrentSet(result.set);
        setName(result.set.name);
      }
      // Show warning toast if background removal failed (but data refresh succeeded)
      if (result.backgroundRemovalError) {
        toast.error('Background removal failed', {
          description: result.backgroundRemovalError,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh metadata';
      toast.error('Failed to refresh set data', {
        description: message,
      });
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
        dateReceived: dateReceived || null,
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
    <div
      className={`modal-overlay${isClosing ? ' modal-overlay-closing' : ''}`}
      onClick={handleClose}
    >
      <div
        className={`modal-sheet${isClosing ? ' modal-sheet-closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">Edit Set</h2>
          <button
            type="button"
            onClick={handleClose}
            className="modal-icon-button"
            disabled={isBusy}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className="modal-scroll-area">
            {/* API Data Card - Bold treatment */}
            <div className={styles.apiCard}>
              {imageUrl && (
                <div className={styles.imageWrapper}>
                  <Image
                    src={imageUrl}
                    alt={currentSet.name}
                    fill
                    style={{ objectFit: 'contain' }}
                    sizes="120px"
                  />
                </div>
              )}
              <div className={styles.apiInfo}>
                <span className={styles.setNumber}>#{currentSet.setNumber}</span>
                <h3 className={styles.apiName}>{currentSet.name}</h3>
                <div className={styles.apiMeta}>
                  {currentSet.pieceCount && (
                    <span className={styles.apiStat}>
                      <strong>{currentSet.pieceCount.toLocaleString()}</strong> pieces
                    </span>
                  )}
                  {currentSet.year && (
                    <span className={styles.apiStat}>
                      <strong>{currentSet.year}</strong>
                    </span>
                  )}
                </div>
                {currentSet.theme && (
                  <span className={styles.apiTheme}>
                    {currentSet.theme}
                    {currentSet.subtheme && ` › ${currentSet.subtheme}`}
                  </span>
                )}
              </div>
              {isRefreshing ? (
                <div className={styles.refreshSpinner}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleRefresh}
                  className={styles.refreshButton}
                  disabled={isBusy}
                  aria-label="Refresh data"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                  </svg>
                </button>
              )}
            </div>

            {/* Status */}
            <div className="form-field">
              <label className="form-label">Status</label>
              <div className="form-chip-row">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`form-chip${status === opt.value ? ' form-chip-selected' : ''}`}
                    onClick={() => setStatus(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Owner */}
            {availableOwners.length > 1 && (
              <div className="form-field">
                <label className="form-label">Owner</label>
                <div className="form-chip-row">
                  {availableOwners.map((ownerName) => (
                    <button
                      key={ownerName}
                      type="button"
                      className={`form-chip${selectedOwners.includes(ownerName) ? ' form-chip-selected' : ''}`}
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
            <div className="form-field">
              <label htmlFor="name" className="form-label">Display Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
                required
              />
            </div>

            {/* Date & Occasion */}
            <div className="form-date-occasion-row">
              <div className="form-date-field">
                <label htmlFor="dateReceived" className="form-label">Date Received</label>
                <input
                  id="dateReceived"
                  type="date"
                  value={dateReceived}
                  onChange={(e) => setDateReceived(e.target.value)}
                  className="form-date-input"
                />
              </div>
              <div className="form-field">
                <label htmlFor="occasion" className="form-label">Occasion (optional)</label>
                <input
                  id="occasion"
                  type="text"
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  placeholder="Birthday, Christmas..."
                  className="form-input"
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
            <div className="form-field">
              <label htmlFor="notes" className="form-label">Notes</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="form-textarea"
                rows={2}
                placeholder="Optional notes..."
              />
            </div>

            {error && <p className="form-error">{error}</p>}
          </div>

          <div className={`modal-footer ${styles.footer}`}>
            {showDeleteConfirm ? (
              <div className={styles.deleteConfirm}>
                <span>Delete this set?</span>
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
              <>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className={styles.deleteIconButton}
                  aria-label="Delete set"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
                <div className={styles.rightActions}>
                  <button type="button" onClick={handleClose} className="btn-default btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn-default btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
