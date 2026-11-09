import { DISCOVER_COUNT, getSessionShuffleSeed, resolveSection } from './sectionRegistry';
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

    expect(first).toHaveLength(DISCOVER_COUNT);
    expect(ids(second)).toEqual(ids(first));
  });

  it('keeps the other picks in place when one set leaves the pool', () => {
    const before = discover.getSets(pool, 0.42);
    const removed = before[5].id;
    // The order is total, so the first set outside the picks is the one that
    // should slide in at the end.
    const picked = new Set(ids(before));
    const next = discover.getSets(
      pool.filter((s) => !picked.has(s.id)),
      0.42
    )[0];

    const after = discover.getSets(
      pool.filter((s) => s.id !== removed),
      0.42
    );

    expect(ids(after)).toEqual(
      ids(before)
        .filter((id) => id !== removed)
        .concat(next.id)
    );
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
