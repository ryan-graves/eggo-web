'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { createSet } from '@/lib/firebase';
import { getSetDataProvider } from '@/lib/providers';
import { removeImageBackground } from '@/lib/image';
import type { SetStatus, SetLookupResult } from '@/types';
import styles from './AddSetForm.module.css';

interface AddSetFormProps {
  collectionId: string;
  availableOwners: string[];
  onSuccess: () => void;
  onCancel: () => void;
}

type Step = 'lookup' | 'details';

type ImageProcessingStage = 'fetching' | 'removing' | 'done' | 'error';

const STATUS_OPTIONS: { value: SetStatus; label: string }[] = [
  { value: 'unopened', label: 'Unopened' },
  { value: 'in_progress', label: 'Building' },
  { value: 'rebuild_in_progress', label: 'Rebuilding' },
  { value: 'assembled', label: 'Assembled' },
  { value: 'disassembled', label: 'Disassembled' },
];

const STAGE_LABELS: Record<ImageProcessingStage, string> = {
  fetching: 'Fetching high-resolution image\u2026',
  removing: 'Removing background\u2026',
  done: 'Image ready',
  error: 'Background removal failed',
};

export function AddSetForm({
  collectionId,
  availableOwners,
  onSuccess,
  onCancel,
}: AddSetFormProps): React.JSX.Element {
  // Step state
  const [step, setStep] = useState<Step>('lookup');

  // Lookup state
  const [setNumber, setSetNumber] = useState('');
  const [lookupResult, setLookupResult] = useState<SetLookupResult | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Image processing state
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [imageProcessingStage, setImageProcessingStage] = useState<ImageProcessingStage | null>(null);
  const imageProcessingPromise = useRef<Promise<void> | null>(null);

  // Form fields
  const [status, setStatus] = useState<SetStatus>('unopened');
  const [selectedOwners, setSelectedOwners] = useState<string[]>(
    availableOwners.length > 0 ? [availableOwners[0]] : []
  );
  const [occasion, setOccasion] = useState('');
  const [dateReceived, setDateReceived] = useState('');
  const [notes, setNotes] = useState('');

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Modal animation state
  const [isClosing, setIsClosing] = useState(false);

  const toggleOwner = (ownerName: string) => {
    setSelectedOwners((prev) =>
      prev.includes(ownerName) ? prev.filter((o) => o !== ownerName) : [...prev, ownerName]
    );
  };

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

  const handleLookup = async () => {
    if (!setNumber.trim()) {
      setLookupError('Please enter a set number');
      return;
    }

    setIsLookingUp(true);
    setLookupError(null);
    setLookupResult(null);
    setProcessedImageUrl(null);
    setIsProcessingImage(false);
    setImageProcessingStage(null);

    try {
      const provider = getSetDataProvider();
      const result = await provider.lookupSet(setNumber.trim());

      if (result) {
        setLookupResult(result);
      } else {
        setLookupError('Set not found. Please check the number and try again.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to lookup set';
      setLookupError('Failed to lookup set. Please try again.');
      toast.error('Set lookup failed', { description: message });
    } finally {
      setIsLookingUp(false);
    }
  };

  const startImageProcessing = useCallback((imageUrl: string) => {
    setIsProcessingImage(true);
    setImageProcessingStage('fetching');

    const promise = (async () => {
      await new Promise((r) => setTimeout(r, 500));
      setImageProcessingStage('removing');

      try {
        const bgResult = await removeImageBackground(imageUrl);
        if (bgResult.processedImageUrl) {
          setProcessedImageUrl(bgResult.processedImageUrl);
          setImageProcessingStage('done');
        } else if (bgResult.skipped) {
          setImageProcessingStage('done');
        } else if (bgResult.error) {
          setImageProcessingStage('error');
        }
      } catch (err) {
        console.error('[AddSetForm] Background removal error:', err);
        setImageProcessingStage('error');
      } finally {
        setIsProcessingImage(false);
      }
    })();

    imageProcessingPromise.current = promise;
  }, []);

  const handleNext = () => {
    setStep('details');
    if (lookupResult?.imageUrl) {
      startImageProcessing(lookupResult.imageUrl);
    }
  };

  const handleBack = () => {
    setStep('lookup');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!lookupResult) return;

    setIsSubmitting(true);
    setSubmitError(null);

    if (imageProcessingPromise.current) {
      await imageProcessingPromise.current;
    }

    try {
      await createSet({
        collectionId,
        setNumber: setNumber.trim(),
        name: lookupResult.name,
        pieceCount: lookupResult.pieceCount || null,
        year: lookupResult.year || null,
        theme: lookupResult.theme || null,
        subtheme: lookupResult.subtheme || null,
        imageUrl: lookupResult.imageUrl || null,
        customImageUrl: processedImageUrl || undefined,
        status,
        hasBeenAssembled: status === 'assembled' || status === 'disassembled',
        owners: selectedOwners,
        occasion: occasion.trim(),
        dateReceived: dateReceived || null,
        notes: notes.trim() || undefined,
        dataSource: lookupResult.dataSource ?? 'manual',
        dataSourceId: lookupResult.sourceId,
      });

      onSuccess();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to add set');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercent =
    imageProcessingStage === 'fetching'
      ? 25
      : imageProcessingStage === 'removing'
        ? 60
        : imageProcessingStage === 'done' || imageProcessingStage === 'error'
          ? 100
          : 0;

  return (
    <div
      className={`${styles.overlay} ${isClosing ? styles.overlayClosing : ''}`}
      onClick={handleClose}
    >
      <div
        className={`${styles.modal} ${isClosing ? styles.modalClosing : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          {step === 'details' && (
            <button
              type="button"
              onClick={handleBack}
              className={styles.backButton}
              aria-label="Go back"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          <h2 className={styles.title}>Add Set</h2>
          <button type="button" onClick={handleClose} className={styles.closeButton} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step 1: Lookup + Preview (combined) */}
        {step === 'lookup' && (
          <div className={styles.stepContent} key="lookup">
            <div className={styles.lookupSection}>
              <label htmlFor="setNumber" className={styles.label}>
                Set Number
              </label>
              <div className={styles.lookupRow}>
                <input
                  id="setNumber"
                  type="text"
                  value={setNumber}
                  onChange={(e) => setSetNumber(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleLookup();
                    }
                  }}
                  placeholder="e.g., 75192"
                  className={styles.input}
                  disabled={isLookingUp}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleLookup}
                  className={styles.lookupButton}
                  disabled={isLookingUp || !setNumber.trim()}
                >
                  {isLookingUp ? 'Looking up\u2026' : 'Lookup'}
                </button>
              </div>
              {lookupError && <p className={styles.lookupError}>{lookupError}</p>}
            </div>

            {/* Skeleton loading state */}
            {isLookingUp && (
              <div className={styles.detailPreview}>
                <div className={`${styles.skeletonImage} ${styles.skeleton}`} />
                <div className={styles.skeletonInfo}>
                  <div className={`${styles.skeletonLine} ${styles.skeletonLineName} ${styles.skeleton}`} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonLineMeta} ${styles.skeleton}`} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonLineTheme} ${styles.skeleton}`} />
                </div>
              </div>
            )}

            {/* Preview result */}
            {lookupResult && !isLookingUp && (
              <div className={styles.detailPreview}>
                {lookupResult.imageUrl && (
                  <div className={styles.detailImageContainer}>
                    <Image
                      src={lookupResult.imageUrl}
                      alt={lookupResult.name}
                      fill
                      sizes="(max-width: 520px) 60vw, 240px"
                      style={{ objectFit: 'contain' }}
                    />
                  </div>
                )}
                <h3 className={styles.detailName}>{lookupResult.name}</h3>
                <div className={styles.detailStats}>
                  <span className={styles.detailStat}>#{lookupResult.setNumber}</span>
                  {lookupResult.pieceCount && (
                    <span className={styles.detailStat}>
                      <strong>{lookupResult.pieceCount.toLocaleString()}</strong> pieces
                    </span>
                  )}
                  {lookupResult.year && (
                    <span className={styles.detailStat}>
                      Released <strong>{lookupResult.year}</strong>
                    </span>
                  )}
                </div>
                {lookupResult.theme && (
                  <p className={styles.detailTheme}>
                    {lookupResult.theme}
                    {lookupResult.subtheme && ` \u203A ${lookupResult.subtheme}`}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Details form */}
        {step === 'details' && lookupResult && (
          <form id="add-set-form" onSubmit={handleSubmit} className={styles.stepContent} key="details">
            <div className={styles.scrollArea}>
              {/* Compact preview with image processing progress */}
              <div className={styles.compactPreview}>
                <div className={styles.compactImageWrapper}>
                  {lookupResult.imageUrl ? (
                    <Image
                      src={processedImageUrl || lookupResult.imageUrl}
                      alt={lookupResult.name}
                      fill
                      sizes="80px"
                      style={{ objectFit: 'contain' }}
                    />
                  ) : (
                    <div className={styles.compactPlaceholder}>No Image</div>
                  )}
                </div>
                <div className={styles.compactInfo}>
                  <span className={styles.compactSetNumber}>#{lookupResult.setNumber}</span>
                  <h3 className={styles.compactName}>{lookupResult.name}</h3>
                  <div className={styles.compactMeta}>
                    {lookupResult.pieceCount && (
                      <span>
                        <strong>{lookupResult.pieceCount.toLocaleString()}</strong> pcs
                      </span>
                    )}
                    {lookupResult.year && <span>{lookupResult.year}</span>}
                    {lookupResult.theme && (
                      <span>
                        {lookupResult.theme}
                        {lookupResult.subtheme && ` \u203A ${lookupResult.subtheme}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Image processing progress bar */}
              {imageProcessingStage && (
                <div className={styles.progressSection}>
                  <div className={styles.progressTrack}>
                    <div
                      className={`${styles.progressBar} ${imageProcessingStage === 'error' ? styles.progressError : ''} ${imageProcessingStage === 'done' ? styles.progressDone : ''}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span
                    className={`${styles.progressLabel} ${imageProcessingStage === 'error' ? styles.progressLabelError : ''} ${imageProcessingStage === 'done' ? styles.progressLabelDone : ''}`}
                  >
                    {imageProcessingStage === 'done' && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    {STAGE_LABELS[imageProcessingStage]}
                  </span>
                </div>
              )}

              {/* Form fields */}
              <div className={styles.fields}>
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

                <div className={styles.dateOccasionRow}>
                  <div className={styles.dateField}>
                    <label htmlFor="dateReceived" className={styles.label}>Date Received</label>
                    <input
                      id="dateReceived"
                      type="date"
                      value={dateReceived}
                      onChange={(e) => setDateReceived(e.target.value)}
                      className={styles.dateInput}
                    />
                  </div>
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
                </div>

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
              </div>

              {submitError && <p className={styles.error}>{submitError}</p>}
            </div>
          </form>
        )}

        {/* Footer actions */}
        <div className={styles.actions}>
          {step === 'lookup' && (
            <>
              <button type="button" onClick={handleClose} className={styles.cancelButton}>
                Cancel
              </button>
              {lookupResult && (
                <button
                  type="button"
                  onClick={handleNext}
                  className={styles.submitButton}
                >
                  Next
                </button>
              )}
            </>
          )}

          {step === 'details' && (
            <>
              <button type="button" onClick={handleClose} className={styles.cancelButton}>
                Cancel
              </button>
              <button
                type="submit"
                form="add-set-form"
                className={styles.submitButton}
                disabled={isSubmitting}
              >
                {isSubmitting && isProcessingImage
                  ? 'Processing image\u2026'
                  : isSubmitting
                    ? 'Adding\u2026'
                    : 'Add Set'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
