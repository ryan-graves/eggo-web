import { render, screen } from '@testing-library/react';
import SetDetailPage from './page';
import { useCollection } from '@/hooks/useCollection';
import type { LegoSet } from '@/types';

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'set-1' }),
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn(), back: jest.fn() }),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: function MockImage({ src, alt }: { src: string; alt: string }) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} />;
  },
}));

jest.mock('@/hooks/useCollection', () => ({ useCollection: jest.fn() }));

const mockUseCollection = useCollection as jest.MockedFunction<typeof useCollection>;

function makeSet(setNumber: string, dataSourceId?: string): LegoSet {
  return {
    id: 'set-1',
    collectionId: 'collection-1',
    setNumber,
    dataSourceId,
    name: 'Millennium Falcon',
    pieceCount: 7541,
    year: 2017,
    theme: 'Star Wars',
    subtheme: null,
    imageUrl: null,
    status: 'assembled',
    hasBeenAssembled: true,
    dateReceived: null,
    owners: ['Ryan'],
    dataSource: 'brickset',
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
  };
}

function renderWithSet(set: LegoSet): void {
  mockUseCollection.mockReturnValue({
    sets: [set],
    isInitializing: false,
    isSwitchingCollection: false,
  } as unknown as ReturnType<typeof useCollection>);
  render(<SetDetailPage />);
}

describe('SetDetailPage Brickset link', () => {
  it('links to the set on Brickset in a new tab', () => {
    renderWithSet(makeSet('75192-1'));

    const link = screen.getByRole('link', { name: 'View on Brickset (opens in a new tab)' });
    expect(link).toHaveAttribute('href', 'https://brickset.com/sets/75192-1');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('uses the provider id so a variant set links to its own page', () => {
    // Both providers store the display number without the variant and keep
    // "number-variant" in dataSourceId.
    renderWithSet(makeSet('6075', '6075-2'));

    expect(
      screen.getByRole('link', { name: 'View on Brickset (opens in a new tab)' })
    ).toHaveAttribute('href', 'https://brickset.com/sets/6075-2');
  });

  it('adds the -1 variant suffix when the stored number lacks one', () => {
    renderWithSet(makeSet('75192'));

    expect(
      screen.getByRole('link', { name: 'View on Brickset (opens in a new tab)' })
    ).toHaveAttribute('href', 'https://brickset.com/sets/75192-1');
  });
});
