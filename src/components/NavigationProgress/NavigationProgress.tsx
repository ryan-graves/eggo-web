'use client';

import { useNavigationLoading } from '@/hooks/useNavigationLoading';
import styles from './NavigationProgress.module.css';

export function NavigationProgress(): React.JSX.Element | null {
  const { pendingHref } = useNavigationLoading();

  if (!pendingHref) return null;

  return <div className={styles.bar} />;
}
