'use client';

import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { useNavigation } from '@/hooks/useNavigation';
import { useAuth } from '@/hooks/useAuth';
import { useCollection } from '@/hooks/useCollection';
import { Header } from '@/components/Header';
import { StatusPicker } from '@/components/StatusPicker';
import { getSetsForCollection } from '@/lib/supabase';
import {
  fetchBricksetOwnedSets,
  buildImportCandidates,
  updateCandidate,
  applyDetailsToAll,
  todayIsoDate,
  runBricksetImport,
  BricksetImportError,
  type ImportCandidate,
  type ImportDetails,
  type ImportDetailKey,
  type ImportProgress,
  type ImportSummary,
} from '@/lib/import';
import styles from './page.module.css';

type Step = 'connect' | 'review' | 'importing' | 'done';

const SETTINGS_PATH = '/collection-settings';

/** What the connect step tells the user about a failed fetch, by error code. */
function describeFetchError(err: unknown): string {
  if (err instanceof BricksetImportError) {
    switch (err.code) {
      case 'invalid_credentials':
        return 'Brickset didn’t recognize that username and password. Check them and try again.';
      case 'rate_limited':
        return 'Brickset has hit its daily request limit for Eggo. Please try again tomorrow.';
      case 'not_configured':
        return 'Brickset import isn’t available on this deployment.';
      case 'unauthorized':
        return 'Your Eggo session has expired. Sign in again and retry.';
      case 'network':
        return 'Couldn’t reach Eggo. Check your connection and try again.';
      default:
        return 'Brickset couldn’t be reached right now. Please try again in a few minutes.';
    }
  }
  return 'Something went wrong loading your collection. Please try again.';
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}

function CheckIcon(): React.JSX.Element {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

interface OwnerChipsProps {
  owners: string[];
  selected: string[];
  onToggle: (owner: string) => void;
  /** Accessible name for the group. */
  label: string;
  size?: 'default' | 'sm';
  disabled?: boolean;
}

/** Multi-select owner chips, matching the add-set form's owner row. */
function OwnerChips({
  owners,
  selected,
  onToggle,
  label,
  size = 'default',
  disabled = false,
}: OwnerChipsProps): React.JSX.Element {
  return (
    <div
      className={`form-chip-row ${size === 'sm' ? styles.chipRowSm : ''}`}
      role="group"
      aria-label={label}
    >
      {owners.map((owner) => {
        const isSelected = selected.includes(owner);
        return (
          <button
            key={owner}
            type="button"
            aria-pressed={isSelected}
            disabled={disabled}
            className={`form-chip ${isSelected ? `form-chip-selected ${styles.chipSelected}` : ''} ${size === 'sm' ? styles.chipSm : ''}`}
            onClick={() => onToggle(owner)}
          >
            {isSelected && <CheckIcon />}
            {owner}
          </button>
        );
      })}
    </div>
  );
}

function ImportBricksetContent(): React.JSX.Element {
  const { navigateTo, navigateBack } = useNavigation();
  const { user } = useAuth();
  const { activeCollection, isInitializing } = useCollection();

  const collectionId = activeCollection?.id ?? '';
  const collectionName = activeCollection?.name ?? '';
  const availableOwners = useMemo(() => activeCollection?.owners ?? [], [activeCollection?.owners]);
  // One owner means no choice to make, same as the add-set form.
  const showOwnerControls = availableOwners.length > 1;

  const [step, setStep] = useState<Step>('connect');

  // Connect
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const usernameRef = useRef<HTMLInputElement>(null);

  // Review
  const [bricksetUsername, setBricksetUsername] = useState('');
  const [candidates, setCandidates] = useState<ImportCandidate[]>([]);
  // The "same for every set" checklist: its values, and which properties are
  // locked to them. A locked property is applied to every row and disabled
  // per row; an unlocked one is chosen set by set.
  const [bulk, setBulk] = useState<ImportDetails>({
    status: 'assembled',
    owners: [],
    dateReceived: todayIsoDate(),
  });
  const [sameForAll, setSameForAll] = useState<Record<ImportDetailKey, boolean>>({
    status: true,
    owners: true,
    dateReceived: true,
  });
  const reviewHeadingRef = useRef<HTMLHeadingElement>(null);

  // Importing / done
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const importingHeadingRef = useRef<HTMLHeadingElement>(null);
  const doneHeadingRef = useRef<HTMLHeadingElement>(null);

  // Land focus on the step's first meaningful element for keyboard and
  // screen-reader users. The connect input only exists once the collection
  // has loaded, so the effect keys on that too.
  useEffect(() => {
    if (isInitializing || !collectionId) return;
    if (step === 'connect') usernameRef.current?.focus();
    else if (step === 'review') reviewHeadingRef.current?.focus();
    else if (step === 'importing') importingHeadingRef.current?.focus();
    else if (step === 'done') doneHeadingRef.current?.focus();
  }, [step, isInitializing, collectionId]);

  // A reload or tab close mid-import would strand half the sets without
  // images, so ask first. In-app navigation is handled by handleHeaderBack.
  useEffect(() => {
    if (step !== 'importing') return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [step]);

  const selectedCandidates = useMemo(() => candidates.filter((c) => c.selected), [candidates]);
  const selectedSetCount = selectedCandidates.length;
  const selectedCopyCount = selectedCandidates.reduce((sum, c) => sum + c.set.quantity, 0);
  const duplicateCount = useMemo(
    () => candidates.filter((c) => c.existingCount > 0).length,
    [candidates]
  );

  const handleFetch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      setFetchError('Enter your Brickset username and password.');
      return;
    }

    setIsFetching(true);
    setFetchError(null);
    try {
      const [response, existingSets] = await Promise.all([
        fetchBricksetOwnedSets(username.trim(), password),
        getSetsForCollection(collectionId, user?.id),
      ]);
      const defaults: ImportDetails = {
        status: 'assembled',
        owners: availableOwners.length > 0 ? [availableOwners[0]] : [],
        dateReceived: todayIsoDate(),
      };
      setBricksetUsername(response.username);
      setBulk(defaults);
      setCandidates(buildImportCandidates(response.sets, existingSets, defaults));
      // The password has done its one job. Drop it from memory and the DOM.
      setPassword('');
      setStep('review');
    } catch (err) {
      setFetchError(describeFetchError(err));
    } finally {
      setIsFetching(false);
    }
  };

  const setAllSelected = useCallback((predicate: (candidate: ImportCandidate) => boolean) => {
    setCandidates((prev) => prev.map((c) => ({ ...c, selected: predicate(c) })));
  }, []);

  const patchCandidate = useCallback(
    (sourceId: string, patch: Partial<ImportDetails> & { selected?: boolean }) => {
      setCandidates((prev) => updateCandidate(prev, sourceId, patch));
    },
    []
  );

  const patchBulk = useCallback(
    (patch: Partial<ImportDetails>) => {
      setBulk((prev) => ({ ...prev, ...patch }));
      const locked = Object.fromEntries(
        Object.entries(patch).filter(([key]) => sameForAll[key as ImportDetailKey])
      ) as Partial<ImportDetails>;
      if (Object.keys(locked).length > 0) {
        setCandidates((prev) => applyDetailsToAll(prev, locked));
      }
    },
    [sameForAll]
  );

  const toggleSameForAll = useCallback(
    (key: ImportDetailKey) => {
      const next = !sameForAll[key];
      setSameForAll((prev) => ({ ...prev, [key]: next }));
      // Locking snaps every row to the shared value; unlocking leaves rows
      // where they are, ready to be changed individually.
      if (next) setCandidates((prev) => applyDetailsToAll(prev, { [key]: bulk[key] }));
    },
    [sameForAll, bulk]
  );

  const toggleBulkOwner = (owner: string) => {
    const owners = bulk.owners.includes(owner)
      ? bulk.owners.filter((o) => o !== owner)
      : [...bulk.owners, owner];
    patchBulk({ owners });
  };

  const toggleOwnerForRow = (candidate: ImportCandidate, owner: string) => {
    const owners = candidate.owners.includes(owner)
      ? candidate.owners.filter((o) => o !== owner)
      : [...candidate.owners, owner];
    patchCandidate(candidate.set.sourceId, { owners });
  };

  const handleImport = async () => {
    if (selectedSetCount === 0) return;
    setStep('importing');
    setProgress(null);
    try {
      const result = await runBricksetImport(candidates, { collectionId }, setProgress);
      setSummary(result);
      setStep('done');
    } catch (err) {
      // runBricksetImport absorbs per-set failures, so only something
      // unexpected lands here. Don't strand the user on the progress screen.
      toast.error('Import stopped unexpectedly', {
        description: err instanceof Error ? err.message : undefined,
      });
      setStep('review');
    }
  };

  const handleHeaderBack = () => {
    if (step === 'review') {
      setStep('connect');
      return;
    }
    if (step === 'importing') {
      toast('Import still running', {
        description: 'Stay on this page until it finishes so every set gets its image.',
      });
      return;
    }
    navigateBack(SETTINGS_PATH);
  };

  if (isInitializing) {
    return (
      <div className={styles.page}>
        <Header variant="detail" title="Import from Brickset" backHref={SETTINGS_PATH} />
        <main className={styles.main}>
          <div className={styles.loading}>Loading…</div>
        </main>
      </div>
    );
  }

  if (!activeCollection) {
    return (
      <div className={styles.page}>
        <Header variant="detail" title="Import from Brickset" backHref={SETTINGS_PATH} />
        <main className={styles.main}>
          <div className={styles.loading}>No collection selected</div>
        </main>
      </div>
    );
  }

  const progressPercent =
    progress && progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <div className={styles.page}>
      <Header
        variant="detail"
        title="Import from Brickset"
        backHref={SETTINGS_PATH}
        onBack={handleHeaderBack}
      />

      <main className={styles.main}>
        <div className={styles.container}>
          {step === 'connect' && (
            <div className={styles.stepContent} key="connect">
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>
                  Bring your Brickset collection into {collectionName}
                </h2>
                <p className={styles.cardText}>
                  Every set you’ve marked as <strong>Owned</strong> on Brickset comes across with
                  its name, piece count, year, theme, picture, your Brickset notes, and how many
                  copies you own. You’ll get to review the list before anything is added.
                </p>
                <p className={styles.cardTextMuted}>
                  Wanted lists, minifigures, and ratings stay on Brickset. Eggo only reads your
                  collection and never changes it.
                </p>
              </section>

              <form id="brickset-connect-form" className={styles.card} onSubmit={handleFetch}>
                <div className={styles.fields}>
                  <div className="form-field">
                    <label htmlFor="brickset-username" className="form-label">
                      Brickset username
                    </label>
                    <input
                      ref={usernameRef}
                      id="brickset-username"
                      name="username"
                      type="text"
                      className="form-input"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isFetching}
                      aria-invalid={fetchError ? true : undefined}
                      aria-describedby={fetchError ? 'brickset-connect-error' : undefined}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="brickset-password" className="form-label">
                      Brickset password
                    </label>
                    <input
                      id="brickset-password"
                      name="password"
                      type="password"
                      className="form-input"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isFetching}
                      aria-invalid={fetchError ? true : undefined}
                      aria-describedby={fetchError ? 'brickset-connect-error' : undefined}
                    />
                  </div>
                </div>
                <p className={styles.privacyNote}>
                  Your details are sent to Brickset once to read your collection and are never
                  stored.
                </p>
                {fetchError && (
                  <p id="brickset-connect-error" role="alert" className="form-error">
                    {fetchError}
                  </p>
                )}
              </form>
            </div>
          )}

          {step === 'review' && (
            <div className={styles.stepContent} key="review">
              <div className={styles.reviewIntro}>
                <h2 ref={reviewHeadingRef} tabIndex={-1} className={styles.reviewTitle}>
                  {candidates.length === 0
                    ? 'No owned sets found'
                    : `${pluralize(candidates.length, 'owned set')} on Brickset`}
                </h2>
                <p className={styles.reviewSubtitle}>
                  Signed in as <strong>{bricksetUsername}</strong>
                  {duplicateCount > 0 && (
                    <>
                      {' · '}
                      {pluralize(duplicateCount, 'set is', 'sets are')} already in {collectionName}
                    </>
                  )}
                </p>
              </div>

              {candidates.length === 0 ? (
                <div className={styles.emptyState}>
                  <p className={styles.cardText}>
                    Brickset has no sets marked as Owned for this account yet. Add some on Brickset,
                    then come back and try again.
                  </p>
                </div>
              ) : (
                <>
                  <section className={styles.card} aria-labelledby="import-bulk-title">
                    <div>
                      <h3 id="import-bulk-title" className={styles.cardTitle}>
                        Same for every set
                      </h3>
                      <p className={styles.hint}>
                        Checked properties apply to every set below. Uncheck one to choose it set by
                        set.
                      </p>
                    </div>
                    <div className={styles.bulkTable}>
                      <input
                        id="bulk-status"
                        type="checkbox"
                        className={styles.checkbox}
                        checked={sameForAll.status}
                        onChange={() => toggleSameForAll('status')}
                      />
                      <label htmlFor="bulk-status" className={styles.bulkLabel}>
                        Status
                      </label>
                      <div className={styles.bulkControl}>
                        <StatusPicker
                          size="sm"
                          subject="every set"
                          value={bulk.status}
                          disabled={!sameForAll.status}
                          onChange={(status) => patchBulk({ status })}
                        />
                      </div>

                      {showOwnerControls && (
                        <>
                          <input
                            id="bulk-owners"
                            type="checkbox"
                            className={styles.checkbox}
                            checked={sameForAll.owners}
                            onChange={() => toggleSameForAll('owners')}
                          />
                          <label htmlFor="bulk-owners" className={styles.bulkLabel}>
                            Owner
                          </label>
                          <div className={styles.bulkControl}>
                            <OwnerChips
                              size="sm"
                              owners={availableOwners}
                              selected={bulk.owners}
                              onToggle={toggleBulkOwner}
                              disabled={!sameForAll.owners}
                              label="Owner for every set"
                            />
                          </div>
                        </>
                      )}

                      <input
                        id="bulk-date"
                        type="checkbox"
                        className={styles.checkbox}
                        checked={sameForAll.dateReceived}
                        onChange={() => toggleSameForAll('dateReceived')}
                      />
                      <label htmlFor="bulk-date" className={styles.bulkLabel}>
                        Date received
                      </label>
                      <div className={styles.bulkControl}>
                        <input
                          type="date"
                          aria-label="Date received for every set"
                          className={`form-date-input ${styles.compactDate}`}
                          value={bulk.dateReceived ?? ''}
                          disabled={!sameForAll.dateReceived}
                          onChange={(e) => patchBulk({ dateReceived: e.target.value || null })}
                        />
                      </div>
                    </div>
                  </section>

                  <section className={styles.listSection} aria-labelledby="import-list-title">
                    <div className={styles.listToolbar}>
                      <h3 id="import-list-title" className={styles.listTitle}>
                        {selectedSetCount === 0
                          ? 'Nothing selected'
                          : selectedCopyCount === selectedSetCount
                            ? `${pluralize(selectedSetCount, 'set')} selected`
                            : `${pluralize(selectedSetCount, 'set')} selected (${pluralize(selectedCopyCount, 'copy', 'copies')})`}
                      </h3>
                      <div className={styles.listActions}>
                        {duplicateCount > 0 && (
                          <button
                            type="button"
                            className="btn-small btn-ghost"
                            onClick={() => setAllSelected((c) => c.existingCount === 0)}
                          >
                            New only
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-small btn-ghost"
                          onClick={() => setAllSelected(() => true)}
                        >
                          All
                        </button>
                        <button
                          type="button"
                          className="btn-small btn-ghost"
                          onClick={() => setAllSelected(() => false)}
                        >
                          None
                        </button>
                      </div>
                    </div>

                    <ul className={styles.list}>
                      {candidates.map((candidate) => {
                        const { set, existingCount, selected } = candidate;
                        const inputId = `import-set-${set.sourceId}`;
                        const dateId = `import-date-${set.sourceId}`;
                        const meta = [
                          set.year ? String(set.year) : null,
                          set.pieceCount ? `${set.pieceCount.toLocaleString()} pcs` : null,
                          set.theme,
                        ]
                          .filter(Boolean)
                          .join(' · ');
                        return (
                          <li
                            key={set.sourceId}
                            className={`${styles.row} ${selected ? styles.rowSelected : ''}`}
                          >
                            <div className={styles.rowMain}>
                              <input
                                id={inputId}
                                type="checkbox"
                                className={styles.checkbox}
                                checked={selected}
                                onChange={() =>
                                  patchCandidate(set.sourceId, { selected: !selected })
                                }
                              />
                              <label htmlFor={inputId} className={styles.rowSummary}>
                                <span className={styles.rowImage}>
                                  {set.imageUrl ? (
                                    <Image
                                      src={set.imageUrl}
                                      alt=""
                                      fill
                                      sizes="64px"
                                      style={{ objectFit: 'contain' }}
                                    />
                                  ) : (
                                    <span
                                      className={styles.rowImagePlaceholder}
                                      aria-hidden="true"
                                    />
                                  )}
                                </span>
                                <span className={styles.rowText}>
                                  <span className={styles.rowName}>{set.name}</span>
                                  <span className={styles.rowMeta}>
                                    <span className={styles.rowNumber}>#{set.setNumber}</span>
                                    {meta && <span>{meta}</span>}
                                  </span>
                                </span>
                                <span className={styles.rowBadges}>
                                  {set.quantity > 1 && (
                                    <span
                                      className={styles.quantityBadge}
                                      aria-label={`${set.quantity} copies`}
                                    >
                                      ×{set.quantity}
                                    </span>
                                  )}
                                  {existingCount > 0 && (
                                    <span className={styles.duplicateBadge}>
                                      {existingCount === 1
                                        ? 'In collection'
                                        : `${existingCount} in collection`}
                                    </span>
                                  )}
                                </span>
                              </label>
                            </div>

                            {selected && (
                              <div className={styles.rowDetails}>
                                <StatusPicker
                                  size="sm"
                                  subject={set.name}
                                  value={candidate.status}
                                  disabled={sameForAll.status}
                                  onChange={(status) => patchCandidate(set.sourceId, { status })}
                                />
                                {showOwnerControls && (
                                  <OwnerChips
                                    size="sm"
                                    owners={availableOwners}
                                    selected={candidate.owners}
                                    onToggle={(owner) => toggleOwnerForRow(candidate, owner)}
                                    disabled={sameForAll.owners}
                                    label={`Owner for ${set.name}`}
                                  />
                                )}
                                <input
                                  id={dateId}
                                  type="date"
                                  aria-label={`Date received for ${set.name}`}
                                  className={`form-date-input ${styles.compactDate} ${styles.rowDate}`}
                                  value={candidate.dateReceived ?? ''}
                                  disabled={sameForAll.dateReceived}
                                  onChange={(e) =>
                                    patchCandidate(set.sourceId, {
                                      dateReceived: e.target.value || null,
                                    })
                                  }
                                />
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                </>
              )}
            </div>
          )}

          {step === 'importing' && (
            <div className={styles.stepContent} key="importing">
              {/* Announces phase changes only. Announcing every progress tick
                  would queue hundreds of readouts on a big collection. */}
              <p className={styles.srOnly} role="status">
                {progress?.phase === 'images' ? 'Preparing images' : 'Adding sets'}
              </p>
              <section className={styles.card}>
                <h2 ref={importingHeadingRef} tabIndex={-1} className={styles.cardTitle}>
                  {progress?.phase === 'images'
                    ? 'Preparing images'
                    : `Adding sets to ${collectionName}`}
                </h2>
                <p className={styles.cardText}>
                  {progress?.phase === 'images'
                    ? 'Removing backgrounds so your sets look at home in Eggo.'
                    : 'Your sets will show up in the collection as they’re added.'}
                </p>
                <div className={styles.progressSection}>
                  <div
                    className={styles.progressTrack}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progressPercent}
                    aria-valuetext={
                      progress ? `${progress.completed} of ${progress.total}` : 'Starting'
                    }
                    aria-label={progress?.phase === 'images' ? 'Preparing images' : 'Adding sets'}
                  >
                    <div
                      className={styles.progressBar}
                      style={{ transform: `scaleX(${progressPercent / 100})` }}
                    />
                  </div>
                  <div className={styles.progressCaption}>
                    <span>
                      {progress
                        ? `${progress.completed.toLocaleString()} of ${progress.total.toLocaleString()}`
                        : 'Starting…'}
                    </span>
                    {progress?.currentName && (
                      <span className={styles.progressCurrent}>{progress.currentName}</span>
                    )}
                  </div>
                </div>
                <p className={styles.cardTextMuted}>
                  Keep this page open until the import finishes.
                </p>
              </section>
            </div>
          )}

          {step === 'done' && summary && (
            <div className={styles.stepContent} key="done">
              <section className={styles.card}>
                <div className={styles.doneHeader}>
                  <span className={styles.doneIcon} aria-hidden="true">
                    <CheckIcon />
                  </span>
                  <h2 ref={doneHeadingRef} tabIndex={-1} className={styles.cardTitle}>
                    {summary.setsCreated === 0
                      ? 'Nothing was imported'
                      : `Added ${pluralize(summary.setsCreated, 'set')} to ${collectionName}`}
                  </h2>
                </div>
                <ul className={styles.summaryList}>
                  {summary.imagesProcessed > 0 && (
                    <li>{pluralize(summary.imagesProcessed, 'image')} prepared</li>
                  )}
                  {summary.imageFailures > 0 && (
                    <li>
                      {pluralize(summary.imageFailures, 'set kept', 'sets kept')} Brickset’s
                      original picture. Use Refresh on a set’s page to try again.
                    </li>
                  )}
                  {summary.failures.length > 0 && (
                    <li>
                      {pluralize(summary.failures.length, 'set', 'sets')} couldn’t be added:{' '}
                      {summary.failures
                        .map((f) =>
                          f.copies > 1 ? `${f.set.name} (${f.copies} copies)` : f.set.name
                        )
                        .join(', ')}
                    </li>
                  )}
                </ul>
              </section>
            </div>
          )}
        </div>
      </main>

      <footer className={styles.footer}>
        {step === 'connect' && (
          <>
            <button
              type="button"
              className="btn-default btn-secondary"
              onClick={() => navigateBack(SETTINGS_PATH)}
              disabled={isFetching}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="brickset-connect-form"
              className="btn-default btn-primary"
              disabled={isFetching || !username.trim() || !password}
            >
              {isFetching ? 'Loading your sets…' : 'Load my sets'}
            </button>
          </>
        )}

        {step === 'review' && (
          <>
            <button type="button" className="btn-default btn-secondary" onClick={handleHeaderBack}>
              Back
            </button>
            {candidates.length > 0 && (
              <button
                type="button"
                className="btn-default btn-primary"
                onClick={handleImport}
                disabled={selectedSetCount === 0}
              >
                {selectedSetCount === 0 ? 'Import' : `Import ${pluralize(selectedSetCount, 'set')}`}
              </button>
            )}
          </>
        )}

        {step === 'done' && (
          <>
            <button
              type="button"
              className="btn-default btn-secondary"
              onClick={() => navigateBack(SETTINGS_PATH)}
            >
              Back to settings
            </button>
            <button
              type="button"
              className="btn-default btn-primary"
              onClick={() => navigateTo('/all')}
            >
              View collection
            </button>
          </>
        )}
      </footer>
    </div>
  );
}

export default function ImportBricksetPage(): React.JSX.Element {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh' }} />}>
      <ImportBricksetContent />
    </Suspense>
  );
}
