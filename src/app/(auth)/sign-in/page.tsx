'use client';

import { useEffect } from 'react';
import { useTransitionRouter } from 'next-view-transitions';
import { useAuth } from '@/hooks/useAuth';
import styles from './page.module.css';

export default function LoginPage(): React.JSX.Element {
  const { user, loading, error, signInWithGoogle } = useAuth();
  const router = useTransitionRouter();

  useEffect(() => {
    if (user && !loading) {
      router.replace('/home');
    }
  }, [user, loading, router]);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch {
      // Error is already captured in auth context
    }
  };

  const isReady = !loading && !user;

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>Eggo</h1>
        <p className={styles.subtitle}>Lego Collection Manager</p>

        <div className={styles.loginBox}>
          {error && <p className={styles.error}>{error}</p>}

          <button
            onClick={handleSignIn}
            className={styles.googleButton}
            type="button"
            disabled={!isReady}
          >
            {isReady ? (
              <>
                <GoogleIcon />
                Sign in with Google
              </>
            ) : user ? (
              'Redirecting\u2026'
            ) : (
              'Loading\u2026'
            )}
          </button>
        </div>
      </main>
    </div>
  );
}

function GoogleIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9.003 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332A8.997 8.997 0 0 0 9.003 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.712A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.96A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.96 4.042l3.004-2.33z"
        fill="#FBBC05"
      />
      <path
        d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.002 0A8.997 8.997 0 0 0 .96 4.958l3.004 2.332c.708-2.127 2.692-3.71 5.036-3.71z"
        fill="#EA4335"
      />
    </svg>
  );
}
