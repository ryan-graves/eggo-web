'use client';

import { useEffect } from 'react';
import { useTransitionRouter } from 'next-view-transitions';
import { useAuth } from '@/hooks/useAuth';
import styles from './(auth)/sign-in/page.module.css';

export default function Home(): React.JSX.Element {
  const { user, loading } = useAuth();
  const router = useTransitionRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/home');
      } else {
        router.replace('/sign-in');
      }
    }
  }, [user, loading, router]);

  // Show same structure as sign-in page to prevent layout shift
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>Eggo</h1>
        <p className={styles.subtitle}>Lego Collection Manager</p>

        <div className={styles.loginBox}>
          <p className={styles.description}>Loading...</p>
        </div>
      </main>
    </div>
  );
}
