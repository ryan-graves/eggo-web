'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import styles from './PublicBanner.module.css';

const BANNER_DISMISSED_KEY = 'eggo-public-banner-dismissed';

export function PublicBanner(): React.JSX.Element | null {
  const { user, loading } = useAuth();
  const [isDismissed, setIsDismissed] = useState(true); // Start hidden to avoid flash

  useEffect(() => {
    // Check localStorage on mount to determine banner visibility
    const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: reading localStorage value on mount
    setIsDismissed(dismissed === 'true');
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
  };

  // Don't show banner if dismissed (for non-logged-in users only)
  // Always show for logged-in users since it's a navigation aid
  if (isDismissed && !user && !loading) {
    return null;
  }

  if (loading) {
    return null;
  }

  if (user) {
    return (
      <div className={styles.banner}>
        <div className={styles.content}>
          <span className={styles.text}>Viewing a shared collection</span>
          <Link href="/collection" className={styles.link}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to my collection
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <span className={styles.text}>Start tracking your own Lego collection</span>
        <Link href="/login" className={styles.button}>
          Sign up free
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          className={styles.closeButton}
          aria-label="Dismiss banner"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
