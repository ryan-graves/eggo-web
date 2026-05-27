/**
 * Regression tests for the membership-gated set reads added for issue
 * #58. The gate is now an RLS-bound probe of `collection_members`
 * (not the prior `is_collection_member` RPC, which was spoofable by
 * passing a known member's uid — see PR #59 Copilot review). These
 * tests pin the structural guarantee that a future refactor can't
 * silently drop the membership probe or revert to a spoofable RPC.
 */

import { findSetsByNumber, getSetsForCollection } from './sets';

function makeChainMock() {
  const calls: { method: string; args: unknown[] }[] = [];
  // The membership probe terminates with `.maybeSingle()`; the set
  // fetch terminates with `.order()`. Each leg of the chain gets its
  // own resolved value so we can simulate "non-member" without
  // affecting the unrelated set-fetch resolution.
  let membershipResolved: unknown = { data: { id: 'membership-row' }, error: null };
  let setsResolved: unknown = { data: [], error: null };

  const proxy: Record<string, unknown> = {};
  const handler = (method: string) => (...args: unknown[]) => {
    calls.push({ method, args });
    if (method === 'maybeSingle') return Promise.resolve(membershipResolved);
    if (method === 'order') return Promise.resolve(setsResolved);
    return proxy;
  };
  for (const m of ['from', 'select', 'eq', 'limit', 'maybeSingle', 'order']) {
    proxy[m] = handler(m);
  }

  return {
    proxy,
    calls,
    __resolveMembership(value: unknown) {
      membershipResolved = value;
    },
    __resolveSets(value: unknown) {
      setsResolved = value;
    },
  };
}

const mock = makeChainMock();

jest.mock('./client', () => ({
  getSupabaseClient: () => mock.proxy,
}));

beforeEach(() => {
  mock.calls.length = 0;
  mock.__resolveMembership({ data: { id: 'membership-row' }, error: null });
  mock.__resolveSets({ data: [], error: null });
});

describe('getSetsForCollection', () => {
  it('probes collection_members (RLS-bound) before the set fetch when userId is provided', async () => {
    await getSetsForCollection('coll-1', 'user-abc');

    const fromCalls = mock.calls.filter((c) => c.method === 'from');
    expect(fromCalls.map((c) => c.args[0])).toEqual(['collection_members', 'sets']);

    // The membership probe is by collection_id only — the gate
    // derives from the JWT via RLS, NOT from the caller-supplied
    // userId. If a future refactor adds `.eq('user_id', userId)`, it
    // reintroduces the spoofing surface the RPC had.
    const eqCalls = mock.calls.filter((c) => c.method === 'eq');
    expect(eqCalls).toEqual([
      { method: 'eq', args: ['collection_id', 'coll-1'] }, // membership probe
      { method: 'eq', args: ['collection_id', 'coll-1'] }, // set fetch
    ]);

    // Explicitly verify nobody slipped the spoofable RPC back in.
    expect(mock.calls.find((c) => c.method === 'rpc')).toBeUndefined();
  });

  it('returns [] and skips the set fetch when the membership probe returns null (non-member)', async () => {
    mock.__resolveMembership({ data: null, error: null });

    const result = await getSetsForCollection('coll-1', 'user-abc');

    expect(result).toEqual([]);
    const fromCalls = mock.calls.filter((c) => c.method === 'from');
    expect(fromCalls.map((c) => c.args[0])).toEqual(['collection_members']);
  });

  it('skips the membership probe when userId is omitted (share-flow path)', async () => {
    await getSetsForCollection('coll-1');

    const fromCalls = mock.calls.filter((c) => c.method === 'from');
    expect(fromCalls.map((c) => c.args[0])).toEqual(['sets']);
  });
});

describe('findSetsByNumber', () => {
  it('runs the same RLS-bound short-circuit when userId is provided', async () => {
    mock.__resolveMembership({ data: null, error: null });

    const result = await findSetsByNumber('coll-1', '75192', 'user-abc');

    expect(result).toEqual([]);
    const fromCalls = mock.calls.filter((c) => c.method === 'from');
    expect(fromCalls.map((c) => c.args[0])).toEqual(['collection_members']);
  });
});
