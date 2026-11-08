'use client';

import { useEffect, useRef, useState } from 'react';
import type { SetStatus } from '@/types';
import styles from './StatusPicker.module.css';

export const STATUS_ORDER: SetStatus[] = [
  'unopened',
  'in_progress',
  'rebuild_in_progress',
  'assembled',
  'disassembled',
];

export const STATUS_LABELS: Record<SetStatus, string> = {
  unopened: 'Unopened',
  in_progress: 'In Progress',
  rebuild_in_progress: 'Rebuilding',
  assembled: 'Assembled',
  disassembled: 'Disassembled',
};

interface StatusPickerProps {
  value: SetStatus;
  /** Called with the newly picked status. Not called when the current one is re-picked. */
  onChange: (next: SetStatus) => void;
  /** Dims the badge and ignores clicks while a save is in flight. Stays focusable. */
  busy?: boolean;
  /** The value is being set elsewhere; shows it but can't be opened. */
  disabled?: boolean;
  /** Smaller badge for dense rows, matching `status-badge-sm` on cards. */
  size?: 'default' | 'sm';
  /** Names what the status belongs to, so a page of pickers reads distinctly to screen readers. */
  subject?: string;
}

/**
 * Controlled status badge with an anchored dropdown menu. Tap the badge to
 * open a floating panel of the five status options; pick a row to report it
 * through `onChange`. The panel is `position: absolute` so it doesn't push
 * surrounding content; surrounding layout stays still through the interaction.
 *
 * Owns no persistence: `StatusControl` wraps it for the set detail page,
 * and the Brickset import review uses it directly per row.
 */
export function StatusPicker({
  value,
  onChange,
  busy = false,
  disabled = false,
  size = 'default',
  subject,
}: StatusPickerProps): React.JSX.Element {
  const [isOpenRequested, setIsOpen] = useState(false);
  // Becoming disabled while open (e.g. the import review locking status for
  // every set) must not leave an orphaned menu behind, nor a stale request
  // that would pop the menu back open the moment the picker is re-enabled.
  // Adjusting state during render is React's sanctioned way to derive this.
  if (disabled && isOpenRequested) setIsOpen(false);
  const isOpen = isOpenRequested && !disabled;

  const rootRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus the active row on open; return focus to the badge on close.
  // wasOpenRef means we skip the initial mount so we don't grab focus.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const active = panelRef.current?.querySelector<HTMLButtonElement>('[data-active="true"]');
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

  const pick = (next: SetStatus) => {
    setIsOpen(false);
    if (next === value) return;
    onChange(next);
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

  const badgeSizeClass = size === 'sm' ? 'status-badge-sm' : 'status-badge';
  const subjectSuffix = subject ? ` for ${subject}` : '';

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        ref={badgeRef}
        type="button"
        className={`${styles.badge} ${badgeSizeClass} status-${value}`}
        aria-expanded={isOpen}
        aria-disabled={busy}
        disabled={disabled}
        aria-label={`Change status${subjectSuffix}, currently ${STATUS_LABELS[value]}`}
        // Manual click guard rather than native `disabled` so the badge stays
        // focusable while a save is in flight — otherwise `setIsOpen(false)`
        // + a busy flip in the same render would make the focus-restore
        // effect try to focus a disabled (non-focusable) element.
        onClick={() => {
          if (busy) return;
          setIsOpen((open) => !open);
        }}
      >
        {STATUS_LABELS[value]}
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
          aria-label={`Set status${subjectSuffix}`}
          onKeyDown={onPanelKeyDown}
        >
          {STATUS_ORDER.map((option) => {
            const isActive = option === value;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={isActive}
                tabIndex={isActive ? 0 : -1}
                data-active={isActive || undefined}
                className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
                onClick={() => pick(option)}
              >
                <span className={styles.itemLabel}>{STATUS_LABELS[option]}</span>
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
