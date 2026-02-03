'use client';

import type { ReactNode } from 'react';

interface CollectionLayoutProps {
  children: ReactNode;
  modal: ReactNode;
}

export default function CollectionLayout({ children, modal }: CollectionLayoutProps): React.JSX.Element {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
