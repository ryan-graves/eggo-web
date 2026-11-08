'use client';

import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { CreateCollection } from '@/components/CreateCollection';
import { useCollection } from '@/hooks/useCollection';
import { useNavigation } from '@/hooks/useNavigation';
import styles from './page.module.css';

/**
 * Creates an additional collection. The first-run flow renders
 * `CreateCollection` inline from the browse layout, so this page is
 * normally reached from the header menu once a collection exists; a
 * zero-collection user who lands here by URL just gets the onboarding copy.
 */
export default function NewCollectionPage(): React.JSX.Element {
  const { navigateTo } = useNavigation();
  const { collections, isInitializing } = useCollection();

  const handleCreated = () => {
    toast.success('Collection created');
    // The new collection is active and empty, so its home view (not the last
    // browse path, which belongs to the previous collection) is the landing.
    navigateTo('/home');
  };

  const isFirstCollection = collections.length === 0;

  return (
    <div className={styles.page}>
      <Header variant="detail" title="New Collection" backHref="/home" />

      <main className={styles.main}>
        {isInitializing ? (
          <div className={styles.loading}>Loading…</div>
        ) : (
          <CreateCollection
            compact
            onCreated={handleCreated}
            {...(isFirstCollection
              ? {}
              : {
                  title: 'Start another collection',
                  description: 'It gets its own sets, owners, and share link.',
                })}
          />
        )}
      </main>
    </div>
  );
}
