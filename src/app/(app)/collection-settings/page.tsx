'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { toast } from 'sonner';
import { useNavigation } from '@/hooks/useNavigation';
import { useCollection } from '@/hooks/useCollection';
import { Header } from '@/components/Header';
import {
  updateCollection,
  deleteCollection,
  enablePublicSharing,
  disablePublicSharing,
  updatePublicViewSettings,
} from '@/lib/supabase';
import type { PublicViewSettings } from '@/types';
import styles from './page.module.css';

const DEFAULT_VIEW_SETTINGS: PublicViewSettings = {
  showOwner: true,
  showDateReceived: true,
  showOccasion: true,
  showNotes: true,
  showStatus: true,
  showHomeView: false,
};

const VIEW_SETTING_FIELDS: { key: keyof PublicViewSettings; label: string }[] = [
  { key: 'showOwner', label: 'Owner names' },
  { key: 'showDateReceived', label: 'Date received' },
  { key: 'showOccasion', label: 'Occasion' },
  { key: 'showNotes', label: 'Notes' },
  { key: 'showStatus', label: 'Set status' },
];

function PencilIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M11.5 2.5L13.5 4.5M10 14H14M2 10L10.5 1.5C11.3284 0.671573 12.6716 0.671573 13.5 1.5C14.3284 2.32843 14.3284 3.67157 13.5 4.5L5 13L1 14L2 10Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface InlineEditFieldProps {
  label: string;
  value: string;
  displayValue?: string;
  placeholder?: string;
  hint?: string;
  /** Persist the trimmed draft. Throw an Error to keep the field open and toast the message. */
  onSave: (next: string) => Promise<void>;
}

/**
 * A read-only display row that reveals an input + Save on demand. Lets the
 * name and owner edits be click-to-save per field, so neither needs a global
 * Save footer or an auto-save debounce.
 */
function InlineEditField({
  label,
  value,
  displayValue,
  placeholder,
  hint,
  onSave,
}: InlineEditFieldProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldId = `field-${label.toLowerCase().replace(/\s+/g, '-')}`;

  const startEditing = () => {
    setDraft(value);
    setIsEditing(true);
  };

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const cancel = () => {
    setIsEditing(false);
    setDraft(value);
  };

  const save = async () => {
    setIsSaving(true);
    try {
      await onSave(draft.trim());
      setIsEditing(false);
      toast.success(`${label} updated`);
    } catch (err) {
      toast.error(`Couldn't update ${label.toLowerCase()}`, {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <div className={styles.fieldRow}>
        <div className={styles.fieldText}>
          <span className={styles.fieldLabel}>{label}</span>
          <span className={styles.fieldValue}>
            {(displayValue ?? value) || <span className={styles.fieldEmpty}>Not set</span>}
          </span>
        </div>
        <button
          type="button"
          className="btn-small btn-ghost"
          onClick={startEditing}
          aria-label={`Edit ${label.toLowerCase()}`}
        >
          <PencilIcon />
          Edit
        </button>
      </div>
    );
  }

  return (
    <form
      className={styles.fieldEditing}
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <label htmlFor={fieldId} className="form-label">
        {label}
      </label>
      <input
        id={fieldId}
        ref={inputRef}
        type="text"
        className="form-input"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') cancel();
        }}
        disabled={isSaving}
      />
      {hint && <p className={styles.hint}>{hint}</p>}
      <div className={styles.fieldEditActions}>
        <button
          type="button"
          className="btn-small btn-secondary"
          onClick={cancel}
          disabled={isSaving}
        >
          Cancel
        </button>
        <button type="submit" className="btn-small btn-primary" disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

function CollectionSettingsContent(): React.JSX.Element {
  const { navigateBack } = useNavigation();
  const { activeCollection, isInitializing } = useCollection();

  // Sharing state, synced from the active collection.
  const [isPublicEnabled, setIsPublicEnabled] = useState(false);
  const [viewSettings, setViewSettings] = useState<PublicViewSettings>(DEFAULT_VIEW_SETTINGS);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isSharingLoading, setIsSharingLoading] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  // Delete state.
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const collectionId = activeCollection?.id ?? null;

  useEffect(() => {
    if (!activeCollection) return;
    setIsPublicEnabled(activeCollection.isPublic ?? false);
    setViewSettings(activeCollection.publicViewSettings ?? DEFAULT_VIEW_SETTINGS);
    if (activeCollection.isPublic && activeCollection.publicShareToken) {
      setShareUrl(`${window.location.origin}/share/${activeCollection.publicShareToken}`);
    } else {
      setShareUrl(null);
    }
    // Keyed on primitives, not the unstable realtime snapshot reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId, activeCollection?.isPublic, activeCollection?.publicShareToken]);

  const handleSaveName = useCallback(
    async (next: string) => {
      if (!collectionId) return;
      if (!next) throw new Error('Enter a collection name');
      await updateCollection(collectionId, { name: next });
    },
    [collectionId]
  );

  const handleSaveOwners = useCallback(
    async (next: string) => {
      if (!collectionId) return;
      const owners = next
        .split(',')
        .map((o) => o.trim())
        .filter((o) => o.length > 0);
      if (owners.length === 0) throw new Error('Enter at least one owner');
      await updateCollection(collectionId, { owners });
    },
    [collectionId]
  );

  const handleTogglePublicSharing = useCallback(async () => {
    if (!collectionId) return;
    setIsSharingLoading(true);
    try {
      if (isPublicEnabled) {
        await disablePublicSharing(collectionId);
        setIsPublicEnabled(false);
        setShareUrl(null);
        toast.success('Public sharing disabled');
      } else {
        const token = await enablePublicSharing(collectionId, viewSettings);
        setIsPublicEnabled(true);
        setShareUrl(`${window.location.origin}/share/${token}`);
        toast.success('Public sharing enabled');
      }
    } catch (err) {
      toast.error("Couldn't update sharing", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSharingLoading(false);
    }
  }, [collectionId, isPublicEnabled, viewSettings]);

  const handleViewSettingChange = useCallback(
    async (key: keyof PublicViewSettings, value: boolean) => {
      if (!collectionId) return;
      const newSettings = { ...viewSettings, [key]: value };
      setViewSettings(newSettings);
      if (!isPublicEnabled) return;
      try {
        await updatePublicViewSettings(collectionId, newSettings);
      } catch (err) {
        setViewSettings(viewSettings); // revert optimistic toggle
        toast.error("Couldn't update visibility", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    },
    [collectionId, viewSettings, isPublicEnabled]
  );

  const handleCopyShareUrl = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyStatus('Copied');
      setTimeout(() => setCopyStatus(null), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  }, [shareUrl]);

  const handleDelete = async () => {
    if (!collectionId) return;
    setIsDeleting(true);
    try {
      await deleteCollection(collectionId);
      navigateBack('/home');
    } catch (err) {
      toast.error('Failed to delete collection', {
        description: err instanceof Error ? err.message : undefined,
      });
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (isInitializing) {
    return (
      <div className={styles.page}>
        <Header variant="detail" title="Collection Settings" backHref="/home" />
        <main className={styles.main}>
          <div className={styles.loading}>Loading…</div>
        </main>
      </div>
    );
  }

  if (!activeCollection) {
    return (
      <div className={styles.page}>
        <Header variant="detail" title="Collection Settings" backHref="/home" />
        <main className={styles.main}>
          <div className={styles.loading}>No collection selected</div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header variant="detail" title="Collection Settings" backHref="/home" />

      <main className={styles.main}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Details</h2>
          <div className={styles.card}>
            <InlineEditField
              label="Collection Name"
              value={activeCollection.name}
              placeholder="e.g., The Graves Collection"
              onSave={handleSaveName}
            />
            <div className={styles.fieldDivider} />
            <InlineEditField
              label="Owners"
              value={activeCollection.owners.join(', ')}
              placeholder="e.g., Ryan, Alyssa"
              hint="Separate multiple owners with commas"
              onSave={handleSaveOwners}
            />
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Sharing</h2>
          <div className={styles.card}>
            <p className={styles.settingDescription}>
              Share this collection publicly with a unique link. Visitors can browse your sets
              without signing in.
            </p>

            <label className={styles.toggleLabel}>
              <span className={styles.toggleText}>
                <span className={styles.toggleTitle}>Enable public sharing</span>
                <span className={styles.toggleDescription}>{activeCollection.name}</span>
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
                  <button type="button" onClick={handleCopyShareUrl} className="btn-default btn-primary">
                    {copyStatus || 'Copy'}
                  </button>
                </div>

                <div className={styles.viewSettingsSection}>
                  <p className={styles.viewSettingsTitle}>Visible information</p>
                  <p className={styles.viewSettingsDescription}>
                    Choose which personal details are shown on your public collection.
                  </p>
                  <div className={styles.viewSettingsOptions}>
                    {VIEW_SETTING_FIELDS.map((field) => (
                      <label key={field.key} className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={viewSettings[field.key]}
                          onChange={(e) => handleViewSettingChange(field.key, e.target.checked)}
                          className={styles.checkbox}
                        />
                        <span>{field.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className={styles.viewSettingsSection}>
                  <p className={styles.viewSettingsTitle}>Views</p>
                  <p className={styles.viewSettingsDescription}>
                    Choose which views are available on your public collection.
                  </p>
                  <div className={styles.viewSettingsOptions}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={viewSettings.showHomeView}
                        onChange={(e) => handleViewSettingChange('showHomeView', e.target.checked)}
                        className={styles.checkbox}
                      />
                      <span>Home view (curated sections)</span>
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Delete this collection</h2>
          <div className={styles.card}>
            {showDeleteConfirm ? (
              <div className={styles.deleteConfirm}>
                <p className={styles.deleteWarning}>
                  Permanently delete <strong>{activeCollection.name}</strong> and all of its sets?
                  This cannot be undone.
                </p>
                <div className={styles.deleteActions}>
                  <button
                    type="button"
                    className="btn-default btn-secondary"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-default btn-danger"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting…' : 'Delete Collection'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className={styles.settingDescription}>
                  Permanently remove this collection and every set inside it.
                </p>
                <button
                  type="button"
                  className="btn-default btn-danger"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete Collection
                </button>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function CollectionSettingsPage(): React.JSX.Element {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh' }} />}>
      <CollectionSettingsContent />
    </Suspense>
  );
}
