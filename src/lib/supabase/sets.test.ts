/**
 * Regression tests for the membership-gated set reads added for issue
 * #58. The RPC short-circuit (`is_collection_member` returns false →
 * function returns `[]` without ever issuing the set query) is the
 * defense-in-depth layer; these tests pin that behavior so a future
 * refactor can't silently drop the RPC and fall back to RLS-only.
 */

import { findSetsByNumber, getSetsForCollection } from './sets';

function makeChainMock() {
  const calls: { method: string; args: unknown[] }[] = [];
  let queryResolved: unknown = { data: [], error: null };
  let rpcResolved: unknown = { data: true, error: null };

  const proxy: Record<string, unknown> = {};
  const handler = (method: string) => (...args: unknown[]) => {
    calls.push({ method, args });
    if (method === 'rpc') return Promise.resolve(rpcResolved);
    if (method === 'order') return Promise.resolve(queryResolved);
    return proxy;
  };
  for (const m of ['from', 'select', 'eq', 'order', 'rpc']) {
    proxy[m] = handler(m);
  }

  return {
    proxy,
    calls,
    __resolveQuery(value: unknown) {
      queryResolved = value;
    },
    __resolveRpc(value: unknown) {
      rpcResolved = value;
    },
  };
}

const mock = makeChainMock();

jest.mock('./client', () => ({
  getSupabaseClient: () => mock.proxy,
}));

beforeEach(() => {
  mock.calls.length = 0;
  mock.__resolveQuery({ data: [], error: null });
  mock.__resolveRpc({ data: true, error: null });
});

describe('getSetsForCollection', () => {
  it('calls is_collection_member RPC before the set fetch when userId is provided', async () => {
    await getSetsForCollection('coll-1', 'user-abc');

    const rpc = mock.calls.find((c) => c.method === 'rpc');
    expect(rpc).toEqual({
      method: 'rpc',
      args: ['is_collection_member', { coll_id: 'coll-1', uid: 'user-abc' }],
    });

    // RPC came before the set fetch.
    const rpcIdx = mock.calls.findIndex((c) => c.method === 'rpc');
    const fromIdx = mock.calls.findIndex((c) => c.method === 'from');
    expect(rpcIdx).toBeLessThan(fromIdx);
  });

  it('returns [] and skips the set fetch entirely when the RPC says non-member', async () => {
    mock.__resolveRpc({ data: false, error: null });

    const result = await getSetsForCollection('coll-1', 'user-abc');

    expect(result).toEqual([]);
    // No .from() call means the set query never went out.
    expect(mock.calls.find((c) => c.method === 'from')).toBeUndefined();
  });

  it('skips the RPC entirely when userId is omitted (share-flow path)', async () => {
    await getSetsForCollection('coll-1');

    expect(mock.calls.find((c) => c.method === 'rpc')).toBeUndefined();
    expect(mock.calls.find((c) => c.method === 'from')).toEqual({
      method: 'from',
      args: ['sets'],
    });
  });
});

describe('findSetsByNumber', () => {
  it('runs the same RPC short-circuit when userId is provided', async () => {
    mock.__resolveRpc({ data: false, error: null });

    const result = await findSetsByNumber('coll-1', '75192', 'user-abc');

    expect(result).toEqual([]);
    expect(mock.calls.find((c) => c.method === 'from')).toBeUndefined();
  });
});
