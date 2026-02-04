'use client';

import { useCollection } from '@/hooks/useCollection';
import { SetList } from '@/components/SetList';

export default function AllSetsPage(): React.JSX.Element | null {
  const { activeCollection, sets } = useCollection();

  if (!activeCollection) {
    return null;
  }

  return <SetList sets={sets} availableOwners={activeCollection.owners} />;
}
