'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import styles from './page.module.css';

export default function Home(): React.JSX.Element {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/home');
      } else {
        router.replace('/sign-in');
      }
    }
  }, [user, loading, router]);

  // Always show loading - we redirect either way once auth resolves
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>Eggo</h1>
        <p className={styles.subtitle}>Lego Collection Manager</p>
      </main>
    </div>
  );
}
