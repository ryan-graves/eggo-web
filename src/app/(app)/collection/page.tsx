'use client';

import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import styles from './page.module.css';

export default function CollectionPage(): React.JSX.Element {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // Error handling is in auth context
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Eggo</h1>
        <div className={styles.userInfo}>
          {user?.photoURL && (
            <Image
              src={user.photoURL}
              alt=""
              width={32}
              height={32}
              className={styles.avatar}
              referrerPolicy="no-referrer"
            />
          )}
          <span className={styles.userName}>{user?.displayName || user?.email}</span>
          <button onClick={handleSignOut} className={styles.signOutButton} type="button">
            Sign Out
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.emptyState}>
          <h2>Welcome to Eggo!</h2>
          <p>Your Lego collection will appear here.</p>
          <p className={styles.hint}>Collection management coming soon...</p>
        </div>
      </main>
    </div>
  );
}
