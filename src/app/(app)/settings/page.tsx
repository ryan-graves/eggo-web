'use client';

import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import type { ThemePreference } from '@/types';
import styles from './page.module.css';

const THEME_OPTIONS: { value: ThemePreference; label: string; description: string }[] = [
  { value: 'system', label: 'System', description: 'Follow your device settings' },
  { value: 'light', label: 'Light', description: 'Always use light mode' },
  { value: 'dark', label: 'Dark', description: 'Always use dark mode' },
];

function SettingsContent(): React.JSX.Element {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // Error is handled in auth context
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <a href="/collection" className={styles.backLink}>
          Back to Collection
        </a>
      </header>

      <main className={styles.main}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Account</h2>
          <div className={styles.card}>
            <div className={styles.accountInfo}>
              {user?.photoURL && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt="" className={styles.avatar} />
              )}
              <div className={styles.accountDetails}>
                <p className={styles.accountName}>{user?.displayName || 'User'}</p>
                <p className={styles.accountEmail}>{user?.email}</p>
              </div>
            </div>
            <button type="button" onClick={handleSignOut} className={styles.signOutButton}>
              Sign Out
            </button>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Appearance</h2>
          <div className={styles.card}>
            <p className={styles.settingDescription}>
              Choose how Eggo looks to you. Select a theme or let your device decide.
            </p>
            <div className={styles.themeOptions}>
              {THEME_OPTIONS.map((option) => (
                <label key={option.value} className={styles.themeOption}>
                  <input
                    type="radio"
                    name="theme"
                    value={option.value}
                    checked={theme === option.value}
                    onChange={() => setTheme(option.value)}
                    className={styles.themeRadio}
                  />
                  <span className={styles.themeContent}>
                    <span className={styles.themeLabel}>{option.label}</span>
                    <span className={styles.themeDescription}>{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>About</h2>
          <div className={styles.card}>
            <p className={styles.aboutText}>
              <strong>Eggo</strong> - Lego Collection Manager
            </p>
            <p className={styles.versionText}>Version 0.1.0</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function SettingsPage(): React.JSX.Element {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
