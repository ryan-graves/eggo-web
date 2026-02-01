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
  createCollection,
  subscribeToCollectionsForUser,
  subscribeToSetsForCollection,
} from '@/lib/firebase';
import type { Collection, LegoSet } from '@/types';

interface CollectionContextValue {
  collections: Collection[];
  activeCollection: Collection | null;
  sets: LegoSet[];
  /** True only during initial data load, false after first successful load */
  isInitializing: boolean;
  /** True while fetching sets for a new collection (after initial load) */
  isSwitchingCollection: boolean;
  error: string | null;
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

  // Track initialization state separately from loading
  const [collectionsInitialized, setCollectionsInitialized] = useState(false);
  const [setsInitialized, setSetsInitialized] = useState(false);
  const [isSwitchingCollection, setIsSwitchingCollection] = useState(false);

  // Track which collection's sets we currently have loaded
  const loadedCollectionIdRef = useRef<string | null>(null);

  // Subscribe to user's collections
  useEffect(() => {
    // No user - reset state immediately (valid synchronous update for auth state change)
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Resetting state on logout is intentional
      setCollectionsInitialized(false);
      setSetsInitialized(false);
      setCollections([]);
      setActiveCollectionState(null);
      setSets([]);
      loadedCollectionIdRef.current = null;
      return;
    }

    const unsubscribe = subscribeToCollectionsForUser(user.uid, (userCollections) => {
      setCollections(userCollections);

      // Auto-select first collection if none selected
      setActiveCollectionState((current) => {
        if (!current && userCollections.length > 0) {
          return userCollections[0];
        }
        // Clear active collection if it was deleted
        if (current && !userCollections.find((c) => c.id === current.id)) {
          return userCollections[0] || null;
        }
        return current;
      });

      // Mark collections as initialized after first successful load
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
  }, [user]);

  // Subscribe to sets for active collection
  useEffect(() => {
    if (!activeCollection) {
      // No collection selected - clear sets but preserve initialized state
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Resetting state when no collection is intentional
      setSets([]);
      loadedCollectionIdRef.current = null;
      return;
    }

    const isNewCollection = loadedCollectionIdRef.current !== activeCollection.id;

    // Only show switching indicator after initial load and when changing collections
    if (isNewCollection && setsInitialized) {
      setIsSwitchingCollection(true);
    }

    const unsubscribe = subscribeToSetsForCollection(activeCollection.id, (collectionSets) => {
      setSets(collectionSets);
      loadedCollectionIdRef.current = activeCollection.id;
      setSetsInitialized(true);
      setIsSwitchingCollection(false);
    });

    return () => {
      unsubscribe();
      // Don't clear sets on cleanup - keep showing previous data until new data arrives
      // This prevents the flash of empty state when switching collections
    };
  }, [activeCollection, setsInitialized]);

  const setActiveCollection = useCallback((collection: Collection) => {
    setActiveCollectionState(collection);
  }, []);

  const createNewCollection = useCallback(
    async (name: string, owners: string[]): Promise<string> => {
      if (!user) {
        throw new Error('Must be logged in to create a collection');
      }

      setError(null);
      try {
        const collectionId = await createCollection({
          name,
          owners,
          memberUserIds: [user.uid],
        });
        return collectionId;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create collection';
        setError(message);
        throw err;
      }
    },
    [user]
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
      setActiveCollection,
      createNewCollection,
    }),
    [collections, activeCollection, sets, isInitializing, isSwitchingCollection, error, setActiveCollection, createNewCollection]
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
