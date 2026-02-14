'use client';

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  useId,
  type ReactNode,
  type HTMLAttributes,
  type ButtonHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import styles from './Sheet.module.css';

/* ============================
   Constants
   ============================ */

const ANIMATION_DURATION = 500; // ms – matches CSS animation-duration
const DRAG_DISMISS_DURATION = 300; // ms – faster exit when flicked
const DISMISS_THRESHOLD = 80; // px dragged down to dismiss
const VELOCITY_THRESHOLD = 0.4; // px/ms flick velocity to dismiss

/* ============================
   Context
   ============================ */

interface SheetContextValue {
  isClosing: boolean;
  onClose: () => void;
  dragDismiss: () => void;
  titleId: string;
  contentRef: React.RefObject<HTMLDivElement | null>;
}

const SheetContext = createContext<SheetContextValue | null>(null);

function useSheet(): SheetContextValue {
  const ctx = useContext(SheetContext);
  if (!ctx) throw new Error('Sheet compound components must be used within Sheet.Root');
  return ctx;
}

/* ============================
   Root
   ============================ */

interface RootProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  /** Unused — accepted for Vaul migration compat. */
  repositionInputs?: boolean;
}

function Root({ open, onOpenChange, children }: RootProps): React.JSX.Element | null {
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const closingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleId = useId();
  const contentRef = useRef<HTMLDivElement>(null);

  const onClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // Instant unmount used by drag-dismiss (content already animated out).
  const dragDismiss = useCallback(() => {
    if (closingTimer.current) {
      clearTimeout(closingTimer.current);
      closingTimer.current = null;
    }
    setIsClosing(false);
    setMounted(false);
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (open) {
      // Opening — cancel any pending close and mount immediately
      if (closingTimer.current) {
        clearTimeout(closingTimer.current);
        closingTimer.current = null;
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing internal mount lifecycle from open prop is intentional
      setIsClosing(false);
      setMounted(true);
    } else if (mounted && !isClosing) {
      // Closing — play exit animation then unmount
      setIsClosing(true);
      closingTimer.current = setTimeout(() => {
        setMounted(false);
        setIsClosing(false);
        closingTimer.current = null;
      }, ANIMATION_DURATION);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally only react to `open`

  useEffect(() => {
    return () => {
      if (closingTimer.current) clearTimeout(closingTimer.current);
    };
  }, []);

  if (!mounted) return null;

  return (
    <SheetContext.Provider value={{ isClosing, onClose, dragDismiss, titleId, contentRef }}>
      {children}
    </SheetContext.Provider>
  );
}

/* ============================
   Portal
   ============================ */

function Portal({ children }: { children: ReactNode }): React.JSX.Element {
  // Safe to access document.body directly — Portal only renders after
  // Root's client-side effect sets mounted=true.
  return createPortal(children, document.body);
}

/* ============================
   Overlay
   ============================ */

function Overlay(): React.JSX.Element {
  const { isClosing, onClose } = useSheet();

  return (
    <div
      className={styles.overlay}
      data-state={isClosing ? 'closed' : 'open'}
      onClick={onClose}
      aria-hidden="true"
    />
  );
}

/* ============================
   Content
   ============================ */

interface ContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

function Content({ children, className, ...props }: ContentProps): React.JSX.Element {
  const { isClosing, onClose, titleId, contentRef } = useSheet();

  // Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Body scroll lock
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  // Focus first interactive element on mount
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const focusable = el.querySelector<HTMLElement>(
      'button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable) {
      focusable.focus({ preventScroll: true });
    } else {
      el.focus({ preventScroll: true });
    }
  }, [contentRef]);

  const state = isClosing ? 'closed' : 'open';

  return (
    <div
      ref={contentRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className={`${styles.content} ${className || ''}`}
      data-state={state}
      {...props}
    >
      {children}
    </div>
  );
}

/* ============================
   Handle (drag-to-dismiss)
   ============================ */

function Handle(): React.JSX.Element {
  const { dragDismiss, contentRef } = useSheet();
  const dragRef = useRef({
    active: false,
    startY: 0,
    startTime: 0,
    offset: 0,
  });

  const setContentTransform = (offset: number, animate: boolean): void => {
    const el = contentRef.current;
    if (!el) return;
    el.style.transition = animate
      ? `transform ${DRAG_DISMISS_DURATION}ms cubic-bezier(0.32, 0.72, 0, 1)`
      : 'none';
    el.style.transform = offset > 0 ? `translateY(${offset}px)` : '';
  };

  const clearContentStyles = (): void => {
    const el = contentRef.current;
    if (!el) return;
    el.style.transition = '';
    el.style.transform = '';
  };

  const startDrag = (clientY: number): void => {
    dragRef.current = { active: true, startY: clientY, startTime: Date.now(), offset: 0 };
    setContentTransform(0, false);
  };

  const moveDrag = (clientY: number): void => {
    if (!dragRef.current.active) return;
    const delta = Math.max(0, clientY - dragRef.current.startY);
    dragRef.current.offset = delta;
    setContentTransform(delta, false);
  };

  const endDrag = (): void => {
    if (!dragRef.current.active) return;
    const { offset, startTime } = dragRef.current;
    const elapsed = Date.now() - startTime;
    const velocity = elapsed > 0 ? offset / elapsed : 0;
    dragRef.current.active = false;

    if (offset > DISMISS_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
      // Dismiss: animate off-screen then unmount instantly
      setContentTransform(contentRef.current?.offsetHeight ?? window.innerHeight, true);
      setTimeout(() => {
        clearContentStyles();
        dragDismiss();
      }, DRAG_DISMISS_DURATION);
    } else {
      // Spring back
      setContentTransform(0, true);
      setTimeout(clearContentStyles, DRAG_DISMISS_DURATION);
    }
  };

  // Touch
  const onTouchStart = (e: React.TouchEvent): void => startDrag(e.touches[0].clientY);
  const onTouchMove = (e: React.TouchEvent): void => moveDrag(e.touches[0].clientY);
  const onTouchEnd = (): void => endDrag();

  // Mouse (desktop)
  const onMouseDown = (e: React.MouseEvent): void => {
    e.preventDefault();
    startDrag(e.clientY);
    const move = (ev: MouseEvent): void => moveDrag(ev.clientY);
    const up = (): void => {
      endDrag();
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };

  return (
    <div
      className={styles.handle}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
    >
      <div className={styles.handleBar} />
    </div>
  );
}

/* ============================
   Title
   ============================ */

function Title({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>): React.JSX.Element {
  const { titleId } = useSheet();
  return (
    <h2 id={titleId} className={className} {...props}>
      {children}
    </h2>
  );
}

/* ============================
   Close
   ============================ */

function Close({
  children,
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>): React.JSX.Element {
  const { onClose } = useSheet();
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>): void => {
    onClick?.(e);
    if (!e.defaultPrevented) onClose();
  };
  return (
    <button type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  );
}

/* ============================
   Public API
   ============================ */

export const Sheet = {
  Root,
  Portal,
  Overlay,
  Content,
  Handle,
  Title,
  Close,
};
