/**
 * Regression tests for the membership-scoped read path in collections.ts.
 * Closes the gap flagged during PR #59 review: the security-relevant
 * fix had no automated guard against a future refactor that drops the
 * `.eq('collection_members.user_id', userId)` filter. The tests below
 * snapshot the call sequence on a chained-API mock — if anyone removes
 * the filter or swaps the embed back to the unfiltered variant, these
 * fail loudly.
 *
 * See GitHub issue #58 for the original bug.
 */

import { getCollection, getCollectionsForUser } from './collections';

// Records every `.from / .select / .eq / .order / .maybeSingle` call as a
// flat trace; each method returns the same proxy so calls chain. The
// terminal awaitable (.maybeSingle / .order) resolves to whatever was
// set via `__resolve`.
function makeChainMock() {
  const calls: { method: string; args: unknown[] }[] = [];
  let resolved: unknown = { data: null, error: null };

  const proxy: Record<string, unknown> = {};
  const handler = (method: string) => (...args: unknown[]) => {
    calls.push({ method, args });
    if (method === 'order' || method === 'maybeSingle') {
      return Promise.resolve(resolved);
    }
    return proxy;
  };
  for (const m of ['from', 'select', 'eq', 'order', 'maybeSingle']) {
    proxy[m] = handler(m);
  }

  return {
    proxy,
    calls,
    __resolve(value: unknown) {
      resolved = value;
    },
  };
}

const mock = makeChainMock();

jest.mock('./client', () => ({
  getSupabaseClient: () => mock.proxy,
}));

beforeEach(() => {
  mock.calls.length = 0;
  mock.__resolve({ data: [], error: null });
});

describe('getCollectionsForUser', () => {
  it('filters on collection_members.user_id and uses the !inner select', async () => {
    await getCollectionsForUser('user-abc');

    const select = mock.calls.find((c) => c.method === 'select');
    const eq = mock.calls.find((c) => c.method === 'eq');

    // The !inner modifier is what closes the public-collection leak —
    // collections with no matching member row get dropped at the join.
    expect(select?.args[0]).toContain('collection_members!inner(user_id)');
    expect(eq?.args).toEqual(['collection_members.user_id', 'user-abc']);
  });
});

describe('getCollection', () => {
  beforeEach(() => mock.__resolve({ data: null, error: null }));

  it('applies the membership filter when userId is provided', async () => {
    await getCollection('coll-1', 'user-abc');

    const select = mock.calls.find((c) => c.method === 'select');
    const eqs = mock.calls.filter((c) => c.method === 'eq');

    expect(select?.args[0]).toContain('collection_members!inner(user_id)');
    // Both the id filter and the membership filter should be in the
    // chain when userId is passed.
    expect(eqs).toEqual([
      { method: 'eq', args: ['id', 'coll-1'] },
      { method: 'eq', args: ['collection_members.user_id', 'user-abc'] },
    ]);
  });

  it('skips the membership filter when userId is omitted (share-flow path)', async () => {
    await getCollection('coll-1');

    const select = mock.calls.find((c) => c.method === 'select');
    const eqs = mock.calls.filter((c) => c.method === 'eq');

    // The unfiltered embed — used by share-token / enablePublicSharing
    // paths where the caller is intentionally not a member.
    expect(select?.args[0]).not.toContain('!inner');
    expect(eqs).toEqual([{ method: 'eq', args: ['id', 'coll-1'] }]);
  });
});
