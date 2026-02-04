'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  enablePublicSharing,
  disablePublicSharing,
  updatePublicViewSettings,
} from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, useUITheme } from '@/hooks/useTheme';
import { useCollection } from '@/hooks/useCollection';
import { Header } from '@/components/Header';
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
  const { activeCollection } = useCollection();

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

  return (
    <div className={styles.page}>
      <Header variant="detail" title="Settings" />

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

              {sharingStatus && <p className={styles.sharingStatus}>{sharingStatus}</p>}
            </div>
          </section>
        )}

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
