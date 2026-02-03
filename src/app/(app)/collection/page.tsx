'use client';

import { useCollection } from '@/hooks/useCollection';
import { CollectionHome } from '@/components/CollectionHome';

export default function CollectionPage(): React.JSX.Element | null {
  const { activeCollection, sets } = useCollection();

  if (!activeCollection) {
    return null;
  }

  return <CollectionHome sets={sets} />;
}
