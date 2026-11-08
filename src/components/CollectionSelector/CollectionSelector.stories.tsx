import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { CollectionSelector } from './CollectionSelector';
import type { Collection } from '@/types';

function makeCollection(id: string, name: string, owners: string[]): Collection {
  return {
    id,
    name,
    owners,
    memberUserIds: ['user-1'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

const graves = makeCollection('coll-1', 'The Graves Collection', ['Ryan', 'Alyssa']);
const shelf = makeCollection('coll-2', 'Second Shelf', ['Ryan']);
const office = makeCollection('coll-3', 'Office Desk', ['Alyssa']);

interface DemoProps {
  collections: Collection[];
  withSettings?: boolean;
}

// Holds the active collection so switching works inside Storybook.
function CollectionSelectorDemo({
  collections,
  withSettings = true,
}: DemoProps): React.JSX.Element {
  const [active, setActive] = useState<Collection | null>(collections[0] ?? null);
  return (
    <div style={{ minHeight: 240 }}>
      <CollectionSelector
        collections={collections}
        activeCollection={active}
        onSelect={setActive}
        onCreateClick={() => console.log('New collection')}
        onSettingsClick={withSettings ? () => console.log('Settings') : undefined}
      />
    </div>
  );
}

const meta: Meta<typeof CollectionSelectorDemo> = {
  title: 'Components/CollectionSelector',
  component: CollectionSelectorDemo,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof CollectionSelectorDemo>;

export const SingleCollection: Story = {
  args: { collections: [graves] },
};

export const MultipleCollections: Story = {
  args: { collections: [office, shelf, graves] },
};

export const WithoutSettings: Story = {
  args: { collections: [graves], withSettings: false },
};
