'use client';

import { useState } from 'react';
import { useCollection } from '@/hooks/useCollection';
import styles from './CreateCollection.module.css';

interface CreateCollectionProps {
  /** Heading above the form. Defaults to the first-run onboarding copy. */
  title?: string;
  /** Supporting line under the heading. Defaults to the onboarding copy. */
  description?: string;
  /**
   * Called after the collection exists and has become the active one. The
   * onboarding screen omits it because the browse layout unmounts this form
   * as soon as the user has a collection.
   */
  onCreated?: (collectionId: string) => void;
  /**
   * Drops the onboarding screen's vertical centering so the card sits at
   * the top of a page that already has a header.
   */
  compact?: boolean;
}

export function CreateCollection({
  title = 'Create Your Collection',
  description = 'Set up your Lego collection to start tracking your sets.',
  onCreated,
  compact = false,
}: CreateCollectionProps): React.JSX.Element {
  const { createNewCollection } = useCollection();
  const [name, setName] = useState('');
  const [ownersInput, setOwnersInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      const collectionId = await createNewCollection(name.trim(), owners);
      onCreated?.(collectionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create collection');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={compact ? `${styles.container} ${styles.containerCompact}` : styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.description}>{description}</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="name" className={styles.label}>
              Collection Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., The Graves Collection"
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

          <button type="submit" className={styles.button} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Collection'}
          </button>
        </form>
      </div>
    </div>
  );
}
