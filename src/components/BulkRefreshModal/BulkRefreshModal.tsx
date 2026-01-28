'use client';

import { useState, useCallback, useRef } from 'react';
import { refreshSetMetadata } from '@/lib/firebase';
import type { LegoSet } from '@/types';
import styles from './BulkRefreshModal.module.css';

interface BulkRefreshModalProps {
  sets: LegoSet[];
  onClose: () => void;
}

interface RefreshResult {
  setId: string;
  setNumber: string;
  name: string;
  success: boolean;
  error?: string;
  skipped?: boolean;
}

type FilterOption = 'all' | 'missing_image' | 'missing_theme' | 'missing_any';

const FILTER_OPTIONS: { value: FilterOption; label: string; description: string }[] = [
  {
    value: 'missing_any',
    label: 'Missing any data',
    description: 'Sets missing image, theme, or piece count',
  },
  {
    value: 'missing_image',
    label: 'Missing image only',
    description: 'Sets without an image',
  },
  {
    value: 'missing_theme',
    label: 'Missing theme only',
    description: 'Sets without theme information',
  },
  {
    value: 'all',
    label: 'All sets',
    description: 'Refresh every set in the collection',
  },
];

const DELAY_MS = 1200; // 1.2 seconds between requests to be safe with rate limits

function filterSets(sets: LegoSet[], filter: FilterOption): LegoSet[] {
  switch (filter) {
    case 'missing_image':
      return sets.filter((s) => !s.imageUrl && !s.customImageUrl);
    case 'missing_theme':
      return sets.filter((s) => !s.theme);
    case 'missing_any':
      return sets.filter(
        (s) => (!s.imageUrl && !s.customImageUrl) || !s.theme || !s.pieceCount
      );
    case 'all':
    default:
      return sets;
  }
}

export function BulkRefreshModal({ sets, onClose }: BulkRefreshModalProps): React.JSX.Element {
  const [filter, setFilter] = useState<FilterOption>('missing_any');
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSet, setCurrentSet] = useState<string | null>(null);
  const [results, setResults] = useState<RefreshResult[]>([]);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Use ref for pause state so async loop can see updates
  const isPausedRef = useRef(false);

  const filteredSets = filterSets(sets, filter);
  const totalToProcess = filteredSets.length;

  const successCount = results.filter((r) => r.success).length;
  const errorCount = results.filter((r) => !r.success && !r.skipped).length;
  const skippedCount = results.filter((r) => r.skipped).length;

  const handleStart = useCallback(async () => {
    const controller = new AbortController();
    setAbortController(controller);
    setIsRunning(true);
    isPausedRef.current = false;
    setIsPaused(false);
    setProgress(0);
    setResults([]);

    const setsToProcess = filterSets(sets, filter);

    for (let i = 0; i < setsToProcess.length; i++) {
      // Check if aborted
      if (controller.signal.aborted) {
        break;
      }

      // Wait while paused (use ref to get current value in async loop)
      while (isPausedRef.current && !controller.signal.aborted) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (controller.signal.aborted) {
        break;
      }

      const set = setsToProcess[i];
      setCurrentSet(`${set.setNumber} - ${set.name}`);
      setProgress(i + 1);

      try {
        await refreshSetMetadata(set.id);
        setResults((prev) => [
          ...prev,
          { setId: set.id, setNumber: set.setNumber, name: set.name, success: true },
        ]);
      } catch (error) {
        setResults((prev) => [
          ...prev,
          {
            setId: set.id,
            setNumber: set.setNumber,
            name: set.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        ]);
      }

      // Rate limit delay (skip on last item)
      if (i < setsToProcess.length - 1 && !controller.signal.aborted) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }

    setIsRunning(false);
    setCurrentSet(null);
    setAbortController(null);
  }, [sets, filter]);

  const handlePause = () => {
    isPausedRef.current = true;
    setIsPaused(true);
  };

  const handleResume = () => {
    isPausedRef.current = false;
    setIsPaused(false);
  };

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
    }
    setIsRunning(false);
    setIsPaused(false);
    setCurrentSet(null);
  };

  const progressPercent = totalToProcess > 0 ? (progress / totalToProcess) * 100 : 0;
  const isComplete = !isRunning && results.length > 0;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Refresh Set Data</h2>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M15 5L5 15M5 5L15 15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className={styles.content}>
          {!isRunning && !isComplete && (
            <>
              <p className={styles.description}>
                Fetch updated metadata from Brickset for your sets. This will update names, images,
                themes, and piece counts.
              </p>

              <div className={styles.filterSection}>
                <label className={styles.filterLabel}>Which sets to refresh?</label>
                <div className={styles.filterOptions}>
                  {FILTER_OPTIONS.map((option) => (
                    <label key={option.value} className={styles.filterOption}>
                      <input
                        type="radio"
                        name="filter"
                        value={option.value}
                        checked={filter === option.value}
                        onChange={() => setFilter(option.value)}
                        className={styles.radio}
                      />
                      <div className={styles.filterContent}>
                        <span className={styles.filterName}>{option.label}</span>
                        <span className={styles.filterDescription}>{option.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.summary}>
                <span className={styles.summaryCount}>{filteredSets.length}</span>
                <span className={styles.summaryLabel}>
                  {filteredSets.length === 1 ? 'set' : 'sets'} will be refreshed
                </span>
                {filteredSets.length > 0 && (
                  <span className={styles.summaryTime}>
                    (approximately {Math.ceil((filteredSets.length * DELAY_MS) / 60000)} min)
                  </span>
                )}
              </div>
            </>
          )}

          {(isRunning || isComplete) && (
            <>
              <div className={styles.progressSection}>
                <div className={styles.progressHeader}>
                  <span className={styles.progressLabel}>
                    {isComplete
                      ? 'Complete!'
                      : isPaused
                        ? 'Paused'
                        : `Refreshing... ${progress} of ${totalToProcess}`}
                  </span>
                  <span className={styles.progressPercent}>{Math.round(progressPercent)}%</span>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {currentSet && !isComplete && (
                  <p className={styles.currentSet}>{currentSet}</p>
                )}
              </div>

              <div className={styles.stats}>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{successCount}</span>
                  <span className={styles.statLabel}>Updated</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValueError}>{errorCount}</span>
                  <span className={styles.statLabel}>Errors</span>
                </div>
                {skippedCount > 0 && (
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{skippedCount}</span>
                    <span className={styles.statLabel}>Skipped</span>
                  </div>
                )}
              </div>

              {results.length > 0 && (
                <div className={styles.resultsSection}>
                  <details className={styles.resultsDetails}>
                    <summary className={styles.resultsSummary}>
                      View details ({results.length} processed)
                    </summary>
                    <ul className={styles.resultsList}>
                      {results.map((result) => (
                        <li
                          key={result.setId}
                          className={
                            result.success
                              ? styles.resultSuccess
                              : result.skipped
                                ? styles.resultSkipped
                                : styles.resultError
                          }
                        >
                          <span className={styles.resultIcon}>
                            {result.success ? '✓' : result.skipped ? '–' : '✗'}
                          </span>
                          <span className={styles.resultText}>
                            {result.setNumber} - {result.name}
                            {result.error && (
                              <span className={styles.resultErrorText}>{result.error}</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              )}
            </>
          )}
        </div>

        <div className={styles.actions}>
          {!isRunning && !isComplete && (
            <>
              <button type="button" className={styles.cancelButton} onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.startButton}
                onClick={handleStart}
                disabled={filteredSets.length === 0}
              >
                Start Refresh
              </button>
            </>
          )}

          {isRunning && (
            <>
              {isPaused ? (
                <button type="button" className={styles.resumeButton} onClick={handleResume}>
                  Resume
                </button>
              ) : (
                <button type="button" className={styles.pauseButton} onClick={handlePause}>
                  Pause
                </button>
              )}
              <button type="button" className={styles.stopButton} onClick={handleStop}>
                Stop
              </button>
            </>
          )}

          {isComplete && (
            <button type="button" className={styles.doneButton} onClick={onClose}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
