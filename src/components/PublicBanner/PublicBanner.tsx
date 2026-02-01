'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import styles from './PublicBanner.module.css';

export function PublicBanner(): React.JSX.Element {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className={styles.banner} />;
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
      </div>
    </div>
  );
}
