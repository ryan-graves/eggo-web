'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, updateDoc, doc, deleteField, Timestamp, query, where } from 'firebase/firestore';
import {
  getFirebaseDb,
  enablePublicSharing,
  disablePublicSharing,
  updatePublicViewSettings,
} from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, useUITheme } from '@/hooks/useTheme';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { useCollection } from '@/hooks/useCollection';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import type { ThemePreference, UITheme, PublicViewSettings } from '@/types';
import styles from './page.module.css';

const THEME_OPTIONS: { value: ThemePreference; label: string; description: string }[] = [
  { value: 'system', label: 'System', description: 'Follow your device settings' },
  { value: 'light', label: 'Light', description: 'Always use light mode' },
  { value: 'dark', label: 'Dark', description: 'Always use dark mode' },
];

const UI_THEME_OPTIONS: { value: UITheme; label: string; description: string }[] = [
  { value: 'mono', label: 'Mono', description: 'Minimal monochrome with serif headings' },
  { value: 'baseplate', label: 'Baseplate', description: 'Classic style with accent colors' },
];

const DEFAULT_VIEW_SETTINGS: PublicViewSettings = {
  showOwner: true,
  showDateReceived: true,
  showOccasion: true,
  showNotes: true,
};

function SettingsContent(): React.JSX.Element {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { uiTheme, setUITheme } = useUITheme();
  const { goBack } = useBackNavigation();
  const { activeCollection } = useCollection();
  const [cleanupStatus, setCleanupStatus] = useState<string | null>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [customImageStatus, setCustomImageStatus] = useState<string | null>(null);
  const [isClearingCustomImages, setIsClearingCustomImages] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<string | null>(null);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [migrateDateStatus, setMigrateDateStatus] = useState<string | null>(null);
  const [isMigratingDates, setIsMigratingDates] = useState(false);

  // Sharing state
  const [isPublicEnabled, setIsPublicEnabled] = useState(false);
  const [viewSettings, setViewSettings] = useState<PublicViewSettings>(DEFAULT_VIEW_SETTINGS);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isSharingLoading, setIsSharingLoading] = useState(false);
  const [sharingStatus, setSharingStatus] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  // Sync sharing state from active collection
  useEffect(() => {
    if (activeCollection) {
      setIsPublicEnabled(activeCollection.isPublic ?? false);
      setViewSettings(activeCollection.publicViewSettings ?? DEFAULT_VIEW_SETTINGS);
      if (activeCollection.isPublic && activeCollection.publicShareToken) {
        setShareUrl(`${window.location.origin}/share/${activeCollection.publicShareToken}`);
      } else {
        setShareUrl(null);
      }
    }
  }, [activeCollection]);

  const handleTogglePublicSharing = useCallback(async () => {
    if (!activeCollection) return;

    setIsSharingLoading(true);
    setSharingStatus(null);

    try {
      if (isPublicEnabled) {
        await disablePublicSharing(activeCollection.id);
        setIsPublicEnabled(false);
        setShareUrl(null);
        setSharingStatus('Public sharing disabled');
      } else {
        const token = await enablePublicSharing(activeCollection.id, viewSettings);
        setIsPublicEnabled(true);
        setShareUrl(`${window.location.origin}/share/${token}`);
        setSharingStatus('Public sharing enabled');
      }
    } catch (err) {
      setSharingStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSharingLoading(false);
    }
  }, [activeCollection, isPublicEnabled, viewSettings]);

  const handleViewSettingChange = useCallback(
    async (key: keyof PublicViewSettings, value: boolean) => {
      if (!activeCollection) return;

      const newSettings = { ...viewSettings, [key]: value };
      setViewSettings(newSettings);

      if (isPublicEnabled) {
        try {
          await updatePublicViewSettings(activeCollection.id, newSettings);
        } catch (err) {
          setSharingStatus(`Error updating settings: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    },
    [activeCollection, viewSettings, isPublicEnabled]
  );

  const handleCopyShareUrl = useCallback(async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus(null), 2000);
    } catch {
      setCopyStatus('Failed to copy');
    }
  }, [shareUrl]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // Error is handled in auth context
    }
  };

  const handleCleanupOccasions = async () => {
    if (!activeCollection) {
      setCleanupStatus('Error: No collection selected');
      return;
    }

    setIsCleaningUp(true);
    setCleanupStatus('Starting cleanup...');

    try {
      const db = getFirebaseDb();
      const setsRef = collection(db, 'sets');
      const q = query(setsRef, where('collectionId', '==', activeCollection.id));
      const snapshot = await getDocs(q);

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

  const handleClearCustomImages = async () => {
    if (!activeCollection) {
      setCustomImageStatus('Error: No collection selected');
      return;
    }

    setIsClearingCustomImages(true);
    setCustomImageStatus('Scanning sets...');

    try {
      const db = getFirebaseDb();
      const setsRef = collection(db, 'sets');
      const q = query(setsRef, where('collectionId', '==', activeCollection.id));
      const snapshot = await getDocs(q);

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
    if (!activeCollection) {
      setRefreshStatus('Error: No collection selected');
      return;
    }

    setIsRefreshingAll(true);
    setRefreshStatus('Scanning sets...');

    try {
      const db = getFirebaseDb();
      const setsRef = collection(db, 'sets');
      const q = query(setsRef, where('collectionId', '==', activeCollection.id));
      const snapshot = await getDocs(q);

      const setsToProcess = snapshot.docs.filter((docSnap) => {
        const data = docSnap.data();
        // Process if: has source image AND (no custom image OR custom image is old base64 format)
        if (!data.imageUrl) return false;
        if (!data.customImageUrl) return true;
        // Old base64 images start with "data:image/", new Firebase Storage URLs start with "https://"
        return data.customImageUrl.startsWith('data:image/');
      });

      const needsUpgrade = setsToProcess.filter((d) => d.data().customImageUrl?.startsWith('data:image/')).length;
      setRefreshStatus(
        `Found ${setsToProcess.length} set${setsToProcess.length !== 1 ? 's' : ''} to process` +
          (needsUpgrade > 0 ? ` (${needsUpgrade} to upgrade to high-res)` : '') +
          '...'
      );

      let processed = 0;
      let succeeded = 0;
      let failed = 0;

      for (const docSnap of setsToProcess) {
        const data = docSnap.data();
        processed++;
        setRefreshStatus(`Processing ${processed}/${setsToProcess.length}: ${data.name || data.setNumber}...`);

        try {
          const response = await fetch('/api/remove-background', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: data.imageUrl, setId: docSnap.id }),
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
            const errorResult = await response.json().catch(() => ({}));
            console.error(`Failed to process ${data.name}:`, errorResult.error || response.status);
            failed++;
          }
        } catch (err) {
          console.error(`Exception processing ${data.name}:`, err);
          failed++;
        }

        // Rate limit: 1 second between requests to avoid overwhelming rembg.com API
        await new Promise((resolve) => setTimeout(resolve, 1000));
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
    if (!activeCollection) {
      setMigrateDateStatus('Error: No collection selected');
      return;
    }

    setIsMigratingDates(true);
    setMigrateDateStatus('Scanning sets...');

    try {
      const db = getFirebaseDb();
      const setsRef = collection(db, 'sets');
      const q = query(setsRef, where('collectionId', '==', activeCollection.id));
      const snapshot = await getDocs(q);

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
        <button
          type="button"
          onClick={() => goBack('/collection')}
          className={styles.backButton}
          aria-label="Back to collection"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M12.5 15L7.5 10L12.5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className={styles.title}>Settings</h1>
        <div className={styles.headerSpacer} aria-hidden="true" />
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
            <div className={styles.settingGroup}>
              <h3 className={styles.settingGroupTitle}>Color Mode</h3>
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

            <div className={styles.settingGroup}>
              <h3 className={styles.settingGroupTitle}>UI Style</h3>
              <div className={styles.themeOptions}>
                {UI_THEME_OPTIONS.map((option) => (
                  <label key={option.value} className={styles.themeOption}>
                    <input
                      type="radio"
                      name="uiTheme"
                      value={option.value}
                      checked={uiTheme === option.value}
                      onChange={() => setUITheme(option.value)}
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
          </div>
        </section>

        {activeCollection && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Sharing</h2>
            <div className={styles.card}>
              <p className={styles.settingDescription}>
                Share your collection publicly with a unique link. Visitors can browse your sets
                without signing in.
              </p>

              <div className={styles.sharingToggle}>
                <label className={styles.toggleLabel}>
                  <span className={styles.toggleText}>
                    <span className={styles.toggleTitle}>Enable public sharing</span>
                    <span className={styles.toggleDescription}>
                      {activeCollection.name}
                    </span>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isPublicEnabled}
                    aria-label="Enable public sharing"
                    onClick={handleTogglePublicSharing}
                    disabled={isSharingLoading}
                    className={`${styles.toggle} ${isPublicEnabled ? styles.toggleOn : ''}`}
                  >
                    <span className={styles.toggleKnob} />
                  </button>
                </label>
              </div>

              {isPublicEnabled && shareUrl && (
                <>
                  <div className={styles.shareUrlContainer}>
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className={styles.shareUrlInput}
                      onClick={(e) => e.currentTarget.select()}
                    />
                    <button
                      type="button"
                      onClick={handleCopyShareUrl}
                      className={styles.copyButton}
                    >
                      {copyStatus || 'Copy'}
                    </button>
                  </div>

                  <div className={styles.viewSettingsSection}>
                    <p className={styles.viewSettingsTitle}>Visible information</p>
                    <p className={styles.viewSettingsDescription}>
                      Choose which personal details are shown on your public collection.
                    </p>

                    <div className={styles.viewSettingsOptions}>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={viewSettings.showOwner}
                          onChange={(e) => handleViewSettingChange('showOwner', e.target.checked)}
                          className={styles.checkbox}
                        />
                        <span>Owner names</span>
                      </label>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={viewSettings.showDateReceived}
                          onChange={(e) => handleViewSettingChange('showDateReceived', e.target.checked)}
                          className={styles.checkbox}
                        />
                        <span>Date received</span>
                      </label>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={viewSettings.showOccasion}
                          onChange={(e) => handleViewSettingChange('showOccasion', e.target.checked)}
                          className={styles.checkbox}
                        />
                        <span>Occasion</span>
                      </label>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={viewSettings.showNotes}
                          onChange={(e) => handleViewSettingChange('showNotes', e.target.checked)}
                          className={styles.checkbox}
                        />
                        <span>Notes</span>
                      </label>
                    </div>
                  </div>
                </>
              )}

              {sharingStatus && <p className={styles.cleanupStatus}>{sharingStatus}</p>}
            </div>
          </section>
        )}

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
                Process all images: fetch high-resolution versions and remove backgrounds for dark
                mode compatibility. Also upgrades older low-res images to the new high-res format.
              </p>
              <button
                type="button"
                onClick={handleRefreshAllImages}
                disabled={isRefreshingAll}
                className={styles.cleanupButton}
              >
                {isRefreshingAll ? 'Processing...' : 'Process all images'}
              </button>
              {refreshStatus && <p className={styles.cleanupStatus}>{refreshStatus}</p>}
            </div>

            <div className={styles.maintenanceItem}>
              <p className={styles.settingDescription}>
                Clear processed images to revert to original Brickset images.
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
