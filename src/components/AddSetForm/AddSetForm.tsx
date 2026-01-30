'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { createSet } from '@/lib/firebase';
import { getSetDataProvider } from '@/lib/providers';
import type { SetStatus, SetLookupResult } from '@/types';
import styles from './AddSetForm.module.css';

interface AddSetFormProps {
  collectionId: string;
  availableOwners: string[];
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

export function AddSetForm({
  collectionId,
  availableOwners,
  onSuccess,
  onCancel,
}: AddSetFormProps): React.JSX.Element {
  const [setNumber, setSetNumber] = useState('');
  const [lookupResult, setLookupResult] = useState<SetLookupResult | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [status, setStatus] = useState<SetStatus>('unopened');
  const [selectedOwners, setSelectedOwners] = useState<string[]>(
    availableOwners.length > 0 ? [availableOwners[0]] : []
  );
  const [occasion, setOccasion] = useState('');

  const toggleOwner = (ownerName: string) => {
    setSelectedOwners((prev) =>
      prev.includes(ownerName) ? prev.filter((o) => o !== ownerName) : [...prev, ownerName]
    );
  };
  const [dateReceived, setDateReceived] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleLookup = async () => {
    if (!setNumber.trim()) {
      setLookupError('Please enter a set number');
      return;
    }

    setIsLookingUp(true);
    setLookupError(null);
    setLookupResult(null);

    try {
      const provider = getSetDataProvider();
      const result = await provider.lookupSet(setNumber.trim());

      if (result) {
        setLookupResult(result);
        setName(result.name);
      } else {
        setLookupError('Set not found. You can still enter the details manually.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to lookup set';
      setLookupError('Failed to lookup set. You can still enter the details manually.');
      toast.error('Set lookup failed', {
        description: message,
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!setNumber.trim()) {
      setSubmitError('Set number is required');
      return;
    }

    if (!name.trim()) {
      setSubmitError('Set name is required');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await createSet({
        collectionId,
        setNumber: setNumber.trim(),
        name: name.trim(),
        pieceCount: lookupResult?.pieceCount || null,
        year: lookupResult?.year || null,
        theme: lookupResult?.theme || null,
        subtheme: lookupResult?.subtheme || null,
        imageUrl: lookupResult?.imageUrl || null,
        status,
        hasBeenAssembled: status === 'assembled' || status === 'disassembled',
        owners: selectedOwners,
        occasion: occasion.trim(),
        dateReceived: dateReceived ? Timestamp.fromDate(new Date(dateReceived)) : null,
        notes: notes.trim() || undefined,
        dataSource: lookupResult?.dataSource ?? 'manual',
        dataSourceId: lookupResult?.sourceId,
      });

      onSuccess();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to add set');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Add Set</h2>
          <button type="button" onClick={onCancel} className={styles.closeButton}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.lookupSection}>
            <div className={styles.lookupRow}>
              <input
                type="text"
                value={setNumber}
                onChange={(e) => setSetNumber(e.target.value)}
                placeholder="Enter set number (e.g., 75192)"
                className={styles.input}
                disabled={isLookingUp}
              />
              <button
                type="button"
                onClick={handleLookup}
                className={styles.lookupButton}
                disabled={isLookingUp || !setNumber.trim()}
              >
                {isLookingUp ? 'Looking up...' : 'Lookup'}
              </button>
            </div>
            {lookupError && <p className={styles.lookupError}>{lookupError}</p>}
          </div>

          {lookupResult && (
            <div className={styles.preview}>
              {lookupResult.imageUrl && (
                <div className={styles.previewImage}>
                  <Image
                    src={lookupResult.imageUrl}
                    alt={lookupResult.name}
                    width={120}
                    height={90}
                    style={{ objectFit: 'contain' }}
                  />
                </div>
              )}
              <div className={styles.previewInfo}>
                <p className={styles.previewName}>{lookupResult.name}</p>
                <p className={styles.previewMeta}>
                  {lookupResult.year} • {lookupResult.pieceCount?.toLocaleString()} pieces
                </p>
                {lookupResult.theme && (
                  <p className={styles.previewTheme}>
                    {lookupResult.theme}
                    {lookupResult.subtheme && ` › ${lookupResult.subtheme}`}
                  </p>
                )}
              </div>
            </div>
          )}

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
                <span className={styles.label}>Owners</span>
                <div className={styles.ownerCheckboxes}>
                  {availableOwners.map((ownerName) => (
                    <label key={ownerName} className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={selectedOwners.includes(ownerName)}
                        onChange={() => toggleOwner(ownerName)}
                        className={styles.checkbox}
                      />
                      {ownerName}
                    </label>
                  ))}
                </div>
              </div>
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

          {submitError && <p className={styles.error}>{submitError}</p>}

          <div className={styles.actions}>
            <button type="button" onClick={onCancel} className={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Set'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
