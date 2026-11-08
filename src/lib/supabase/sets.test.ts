/**
 * Regression tests for the membership-gated set reads added for issue
 * #58. The gate is now an RLS-bound probe of `collection_members`
 * (not the prior `is_collection_member` RPC, which was spoofable by
 * passing a known member's uid — see PR #59 Copilot review). These
 * tests pin the structural guarantee that a future refactor can't
 * silently drop the membership probe or revert to a spoofable RPC.
 */

import { getSupabaseClient } from './client';
import { findSetsByNumber, getSetsForCollection, updateSet } from './sets';

function makeChainMock() {
  const calls: { method: string; args: unknown[] }[] = [];
  // The membership probe and `updateSet`'s row check both terminate with
  // `.maybeSingle()`; the set fetch terminates with `.order()`. Each leg
  // of the chain gets its own resolved value so we can simulate
  // "non-member" or "no row updated" without affecting the unrelated
  // set-fetch resolution.
  let maybeSingleResolved: unknown = { data: { id: 'membership-row' }, error: null };
  let setsResolved: unknown = { data: [], error: null };

  const proxy: Record<string, unknown> = {};
  const handler = (method: string) => (...args: unknown[]) => {
    calls.push({ method, args });
    if (method === 'maybeSingle') return Promise.resolve(maybeSingleResolved);
    if (method === 'order') return Promise.resolve(setsResolved);
    return proxy;
  };
  // `rpc` is listed even though no production path calls it — the
  // negative assertion in `getSetsForCollection`'s test (no `.rpc`
  // calls) would otherwise fail with a confusing TypeError if rpc
  // were reintroduced. With it in the proxy, the call is recorded
  // and `expect(...).toBeUndefined()` fires with a clear message.
  for (const m of ['from', 'select', 'eq', 'limit', 'maybeSingle', 'order', 'rpc', 'update']) {
    proxy[m] = handler(m);
  }

  return {
    proxy,
    calls,
    __resolveMaybeSingle(value: unknown) {
      maybeSingleResolved = value;
    },
    __resolveSets(value: unknown) {
      setsResolved = value;
    },
  };
}

// Self-contained factory — captures nothing from outer scope, so the
// hoisting order of jest.mock vs the `mock` const declaration below
// can't trigger a TDZ on `mock` if a future refactor of ./sets calls
// getSupabaseClient at module-init time. The proxy gets wired up via
// mockReturnValue in beforeEach.
jest.mock('./client', () => ({
  getSupabaseClient: jest.fn(),
}));

const mock = makeChainMock();

beforeEach(() => {
  mock.calls.length = 0;
  mock.__resolveMaybeSingle({ data: { id: 'membership-row' }, error: null });
  mock.__resolveSets({ data: [], error: null });
  (getSupabaseClient as jest.Mock).mockReturnValue(mock.proxy);
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
    mock.__resolveMaybeSingle({ data: null, error: null });

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
    mock.__resolveMaybeSingle({ data: null, error: null });

    const result = await findSetsByNumber('coll-1', '75192', 'user-abc');

    expect(result).toEqual([]);
    const fromCalls = mock.calls.filter((c) => c.method === 'from');
    expect(fromCalls.map((c) => c.args[0])).toEqual(['collection_members']);
  });
});

describe('updateSet', () => {
  it('writes collection_id alongside other columns and confirms a row came back', async () => {
    mock.__resolveMaybeSingle({ data: { id: 'set-1' }, error: null });

    await updateSet('set-1', { collectionId: 'coll-2', owners: ['Alyssa'] });

    expect(mock.calls.find((c) => c.method === 'update')).toEqual({
      method: 'update',
      args: [{ collection_id: 'coll-2', owners: ['Alyssa'] }],
    });
    expect(mock.calls.find((c) => c.method === 'eq')).toEqual({
      method: 'eq',
      args: ['id', 'set-1'],
    });
    // The row check is what turns an RLS-hidden row into a visible failure.
    expect(mock.calls.map((c) => c.method)).toEqual(
      expect.arrayContaining(['select', 'maybeSingle'])
    );
  });

  it('throws when the update matched no row (deleted, or RLS hid it)', async () => {
    mock.__resolveMaybeSingle({ data: null, error: null });

    await expect(updateSet('set-1', { name: 'Renamed' })).rejects.toThrow(
      /no longer have access/
    );
  });

  it('surfaces a Postgres error (e.g. WITH CHECK on the destination collection)', async () => {
    mock.__resolveMaybeSingle({
      data: null,
      error: { message: 'new row violates row-level security policy for table "sets"' },
    });

    await expect(updateSet('set-1', { collectionId: 'coll-not-mine' })).rejects.toThrow(
      /row-level security/
    );
  });

  it('skips the request entirely for an empty update', async () => {
    await updateSet('set-1', {});

    expect(mock.calls).toEqual([]);
  });
});
