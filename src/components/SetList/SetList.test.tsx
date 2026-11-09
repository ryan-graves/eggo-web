import { fireEvent, render, screen } from '@testing-library/react';
import { SetList } from './SetList';
import { ALL_SETS_QUERY_KEY } from '@/hooks/useNavigation';
import type { LegoSet } from '@/types';

let mockPathname = '/all';
let mockSearch = '';

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

jest.mock('@/components/SetCard', () => ({
  SetCard: ({ set }: { set: LegoSet }) => <article>{set.name}</article>,
}));

jest.mock('@/components/FilterSheet', () => ({
  FilterSheet: () => null,
}));

function makeSet(overrides: Partial<LegoSet>): LegoSet {
  return {
    id: 'set-1',
    collectionId: 'collection-1',
    setNumber: '10001',
    name: 'Set',
    pieceCount: 100,
    year: 2020,
    theme: 'City',
    subtheme: null,
    imageUrl: 'https://example.com/set.jpg',
    status: 'assembled',
    hasBeenAssembled: true,
    dateReceived: '2020-01-01',
    owners: ['Ryan'],
    dataSource: 'brickset',
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const sets: LegoSet[] = [
  makeSet({
    id: 'a',
    setNumber: '10001',
    name: 'Apple Orchard',
    pieceCount: 300,
    dateReceived: '2021-01-01',
    owners: ['Ryan'],
    status: 'assembled',
  }),
  makeSet({
    id: 'b',
    setNumber: '10002',
    name: 'Boat House',
    pieceCount: 100,
    dateReceived: '2022-01-01',
    owners: ['Alyssa'],
    status: 'unopened',
  }),
  makeSet({
    id: 'c',
    setNumber: '10003',
    name: 'Castle Keep',
    pieceCount: 200,
    dateReceived: '2023-01-01',
    owners: ['Ryan'],
    status: 'in_progress',
    theme: 'Castle',
  }),
];

const OWNERS = ['Ryan', 'Alyssa'];

function renderedNames(): string[] {
  return screen.getAllByRole('article').map((el) => el.textContent);
}

function currentUrl(): string {
  return `${window.location.pathname}${window.location.search}`;
}

function renderList(props: Partial<React.ComponentProps<typeof SetList>> = {}) {
  return render(<SetList sets={sets} availableOwners={OWNERS} syncFiltersToUrl {...props} />);
}

describe('SetList URL state', () => {
  beforeEach(() => {
    mockPathname = '/all';
    mockSearch = '';
    sessionStorage.clear();
    window.history.replaceState(null, '', '/all');
  });

  it('defaults to date received, newest first', () => {
    renderList();

    expect(renderedNames()).toEqual(['Castle Keep', 'Boat House', 'Apple Orchard']);
    expect(currentUrl()).toBe('/all');
  });

  it('reads filters and sort from the URL', () => {
    mockSearch = 'owner=Ryan&sort=pieceCount&dir=asc';
    window.history.replaceState(null, '', `/all?${mockSearch}`);

    renderList();

    expect(renderedNames()).toEqual(['Castle Keep', 'Apple Orchard']);
    expect(screen.getByDisplayValue('Ryan')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Piece Count')).toBeInTheDocument();
  });

  it('reads the search query from the URL', () => {
    mockSearch = 'q=boat';

    renderList();

    expect(renderedNames()).toEqual(['Boat House']);
    expect(screen.getAllByPlaceholderText('Search sets...')[0]).toHaveValue('boat');
  });

  it('ignores unknown owners, sort fields, and directions in the URL', () => {
    mockSearch = 'owner=Nobody&sort=bogus&dir=sideways&status=bogus';

    renderList();

    expect(renderedNames()).toEqual(['Castle Keep', 'Boat House', 'Apple Orchard']);
  });

  it('writes every non-default filter to the URL without adding history entries', () => {
    const pushState = jest.spyOn(window.history, 'pushState');
    renderList();

    fireEvent.change(screen.getByDisplayValue('All Owners'), { target: { value: 'Ryan' } });
    fireEvent.change(screen.getByLabelText('Sort'), { target: { value: 'name' } });
    fireEvent.click(screen.getByLabelText('Sort ascending'));
    fireEvent.change(screen.getAllByPlaceholderText('Search sets...')[1], {
      target: { value: 'ap' },
    });

    expect(currentUrl()).toBe('/all?owner=Ryan&q=ap&sort=name&dir=asc');
    expect(renderedNames()).toEqual(['Apple Orchard']);
    expect(pushState).not.toHaveBeenCalled();
    pushState.mockRestore();
  });

  it('drops a filter from the URL when it returns to its default', () => {
    mockSearch = 'status=unopened&theme=City';
    window.history.replaceState(null, '', `/all?${mockSearch}`);
    renderList();

    fireEvent.change(screen.getByDisplayValue('Unopened'), { target: { value: 'all' } });

    expect(currentUrl()).toBe('/all?theme=City');
  });

  it('remembers the last query so a bare /all restores it', () => {
    const { unmount } = renderList();
    fireEvent.change(screen.getByLabelText('Sort'), { target: { value: 'name' } });
    fireEvent.change(screen.getByDisplayValue('All Owners'), { target: { value: 'Alyssa' } });
    expect(sessionStorage.getItem(ALL_SETS_QUERY_KEY)).toBe('owner=Alyssa&sort=name');
    unmount();

    // Coming back via the "All Sets" toggle lands on /all with no query.
    window.history.replaceState(null, '', '/all');
    renderList();

    expect(renderedNames()).toEqual(['Boat House']);
    expect(currentUrl()).toBe('/all?owner=Alyssa&sort=name');
  });

  it('lets a deep link win over the remembered query', () => {
    sessionStorage.setItem(ALL_SETS_QUERY_KEY, 'owner=Alyssa&sort=name');
    mockSearch = 'status=in_progress';
    window.history.replaceState(null, '', `/all?${mockSearch}`);

    renderList();

    expect(renderedNames()).toEqual(['Castle Keep']);
    expect(currentUrl()).toBe('/all?status=in_progress');
    expect(sessionStorage.getItem(ALL_SETS_QUERY_KEY)).toBe('status=in_progress');
  });

  it('clearing every filter forgets the remembered query', () => {
    sessionStorage.setItem(ALL_SETS_QUERY_KEY, 'owner=Alyssa');
    renderList();
    expect(renderedNames()).toEqual(['Boat House']);

    fireEvent.change(screen.getByDisplayValue('Alyssa'), { target: { value: 'all' } });

    expect(currentUrl()).toBe('/all');
    expect(sessionStorage.getItem(ALL_SETS_QUERY_KEY)).toBe('');
  });

  it('leaves the URL and session alone on public share pages', () => {
    mockPathname = '/share/abc123';
    window.history.replaceState(null, '', '/share/abc123');
    sessionStorage.setItem(ALL_SETS_QUERY_KEY, 'owner=Alyssa');

    render(<SetList sets={sets} availableOwners={OWNERS} linkPrefix="/share/abc123/set" />);
    fireEvent.change(screen.getByDisplayValue('All Owners'), { target: { value: 'Ryan' } });

    expect(renderedNames()).toEqual(['Castle Keep', 'Apple Orchard']);
    expect(currentUrl()).toBe('/share/abc123');
    expect(sessionStorage.getItem(ALL_SETS_QUERY_KEY)).toBe('owner=Alyssa');
  });
});
