import { getSessionShuffleSeed, resolveSection } from './sectionRegistry';
import type { LegoSet } from '@/types';

function makeSet(id: string): LegoSet {
  return {
    id,
    collectionId: 'collection-1',
    setNumber: id,
    name: `Set ${id}`,
    pieceCount: 100,
    year: 2020,
    theme: 'City',
    subtheme: null,
    imageUrl: null,
    status: 'unopened',
    hasBeenAssembled: false,
    dateReceived: null,
    owners: [],
    dataSource: 'brickset',
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
  };
}

const pool = Array.from({ length: 40 }, (_, i) => makeSet(`set-${i}`));
const discover = resolveSection({ type: 'discover' })!;
const ids = (sets: LegoSet[]): string[] => sets.map((s) => s.id);

describe('discover section', () => {
  it('returns the same picks for the same seed whatever the input order', () => {
    const first = discover.getSets(pool, 0.42);
    const second = discover.getSets([...pool].reverse(), 0.42);

    expect(first).toHaveLength(24);
    expect(ids(second)).toEqual(ids(first));
  });

  it('keeps the other picks in place when one set leaves the pool', () => {
    const before = discover.getSets(pool, 0.42);
    const removed = before[5].id;

    const after = discover.getSets(
      pool.filter((s) => s.id !== removed),
      0.42
    );

    expect(ids(after)).toEqual(
      ids(before)
        .filter((id) => id !== removed)
        .concat(ids(after).slice(-1))
    );
    expect(ids(after)).not.toContain(removed);
  });

  it('orders differently for a different seed', () => {
    expect(ids(discover.getSets(pool, 0.42))).not.toEqual(ids(discover.getSets(pool, 0.99)));
  });

  it('only picks from unopened and disassembled sets', () => {
    const mixed = [
      { ...makeSet('a'), status: 'assembled' as const },
      { ...makeSet('b'), status: 'disassembled' as const },
      { ...makeSet('c'), status: 'in_progress' as const },
      makeSet('d'),
    ];

    expect(ids(discover.getSets(mixed, 0.42)).sort()).toEqual(['b', 'd']);
  });
});

describe('getSessionShuffleSeed', () => {
  it('returns the same seed for the life of the module', () => {
    const seed = getSessionShuffleSeed();

    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(1);
    expect(getSessionShuffleSeed()).toBe(seed);
  });
});
