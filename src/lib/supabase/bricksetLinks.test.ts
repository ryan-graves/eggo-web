/**
 * @jest-environment node
 */
import { generateSecretKey, parseSecretKey, sealSecret } from '@/lib/crypto/secretBox';
import {
  deleteBricksetLink,
  getBricksetLink,
  getBricksetLinkSummary,
  isBricksetLinkConfigured,
} from './bricksetLinks';

/**
 * A tiny chainable stand-in for the supabase-js query builder: every method
 * returns the builder, and awaiting it resolves to the configured result.
 */
interface BuilderCall {
  method: string;
  args: unknown[];
}

function makeBuilder(result: { data?: unknown; error?: { message: string } | null }) {
  const calls: BuilderCall[] = [];
  const builder: Record<string, unknown> = {};
  for (const method of [
    'select',
    'eq',
    'lt',
    'gte',
    'maybeSingle',
    'delete',
    'insert',
    'upsert',
    'update',
  ]) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  }
  builder.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve({ data: result.data ?? null, error: result.error ?? null }).then(resolve);
  return { builder, calls };
}

const fromMock = jest.fn();
jest.mock('./admin', () => ({
  getAdminClient: () => ({ from: (...args: unknown[]) => fromMock(...args) }),
}));

const ORIGINAL_ENV = process.env;
const KEY_B64 = generateSecretKey();

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...ORIGINAL_ENV, BRICKSET_HASH_KEY: KEY_B64 };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

describe('isBricksetLinkConfigured', () => {
  it('is false when the key is missing or malformed, true for a valid key', () => {
    delete process.env.BRICKSET_HASH_KEY;
    expect(isBricksetLinkConfigured()).toBe(false);
    process.env.BRICKSET_HASH_KEY = 'too-short';
    expect(isBricksetLinkConfigured()).toBe(false);
    process.env.BRICKSET_HASH_KEY = KEY_B64;
    expect(isBricksetLinkConfigured()).toBe(true);
  });
});

describe('getBricksetLink', () => {
  const row = (ciphertext: string) => ({
    user_id: 'user-1',
    brickset_username: 'brickfan',
    user_hash_ciphertext: ciphertext,
    linked_at: '2026-11-01T00:00:00Z',
    last_synced_at: null,
  });

  it('opens the stored hash with the configured key', async () => {
    const sealed = sealSecret('hash-123', parseSecretKey(KEY_B64));
    fromMock.mockReturnValueOnce(makeBuilder({ data: row(sealed) }).builder);

    const link = await getBricksetLink('user-1');

    expect(link).toEqual({
      username: 'brickfan',
      userHash: 'hash-123',
      ciphertext: sealed,
      linkedAt: '2026-11-01T00:00:00Z',
      lastSyncedAt: null,
    });
  });

  it('removes a row sealed under a different key and reports no link', async () => {
    const sealedElsewhere = sealSecret('hash-123', parseSecretKey(generateSecretKey()));
    const read = makeBuilder({ data: row(sealedElsewhere) });
    const del = makeBuilder({});
    fromMock.mockReturnValueOnce(read.builder).mockReturnValueOnce(del.builder);

    const link = await getBricksetLink('user-1');

    expect(link).toBeNull();
    expect(del.calls.map((c) => c.method)).toEqual(['delete', 'eq', 'eq']);
    expect(del.calls[2].args).toEqual(['user_hash_ciphertext', sealedElsewhere]);
  });

  it('returns null when there is no row', async () => {
    fromMock.mockReturnValueOnce(makeBuilder({ data: null }).builder);
    expect(await getBricksetLink('user-1')).toBeNull();
  });

  it('surfaces database errors', async () => {
    fromMock.mockReturnValueOnce(makeBuilder({ error: { message: 'boom' } }).builder);
    await expect(getBricksetLink('user-1')).rejects.toThrow('boom');
  });
});

describe('getBricksetLinkSummary', () => {
  it('never selects the ciphertext column', async () => {
    const read = makeBuilder({
      data: { brickset_username: 'brickfan', linked_at: 'a', last_synced_at: 'b' },
    });
    fromMock.mockReturnValueOnce(read.builder);
    const summary = await getBricksetLinkSummary('user-1');
    expect(summary).toEqual({ username: 'brickfan', linkedAt: 'a', lastSyncedAt: 'b' });
    const selected = read.calls.find((c) => c.method === 'select')?.args[0] as string;
    expect(selected).not.toContain('ciphertext');
  });

  it('works without a usable key', async () => {
    delete process.env.BRICKSET_HASH_KEY;
    fromMock.mockReturnValueOnce(makeBuilder({ data: null }).builder);
    await expect(getBricksetLinkSummary('user-1')).resolves.toBeNull();
  });
});

describe('deleteBricksetLink', () => {
  it('deletes by user only when no ciphertext guard is given', async () => {
    const del = makeBuilder({});
    fromMock.mockReturnValueOnce(del.builder);
    await deleteBricksetLink('user-1');
    expect(del.calls.map((c) => c.method)).toEqual(['delete', 'eq']);
  });
});
