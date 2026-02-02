'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getCollectionByShareToken, getSetsForCollection } from '@/lib/firebase';
import type { Collection, LegoSet } from '@/types';

interface PublicCollectionContextValue {
  collection: Collection | null;
  sets: LegoSet[];
  isLoading: boolean;
  error: string | null;
  shareToken: string;
}

const PublicCollectionContext = createContext<PublicCollectionContextValue | null>(null);

interface PublicCollectionProviderProps {
  shareToken: string;
  children: ReactNode;
}

export function PublicCollectionProvider({
  shareToken,
  children,
}: PublicCollectionProviderProps): React.JSX.Element {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [sets, setSets] = useState<LegoSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPublicCollection() {
      setIsLoading(true);
      setError(null);

      try {
        const publicCollection = await getCollectionByShareToken(shareToken);

        if (cancelled) return;

        if (!publicCollection) {
          setError('Collection not found or is no longer public');
          setIsLoading(false);
          return;
        }

        setCollection(publicCollection);

        const collectionSets = await getSetsForCollection(publicCollection.id);

        if (cancelled) return;

        setSets(collectionSets);
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load collection');
        setIsLoading(false);
      }
    }

    loadPublicCollection();

    return () => {
      cancelled = true;
    };
  }, [shareToken]);

  const value = useMemo(
    () => ({
      collection,
      sets,
      isLoading,
      error,
      shareToken,
    }),
    [collection, sets, isLoading, error, shareToken]
  );

  return (
    <PublicCollectionContext.Provider value={value}>{children}</PublicCollectionContext.Provider>
  );
}

export function usePublicCollection(): PublicCollectionContextValue {
  const context = useContext(PublicCollectionContext);
  if (!context) {
    throw new Error('usePublicCollection must be used within a PublicCollectionProvider');
  }
  return context;
}
