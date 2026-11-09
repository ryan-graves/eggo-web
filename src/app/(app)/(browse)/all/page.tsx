'use client';

import { useCollection } from '@/hooks/useCollection';
import { SetList } from '@/components/SetList';

export default function AllSetsPage(): React.JSX.Element | null {
  const { activeCollection, sets } = useCollection();

  if (!activeCollection) {
    return null;
  }

  // Keyed per collection so a switch re-reads the filters against the new
  // collection's owners and themes (sort and search carry over via the URL).
  return (
    <SetList
      key={activeCollection.id}
      sets={sets}
      availableOwners={activeCollection.owners}
      syncFiltersToUrl
    />
  );
}
