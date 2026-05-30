'use client';

import { useCallback } from 'react';
import { useCollection } from '@/hooks/useCollection';
import { CollectionHome } from '@/components/CollectionHome';
import { updateCollectionHomeSections } from '@/lib/supabase';
import type { HomeSectionConfig } from '@/types';

export default function CollectionPage(): React.JSX.Element | null {
  const { activeCollection, sets } = useCollection();
  const collectionId = activeCollection?.id;

  const handleSaveSections = useCallback(
    (sections: HomeSectionConfig[]): void => {
      if (!collectionId) return;
      updateCollectionHomeSections(collectionId, sections).catch(console.error);
    },
    [collectionId]
  );

  if (!activeCollection) {
    return null;
  }

  return (
    <CollectionHome
      sets={sets}
      sections={activeCollection.homeSections}
      onSaveSections={handleSaveSections}
    />
  );
}
