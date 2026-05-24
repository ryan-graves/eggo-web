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
 * Status badge with an anchored dropdown menu. Tap the badge to open a
 * floating panel of the five status options; pick a row to update. The
 * panel is `position: absolute` so it doesn't push surrounding content;
 * surrounding layout stays still through the interaction.
 *
 * Optimistic update: the badge label flips immediately, `updateSet` fires
 * in the background, failure reverts the badge and emits a toast.
 */
export function StatusControl({ setId, currentStatus }: StatusControlProps): React.JSX.Element {
  const [optimisticStatus, setOptimisticStatus] = useState<SetStatus>(currentStatus);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync optimistic state when the parent's status prop changes (e.g. a
  // realtime echo). A successful local save arrives as a matching value
  // and is a no-op.
  useEffect(() => {
    setOptimisticStatus(currentStatus);
  }, [currentStatus]);

  // Focus the active row on open; return focus to the badge on close.
  // wasOpenRef means we skip the initial mount so we don't grab focus.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const active = panelRef.current?.querySelector<HTMLButtonElement>(
        '[data-active="true"]'
      );
      active?.focus();
    } else if (!isOpen && wasOpenRef.current) {
      badgeRef.current?.focus();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  // Close on outside pointerdown / escape.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const pick = async (next: SetStatus) => {
    setIsOpen(false);
    if (next === optimisticStatus) return;

    const previous = optimisticStatus;
    setOptimisticStatus(next);
    setIsSaving(true);

    try {
      // Only WRITE hasBeenAssembled when transitioning into a status that
      // implies the set has been built — never clear it from this control.
      // Otherwise moving an already-built set from `assembled` to
      // `rebuild_in_progress` would erase the build history. The edit page
      // does the same kind of preservation (`hasBeenAssembled || status === …`).
      const becomingBuilt = next === 'assembled' || next === 'disassembled';
      const update: Parameters<typeof updateSet>[1] = { status: next };
      if (becomingBuilt) update.hasBeenAssembled = true;
      await updateSet(setId, update);
    } catch (err) {
      setOptimisticStatus(previous);
      const message = err instanceof Error ? err.message : 'Please try again';
      toast.error("Couldn't update status", { description: message });
    } finally {
      setIsSaving(false);
    }
  };

  // Up / Down move focus between rows; Home / End jump to extremes.
  const onPanelKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') {
      return;
    }
    e.preventDefault();

    const rows = Array.from(
      panelRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]') ?? []
    );
    if (rows.length === 0) return;

    const activeEl = document.activeElement;
    const currentIdx = rows.findIndex((row) => row === activeEl);

    let nextIdx: number;
    if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = rows.length - 1;
    else if (e.key === 'ArrowDown') nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % rows.length;
    else nextIdx = currentIdx <= 0 ? rows.length - 1 : currentIdx - 1;

    rows[nextIdx].focus();
  };

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        ref={badgeRef}
        type="button"
        className={`${styles.badge} status-badge status-${optimisticStatus}`}
        aria-expanded={isOpen}
        aria-disabled={isSaving}
        aria-label={`Change status, currently ${STATUS_LABELS[optimisticStatus]}`}
        // Manual click guard rather than native `disabled` so the badge stays
        // focusable while a save is in flight — otherwise `setIsOpen(false)`
        // + `setIsSaving(true)` flip in the same render and the focus-restore
        // effect would try to focus a disabled (non-focusable) element.
        onClick={() => {
          if (isSaving) return;
          setIsOpen((open) => !open);
        }}
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

      {isOpen && (
        <div
          ref={panelRef}
          className={styles.panel}
          role="radiogroup"
          aria-label="Set status"
          onKeyDown={onPanelKeyDown}
        >
          {STATUS_ORDER.map((value) => {
            const isActive = value === optimisticStatus;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={isActive}
                tabIndex={isActive ? 0 : -1}
                data-active={isActive || undefined}
                className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
                onClick={() => pick(value)}
              >
                <span className={styles.itemLabel}>{STATUS_LABELS[value]}</span>
                {isActive && (
                  <svg
                    className={styles.itemCheck}
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
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
