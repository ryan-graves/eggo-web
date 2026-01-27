'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import styles from './page.module.css';

export default function Home(): React.JSX.Element {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      router.push('/collection');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.description}>Loading...</p>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>Eggo</h1>
        <p className={styles.subtitle}>Lego Collection Manager</p>
        <p className={styles.description}>Track and manage your Lego set collection</p>
        <Link href="/login" className={styles.loginLink}>
          Sign in to get started
        </Link>
      </main>
    </div>
  );
}
