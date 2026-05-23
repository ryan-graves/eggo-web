'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { updateSet } from '@/lib/supabase';
import type { LegoSet, SetStatus } from '@/types';
import styles from './StatusControl.module.css';

interface StatusControlProps {
  setId: LegoSet['id'];
  currentStatus: SetStatus;
}

/**
 * Inline-expanding status control for the Set detail page. In its default
 * (read) state it renders as a small status badge; tapping the badge
 * transforms it into a horizontal chip row of the five statuses; tapping a
 * chip optimistically updates the set and collapses back to the new badge.
 *
 * The component is responsible for: focus management (focus moves to the
 * active chip on expand and returns to the badge on collapse), outside-click
 * and Esc-to-cancel, optimistic updates, and revert + toast on failure.
 */
export function StatusControl({ setId, currentStatus }: StatusControlProps): React.JSX.Element {
  const [optimisticStatus, setOptimisticStatus] = useState<SetStatus>(currentStatus);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const badgeRef = useRef<HTMLButtonElement>(null);
  const expandedRef = useRef<HTMLDivElement>(null);
  const activeChipRef = useRef<HTMLButtonElement>(null);

  // Keep optimistic state in sync when the parent's status prop changes
  // (e.g. realtime update from another client). Depending only on
  // `currentStatus` means a successful local save doesn't trigger a revert
  // when `isSaving` flips back to false — the eventual realtime echo of our
  // own write arrives as a (matching) `currentStatus` and is a no-op.
  useEffect(() => {
    setOptimisticStatus(currentStatus);
  }, [currentStatus]);

  // Move focus to the active chip when the row expands, and back to the
  // badge when it collapses. Skip on initial mount.
  const wasExpandedRef = useRef(false);
  useEffect(() => {
    if (isExpanded && !wasExpandedRef.current) {
      activeChipRef.current?.focus();
    } else if (!isExpanded && wasExpandedRef.current) {
      badgeRef.current?.focus();
    }
    wasExpandedRef.current = isExpanded;
  }, [isExpanded]);

  // Outside-click closes without change.
  useEffect(() => {
    if (!isExpanded) return undefined;
    const onPointerDown = (e: PointerEvent) => {
      if (expandedRef.current?.contains(e.target as Node)) return;
      setIsExpanded(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isExpanded]);

  const pick = async (next: SetStatus) => {
    if (next === optimisticStatus) {
      setIsExpanded(false);
      return;
    }

    const previous = optimisticStatus;
    setOptimisticStatus(next);
    setIsExpanded(false);
    setIsSaving(true);

    try {
      // Newly assembled / disassembled sets should also flip hasBeenAssembled
      // so other surfaces (badges, filters) reflect the build history. The
      // edit page applies the same rule.
      const hasBeenAssembled = next === 'assembled' || next === 'disassembled';
      await updateSet(setId, { status: next, hasBeenAssembled });
    } catch (err) {
      setOptimisticStatus(previous);
      const message = err instanceof Error ? err.message : 'Please try again';
      toast.error("Couldn't update status", { description: message });
    } finally {
      setIsSaving(false);
    }
  };

  const onKeyDownChipRow = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsExpanded(false);
      return;
    }
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const currentIdx = STATUS_ORDER.indexOf(optimisticStatus);
    const nextIdx = (currentIdx + dir + STATUS_ORDER.length) % STATUS_ORDER.length;
    setOptimisticStatus(STATUS_ORDER[nextIdx]);
  };

  return (
    <div className={styles.root}>
      {/* Badge (read mode). Visually hidden when expanded so the chip row
          can take its space without a layout jump. */}
      <button
        ref={badgeRef}
        type="button"
        className={`${styles.badge} status-badge status-${optimisticStatus} ${
          isExpanded ? styles.badgeHidden : ''
        }`}
        aria-label={`Change status, currently ${STATUS_LABELS[optimisticStatus]}`}
        aria-expanded={isExpanded}
        aria-haspopup="true"
        onClick={() => setIsExpanded(true)}
        disabled={isSaving}
      >
        {STATUS_LABELS[optimisticStatus]}
        <svg
          className={styles.badgeCaret}
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2 4l3 3 3-3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Chip row (expanded mode). The row is always rendered so its width
          contributes to layout sizing; visibility + interactivity flip on
          isExpanded. */}
      <div
        ref={expandedRef}
        className={`${styles.expanded} ${isExpanded ? styles.expandedOpen : ''}`}
        role="radiogroup"
        aria-label="Set status"
        aria-hidden={!isExpanded}
        onKeyDown={onKeyDownChipRow}
      >
        {STATUS_ORDER.map((value) => {
          const isActive = value === optimisticStatus;
          return (
            <button
              key={value}
              ref={isActive ? activeChipRef : undefined}
              type="button"
              role="radio"
              aria-checked={isActive}
              tabIndex={isExpanded ? (isActive ? 0 : -1) : -1}
              className={`${styles.chip} ${isActive ? styles.chipActive : ''}`}
              onClick={() => pick(value)}
            >
              {STATUS_LABELS[value]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const STATUS_ORDER: SetStatus[] = [
  'unopened',
  'in_progress',
  'rebuild_in_progress',
  'assembled',
  'disassembled',
];

const STATUS_LABELS: Record<SetStatus, string> = {
  unopened: 'Unopened',
  in_progress: 'In Progress',
  rebuild_in_progress: 'Rebuilding',
  assembled: 'Assembled',
  disassembled: 'Disassembled',
};
