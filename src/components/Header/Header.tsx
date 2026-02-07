'use client';

import { useBackNavigation } from '@/hooks/useViewTransition';
import { useNavigationLoading } from '@/hooks/useNavigationLoading';
import { LAST_BROWSE_PATH_KEY } from '@/hooks/useViewTransition';
import styles from './Header.module.css';

interface HeaderProps {
  /** Header variant - 'main' shows logo, 'detail' shows back button with title */
  variant?: 'main' | 'detail';
  /** Title text - displayed after back button for 'detail' variant */
  title?: string;
  /** Fallback URL for back navigation (detail variant only) */
  backHref?: string;
  /** Content to render on the left side (main variant: after logo, detail variant: not used) */
  leftContent?: React.ReactNode;
  /** Content to render on the right side */
  rightContent?: React.ReactNode;
}

export function Header({
  variant = 'main',
  title,
  backHref = '/home',
  leftContent,
  rightContent,
}: HeaderProps): React.JSX.Element {
  const { goBack } = useBackNavigation();
  const { pendingHref, startNavigation } = useNavigationLoading();

  const handleBack = (): void => {
    const lastBrowsePath =
      typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(LAST_BROWSE_PATH_KEY) : null;
    startNavigation(lastBrowsePath || backHref);
    goBack(backHref);
  };

  if (variant === 'detail') {
    const isNavigating = pendingHref !== null;

    return (
      <header className={styles.header}>
        <div className={styles.leftSection}>
          <button
            type="button"
            onClick={handleBack}
            className={`${styles.backButton} ${isNavigating ? styles.backButtonLoading : ''}`}
            aria-label="Go back"
            disabled={isNavigating}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M12.5 15L7.5 10L12.5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h1 className={styles.title}>{title}</h1>
        </div>
        {rightContent && <div className={styles.rightContent}>{rightContent}</div>}
      </header>
    );
  }

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        <h1 className={styles.logo}>Eggo</h1>
        {leftContent}
      </div>
      {rightContent && <div className={styles.rightContent}>{rightContent}</div>}
    </header>
  );
}
