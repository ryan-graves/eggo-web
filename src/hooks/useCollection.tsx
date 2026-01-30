'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  loading: boolean;
  setsLoading: boolean;
  error: string | null;
  setActiveCollection: (collection: Collection) => void;
  createNewCollection: (name: string, owners: string[]) => Promise<string>;
}

const CollectionContext = createContext<CollectionContextValue | null>(null);

interface CollectionProviderProps {
  children: ReactNode;
}

export function CollectionProvider({ children }: CollectionProviderProps): React.JSX.Element {
  const { user } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeCollection, setActiveCollectionState] = useState<Collection | null>(null);
  const [sets, setSets] = useState<LegoSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [setsLoading, setSetsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to user's collections
  useEffect(() => {
    // No user - reset state immediately (valid synchronous update for auth state change)
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Resetting state on logout is intentional
      setLoading(false);
      setSetsLoading(false);
      setCollections([]);
      setActiveCollectionState(null);
      setSets([]);
      return;
    }

    setLoading(true);
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

      setLoading(false);
    });

    // Cleanup: unsubscribe and reset state when user changes
    return () => {
      unsubscribe();
      setCollections([]);
      setActiveCollectionState(null);
      setSets([]);
    };
  }, [user]);

  // Subscribe to sets for active collection
  useEffect(() => {
    if (!activeCollection) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Resetting loading state when no collection is intentional
      setSetsLoading(false);
      return;
    }

    setSetsLoading(true);
    const unsubscribe = subscribeToSetsForCollection(activeCollection.id, (collectionSets) => {
      setSets(collectionSets);
      setSetsLoading(false);
    });

    return () => {
      unsubscribe();
      setSets([]);
    };
  }, [activeCollection]);

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

  const value = useMemo(
    () => ({
      collections,
      activeCollection,
      sets,
      loading,
      setsLoading,
      error,
      setActiveCollection,
      createNewCollection,
    }),
    [collections, activeCollection, sets, loading, setsLoading, error, setActiveCollection, createNewCollection]
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
