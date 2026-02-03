'use client';

import { useParams } from 'next/navigation';
import { SetDetailModal } from '@/components/SetDetailModal';

export default function SetDetailModalPage(): React.JSX.Element {
  const params = useParams();
  const setId = params.setId as string;

  return <SetDetailModal setId={setId} />;
}
