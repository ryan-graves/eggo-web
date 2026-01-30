import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Timestamp } from 'firebase/firestore';
import { SetCard } from './SetCard';
import type { LegoSet } from '@/types';

const mockSet: LegoSet = {
  id: 'set-1',
  collectionId: 'collection-1',
  setNumber: '75192',
  name: 'Millennium Falcon',
  pieceCount: 7541,
  year: 2017,
  theme: 'Star Wars',
  subtheme: 'Ultimate Collector Series',
  imageUrl: 'https://cdn.rebrickable.com/media/sets/75192-1/55843.jpg',
  status: 'assembled',
  hasBeenAssembled: true,
  occasion: 'Birthday',
  dateReceived: '2020-01-01',
  owners: ['Ryan'],
  dataSource: 'rebrickable',
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
};

const meta: Meta<typeof SetCard> = {
  title: 'Components/SetCard',
  component: SetCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    set: mockSet,
  },
};

export const Unopened: Story = {
  args: {
    set: {
      ...mockSet,
      status: 'unopened',
      hasBeenAssembled: false,
    },
  },
};

export const InProgress: Story = {
  args: {
    set: {
      ...mockSet,
      status: 'in_progress',
    },
  },
};

export const RebuildInProgress: Story = {
  args: {
    set: {
      ...mockSet,
      status: 'rebuild_in_progress',
    },
  },
};

export const Disassembled: Story = {
  args: {
    set: {
      ...mockSet,
      status: 'disassembled',
    },
  },
};

export const NoImage: Story = {
  args: {
    set: {
      ...mockSet,
      imageUrl: null,
    },
  },
};

export const NoOwner: Story = {
  args: {
    set: {
      ...mockSet,
      owners: [],
    },
  },
};

export const MultipleOwners: Story = {
  args: {
    set: {
      ...mockSet,
      owners: ['Ryan', 'Alyssa'],
    },
  },
};

export const SmallSet: Story = {
  args: {
    set: {
      ...mockSet,
      setNumber: '30654',
      name: 'X-wing Starfighter',
      pieceCount: 87,
      year: 2023,
      theme: 'Star Wars',
      subtheme: null,
    },
  },
};
