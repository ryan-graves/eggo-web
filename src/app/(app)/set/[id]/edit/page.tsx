'use client';

import { useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { useCollection } from '@/hooks/useCollection';
import { Header } from '@/components/Header';
import { updateSet, deleteSet, refreshSetMetadata } from '@/lib/firebase';
import type { LegoSet, SetStatus } from '@/types';
import styles from './page.module.css';

const STATUS_OPTIONS: { value: SetStatus; label: string }[] = [
  { value: 'unopened', label: 'Unopened' },
  { value: 'in_progress', label: 'Building' },
  { value: 'rebuild_in_progress', label: 'Rebuilding' },
  { value: 'assembled', label: 'Assembled' },
  { value: 'disassembled', label: 'Disassembled' },
];

function EditSetContent(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const { sets, activeCollection, isInitializing } = useCollection();

  const setId = params.id as string;
  const set = sets.find((s) => s.id === setId);
  const availableOwners = activeCollection?.owners ?? [];

  const [currentSet, setCurrentSet] = useState<LegoSet | null>(set ?? null);
  const [name, setName] = useState(set?.name ?? '');
  const [status, setStatus] = useState<SetStatus>(set?.status ?? 'unopened');
  const [selectedOwners, setSelectedOwners] = useState<string[]>(set?.owners ?? []);
  const [occasion, setOccasion] = useState(set?.occasion ?? '');
  const [dateReceived, setDateReceived] = useState(set?.dateReceived ?? '');
  const [notes, setNotes] = useState(set?.notes ?? '');
  const [hasBeenAssembled, setHasBeenAssembled] = useState(set?.hasBeenAssembled ?? false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const displaySet = currentSet ?? set;
  const imageUrl = displaySet ? (displaySet.customImageUrl || displaySet.imageUrl) : null;

  const toggleOwner = (ownerName: string) => {
    setSelectedOwners((prev) =>
      prev.includes(ownerName) ? prev.filter((o) => o !== ownerName) : [...prev, ownerName]
    );
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const result = await refreshSetMetadata(setId);
      if (result.set) {
        setCurrentSet(result.set);
        setName(result.set.name);
      }
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
      await updateSet(setId, {
        name: name.trim(),
        status,
        hasBeenAssembled:
          hasBeenAssembled || status === 'assembled' || status === 'disassembled',
        owners: selectedOwners,
        occasion: occasion.trim(),
        dateReceived: dateReceived || null,
        notes: notes.trim() || undefined,
      });

      router.back();
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
      await deleteSet(setId);
      // After delete, go back two levels (past set detail to collection)
      router.push('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete set');
      setIsDeleting(false);
    }
  };

  const isBusy = isSubmitting || isDeleting || isRefreshing;

  if (isInitializing) {
    return (
      <div className={styles.page}>
        <Header variant="detail" title="Edit Set" backHref={`/set/${setId}`} />
        <main className={styles.main}>
          <div className={styles.loading}>Loading...</div>
        </main>
      </div>
    );
  }

  if (!set) {
    return (
      <div className={styles.page}>
        <Header variant="detail" title="Edit Set" backHref="/home" />
        <main className={styles.main}>
          <div className={styles.loading}>Set not found</div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header variant="detail" title="Edit Set" backHref={`/set/${setId}`} />

      <main className={styles.main}>
        <form id="edit-set-form" onSubmit={handleSubmit} className={styles.container}>
          {/* API Data Card */}
          <div className={styles.apiCard}>
            {imageUrl && (
              <div className={styles.imageWrapper}>
                <Image
                  src={imageUrl}
                  alt={displaySet?.name ?? ''}
                  fill
                  style={{ objectFit: 'contain' }}
                  sizes="120px"
                />
              </div>
            )}
            <div className={styles.apiInfo}>
              <span className={styles.setNumber}>#{displaySet?.setNumber}</span>
              <h3 className={styles.apiName}>{displaySet?.name}</h3>
              <div className={styles.apiMeta}>
                {displaySet?.pieceCount && (
                  <span className={styles.apiStat}>
                    <strong>{displaySet.pieceCount.toLocaleString()}</strong> pieces
                  </span>
                )}
                {displaySet?.year && (
                  <span className={styles.apiStat}>
                    <strong>{displaySet.year}</strong>
                  </span>
                )}
              </div>
              {displaySet?.theme && (
                <span className={styles.apiTheme}>
                  {displaySet.theme}
                  {displaySet.subtheme && ` \u203A ${displaySet.subtheme}`}
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
        </form>
      </main>

      {/* Footer actions */}
      <footer className={styles.footer}>
        <div className={styles.footerLeft}>
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
              disabled={isBusy}
            >
              Delete
            </button>
          )}
        </div>
        <div className={styles.footerRight}>
          <button type="button" onClick={() => router.back()} className="btn-default btn-secondary" disabled={isBusy}>
            Cancel
          </button>
          <button type="submit" form="edit-set-form" className="btn-default btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </footer>
    </div>
  );
}

export default function EditSetPage(): React.JSX.Element {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
      <EditSetContent />
    </Suspense>
  );
}
