'use client';

import { useState } from 'react';
import Link from 'next/link';
import { collection, getDocs, updateDoc, doc, deleteField, Timestamp } from 'firebase/firestore';
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
  const [refreshStatus, setRefreshStatus] = useState<string | null>(null);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [migrateDateStatus, setMigrateDateStatus] = useState<string | null>(null);
  const [isMigratingDates, setIsMigratingDates] = useState(false);

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

  const handleRefreshAllImages = async () => {
    setIsRefreshingAll(true);
    setRefreshStatus('Scanning sets...');

    try {
      const db = getFirebaseDb();
      const setsRef = collection(db, 'sets');
      const snapshot = await getDocs(setsRef);

      const setsWithImages = snapshot.docs.filter((docSnap) => {
        const data = docSnap.data();
        return data.imageUrl && !data.customImageUrl;
      });

      setRefreshStatus(`Found ${setsWithImages.length} set${setsWithImages.length !== 1 ? 's' : ''} without processed images...`);

      let processed = 0;
      let succeeded = 0;
      let failed = 0;

      for (const docSnap of setsWithImages) {
        const data = docSnap.data();
        processed++;
        setRefreshStatus(`Processing ${processed}/${setsWithImages.length}: ${data.name || data.setNumber}...`);

        try {
          const response = await fetch('/api/remove-background', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: data.imageUrl }),
          });

          if (response.ok) {
            const result = await response.json();
            if (result.processedImageUrl) {
              await updateDoc(doc(db, 'sets', docSnap.id), {
                customImageUrl: result.processedImageUrl,
              });
              succeeded++;
            } else {
              failed++;
            }
          } else {
            failed++;
          }
        } catch {
          failed++;
        }

        // Small delay to avoid overwhelming the API
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      setRefreshStatus(
        `Done! Processed ${succeeded} image${succeeded !== 1 ? 's' : ''}` +
          (failed > 0 ? `, ${failed} failed` : '') +
          '.'
      );
    } catch (err) {
      setRefreshStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsRefreshingAll(false);
    }
  };

  const handleMigrateDates = async () => {
    setIsMigratingDates(true);
    setMigrateDateStatus('Scanning sets...');

    try {
      const db = getFirebaseDb();
      const setsRef = collection(db, 'sets');
      const snapshot = await getDocs(setsRef);

      let migrated = 0;
      let skipped = 0;

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const dateReceived = data.dateReceived;

        // Check if it's a Firestore Timestamp (has toDate method)
        if (dateReceived && dateReceived instanceof Timestamp) {
          const date = dateReceived.toDate();
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const dateString = `${year}-${month}-${day}`;

          await updateDoc(doc(db, 'sets', docSnap.id), { dateReceived: dateString });
          migrated++;
          setMigrateDateStatus(`Migrating... (${migrated} converted)`);
        } else if (dateReceived && typeof dateReceived === 'string') {
          skipped++;
        }
      }

      setMigrateDateStatus(
        `Done! Converted ${migrated} date${migrated !== 1 ? 's' : ''} to string format` +
          (skipped > 0 ? ` (${skipped} already migrated)` : '') +
          '.'
      );
    } catch (err) {
      setMigrateDateStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsMigratingDates(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <Link href="/collection" className={styles.backButton}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M12.5 15L7.5 10L12.5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Collection
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
                Migrate dates from Timestamp to string format (one-time migration).
              </p>
              <button
                type="button"
                onClick={handleMigrateDates}
                disabled={isMigratingDates}
                className={styles.cleanupButton}
              >
                {isMigratingDates ? 'Migrating...' : 'Migrate date formats'}
              </button>
              {migrateDateStatus && <p className={styles.cleanupStatus}>{migrateDateStatus}</p>}
            </div>

            <div className={styles.maintenanceItem}>
              <p className={styles.settingDescription}>
                Remove backgrounds from set images (for dark mode compatibility).
              </p>
              <button
                type="button"
                onClick={handleRefreshAllImages}
                disabled={isRefreshingAll}
                className={styles.cleanupButton}
              >
                {isRefreshingAll ? 'Processing...' : 'Remove backgrounds from all images'}
              </button>
              {refreshStatus && <p className={styles.cleanupStatus}>{refreshStatus}</p>}
            </div>

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
