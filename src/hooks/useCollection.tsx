'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  readStoredActiveCollectionId,
  resolveActiveCollection,
  storeActiveCollectionId,
} from '@/lib/activeCollection';
import {
  createCollection,
  subscribeToCollectionsForUser,
  subscribeToSetsForCollection,
} from '@/lib/supabase';
import type { Collection, LegoSet } from '@/types';

interface CollectionContextValue {
  collections: Collection[];
  activeCollection: Collection | null;
  sets: LegoSet[];
  /** True only during initial data load, false after first successful load */
  isInitializing: boolean;
  /** True while fetching sets for a new collection (after initial load) */
  isSwitchingCollection: boolean;
  /** Set when creating a collection fails */
  error: string | null;
  /** Set when loading the collections list fails */
  collectionsError: string | null;
  /** True once the collections list has loaded successfully at least once */
  collectionsEverLoaded: boolean;
  /** Set when loading the active collection's sets fails */
  setsError: string | null;
  setActiveCollection: (collection: Collection) => void;
  createNewCollection: (name: string, owners: string[]) => Promise<string>;
}

const CollectionContext = createContext<CollectionContextValue | null>(null);

interface CollectionProviderProps {
  children: ReactNode;
}

export function CollectionProvider({ children }: CollectionProviderProps): React.JSX.Element {
  const { user, loading: authLoading } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeCollection, setActiveCollectionState] = useState<Collection | null>(null);
  const [sets, setSets] = useState<LegoSet[]>([]);
  const [error, setError] = useState<string | null>(null);
  // The collections and sets streams fail independently, so each tracks its
  // own error; the browse layout surfaces them separately.
  const [collectionsError, setCollectionsError] = useState<string | null>(null);
  const [setsError, setSetsError] = useState<string | null>(null);

  // Track initialization state separately from loading
  const [collectionsInitialized, setCollectionsInitialized] = useState(false);
  const [setsInitialized, setSetsInitialized] = useState(false);
  const [isSwitchingCollection, setIsSwitchingCollection] = useState(false);
  // True once the collections list has loaded successfully at least once
  const [collectionsEverLoaded, setCollectionsEverLoaded] = useState(false);

  // Track which collection's sets we currently have loaded
  const loadedCollectionIdRef = useRef<string | null>(null);
  // Track which collection the sets subscription was last started for
  const subscribedCollectionIdRef = useRef<string | null>(null);

  // Subscribe to user's collections. Keyed on the id rather than the user
  // object: a refreshed session for the same account must not restart the
  // stream (which would reset `isInitializing` and remount every browse view).
  const userId = user?.id ?? null;
  useEffect(() => {
    // No user - reset state immediately (valid synchronous update for auth state change)
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Resetting state on logout is intentional
      setCollectionsInitialized(false);
      setSetsInitialized(false);
      setCollections([]);
      setActiveCollectionState(null);
      setSets([]);
      loadedCollectionIdRef.current = null;
      return;
    }

    const unsubscribe = subscribeToCollectionsForUser(userId, (userCollections) => {
      setCollections(userCollections);
      setCollectionsError(null);
      setCollectionsEverLoaded(true);

      // Pick up the remembered collection if none is selected yet, or swap in
      // the fresh copy of the current one. Collections arrive newest-first,
      // so without the remembered id every reload would land on whichever
      // collection was created last.
      setActiveCollectionState((current) => {
        if (current) {
          const updatedCollection = userCollections.find((c) => c.id === current.id);
          if (updatedCollection) {
            return updatedCollection;
          }
          // Collection was deleted (or the user left it): fall through to the
          // same resolution as a cold start.
        }
        return resolveActiveCollection(userCollections, readStoredActiveCollectionId(userId));
      });

      // Mark collections as initialized after first successful load
      setCollectionsInitialized(true);
    }, (err) => {
      setCollectionsError(err.message || 'Failed to load collections');
      setCollectionsInitialized(true);
    });

    // Cleanup: unsubscribe and reset state when user changes
    return () => {
      unsubscribe();
      setCollectionsInitialized(false);
      setSetsInitialized(false);
      setCollections([]);
      setActiveCollectionState(null);
      setSets([]);
      loadedCollectionIdRef.current = null;
    };
  }, [userId]);

  // Subscribe to sets for active collection
  useEffect(() => {
    if (!activeCollection || !user?.id) {
      // No collection selected (or not signed in) — clear sets but
      // preserve initialized state. The user.id gate is what's
      // passed to subscribeToSetsForCollection so the refetch can
      // enforce membership; without it we don't subscribe at all.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Resetting state when no collection is intentional
      setSets([]);
      setSetsError(null);
      loadedCollectionIdRef.current = null;
      return;
    }

    const isNewCollection = loadedCollectionIdRef.current !== activeCollection.id;

    // Switching to a different collection: drop the prior collection's error so
    // the new one shows a loading state, not the previous failure.
    if (subscribedCollectionIdRef.current !== activeCollection.id) {
      subscribedCollectionIdRef.current = activeCollection.id;
      setSetsError(null);
    }

    // Only show switching indicator after initial load and when changing collections
    if (isNewCollection && setsInitialized) {
      setIsSwitchingCollection(true);
    }

    const unsubscribe = subscribeToSetsForCollection(activeCollection.id, user.id, (collectionSets) => {
      setSets(collectionSets);
      setSetsError(null);
      loadedCollectionIdRef.current = activeCollection.id;
      setSetsInitialized(true);
      setIsSwitchingCollection(false);
    }, (err) => {
      setSetsError(err.message || 'Failed to load sets');
      setSetsInitialized(true);
      setIsSwitchingCollection(false);
    });

    return () => {
      unsubscribe();
      // Don't clear sets on cleanup - keep showing previous data until new data arrives
      // This prevents the flash of empty state when switching collections
    };
  }, [activeCollection, setsInitialized, user?.id]);

  // Remember the active collection per user so a reload (or the next sign-in
  // on this browser) returns to it. One effect keyed on the id covers every
  // way the selection changes: the selector, creating a collection, and the
  // fallback when the active one is deleted.
  const activeCollectionId = activeCollection?.id ?? null;
  useEffect(() => {
    if (!user?.id || !activeCollectionId) return;
    storeActiveCollectionId(user.id, activeCollectionId);
  }, [user?.id, activeCollectionId]);

  const setActiveCollection = useCallback((collection: Collection) => {
    setActiveCollectionState(collection);
  }, []);

  const createNewCollection = useCallback(
    async (name: string, owners: string[]): Promise<string> => {
      if (!userId) {
        throw new Error('Must be logged in to create a collection');
      }

      setError(null);
      try {
        const collectionId = await createCollection({ name, owners });

        // Optimistically update state so the UI transitions immediately
        // rather than waiting for the realtime subscription to deliver the new row
        const now = new Date().toISOString();
        const newCollection: Collection = {
          id: collectionId,
          name,
          owners,
          memberUserIds: [userId],
          createdAt: now,
          updatedAt: now,
        };
        setCollections((prev) => {
          if (prev.some((c) => c.id === collectionId)) {
            return prev;
          }
          // Newest first, matching the server order the next refetch returns
          return [newCollection, ...prev];
        });
        // Creating a collection always lands the user in it, whether it's
        // their first or an additional one.
        setActiveCollectionState(newCollection);
        // A brand-new collection has no sets — mark sets as initialized so
        // isInitializing resolves to false immediately (avoids skeleton flash)
        setSets([]);
        setSetsInitialized(true);
        loadedCollectionIdRef.current = collectionId;

        return collectionId;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create collection';
        setError(message);
        throw err;
      }
    },
    [userId]
  );

  // Compute isInitializing: true until auth is resolved AND we have loaded collections AND sets
  const isInitializing = authLoading || !collectionsInitialized || (activeCollection !== null && !setsInitialized);

  const value = useMemo(
    () => ({
      collections,
      activeCollection,
      sets,
      isInitializing,
      isSwitchingCollection,
      error,
      collectionsError,
      collectionsEverLoaded,
      setsError,
      setActiveCollection,
      createNewCollection,
    }),
    [collections, activeCollection, sets, isInitializing, isSwitchingCollection, error, collectionsError, collectionsEverLoaded, setsError, setActiveCollection, createNewCollection]
  );

  return (
    <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>
  );
}

export function useCollection(): CollectionContextValue {
  const context = useContext(CollectionContext);
  if (!context) {
    throw new Error('useCollection must be used within a CollectionProvider');
  }
  return context;
}
