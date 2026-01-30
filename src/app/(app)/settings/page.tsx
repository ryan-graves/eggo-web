'use client';

import { useState } from 'react';
import Link from 'next/link';
import { collection, getDocs, updateDoc, doc, deleteField } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
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
  const [cleanupStatus, setCleanupStatus] = useState<string | null>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [imageStatus, setImageStatus] = useState<string | null>(null);
  const [isUpgradingImages, setIsUpgradingImages] = useState(false);
  const [customImageStatus, setCustomImageStatus] = useState<string | null>(null);
  const [isClearingCustomImages, setIsClearingCustomImages] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // Error is handled in auth context
    }
  };

  const handleCleanupOccasions = async () => {
    setIsCleaningUp(true);
    setCleanupStatus('Starting cleanup...');

    try {
      const db = getFirebaseDb();
      const setsRef = collection(db, 'sets');
      const snapshot = await getDocs(setsRef);

      let updated = 0;
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (data.occasion?.toLowerCase().trim() === 'just because') {
          await updateDoc(doc(db, 'sets', docSnap.id), { occasion: '' });
          updated++;
        }
      }

      setCleanupStatus(`Done! Cleared "just because" from ${updated} set${updated !== 1 ? 's' : ''}.`);
    } catch (err) {
      setCleanupStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleUpgradeImages = async () => {
    setIsUpgradingImages(true);
    setImageStatus('Scanning sets...');

    try {
      const db = getFirebaseDb();
      const setsRef = collection(db, 'sets');
      const snapshot = await getDocs(setsRef);

      let upgraded = 0;
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const imageUrl = data.imageUrl as string | null;

        // Check if it's a Brickset image that's not already using /large/
        if (imageUrl && imageUrl.includes('images.brickset.com/sets/')) {
          if (imageUrl.includes('/small/') || (imageUrl.includes('/images/') && !imageUrl.includes('/large/'))) {
            const upgradedUrl = imageUrl
              .replace('/sets/small/', '/sets/large/')
              .replace('/sets/images/', '/sets/large/');

            await updateDoc(doc(db, 'sets', docSnap.id), { imageUrl: upgradedUrl });
            upgraded++;
            setImageStatus(`Upgrading... (${upgraded} so far)`);
          }
        }
      }

      setImageStatus(`Done! Upgraded ${upgraded} image${upgraded !== 1 ? 's' : ''} to high resolution.`);
    } catch (err) {
      setImageStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsUpgradingImages(false);
    }
  };

  const handleClearCustomImages = async () => {
    setIsClearingCustomImages(true);
    setCustomImageStatus('Scanning sets...');

    try {
      const db = getFirebaseDb();
      const setsRef = collection(db, 'sets');
      const snapshot = await getDocs(setsRef);

      let cleared = 0;
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (data.customImageUrl) {
          await updateDoc(doc(db, 'sets', docSnap.id), { customImageUrl: deleteField() });
          cleared++;
          setCustomImageStatus(`Clearing... (${cleared} so far)`);
        }
      }

      setCustomImageStatus(`Done! Cleared ${cleared} custom image${cleared !== 1 ? 's' : ''}. High-res originals will now show.`);
    } catch (err) {
      setCustomImageStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsClearingCustomImages(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <Link href="/collection" className={styles.backLink}>
          Back to Collection
        </Link>
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
          <h2 className={styles.sectionTitle}>Data Maintenance</h2>
          <div className={styles.card}>
            <div className={styles.maintenanceItem}>
              <p className={styles.settingDescription}>
                Upgrade set images to high resolution (Brickset large format).
              </p>
              <button
                type="button"
                onClick={handleUpgradeImages}
                disabled={isUpgradingImages}
                className={styles.cleanupButton}
              >
                {isUpgradingImages ? 'Upgrading...' : 'Upgrade images to high-res'}
              </button>
              {imageStatus && <p className={styles.cleanupStatus}>{imageStatus}</p>}
            </div>

            <div className={styles.maintenanceItem}>
              <p className={styles.settingDescription}>
                Clear processed images to show high-res originals instead.
              </p>
              <button
                type="button"
                onClick={handleClearCustomImages}
                disabled={isClearingCustomImages}
                className={styles.cleanupButton}
              >
                {isClearingCustomImages ? 'Clearing...' : 'Clear processed images'}
              </button>
              {customImageStatus && <p className={styles.cleanupStatus}>{customImageStatus}</p>}
            </div>

            <div className={styles.maintenanceItem}>
              <p className={styles.settingDescription}>
                Clean up &quot;just because&quot; occasion entries.
              </p>
              <button
                type="button"
                onClick={handleCleanupOccasions}
                disabled={isCleaningUp}
                className={styles.cleanupButton}
              >
                {isCleaningUp ? 'Cleaning...' : 'Clear "just because" occasions'}
              </button>
              {cleanupStatus && <p className={styles.cleanupStatus}>{cleanupStatus}</p>}
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
