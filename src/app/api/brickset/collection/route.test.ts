/**
 * @jest-environment node
 */
import { POST } from './route';
import { BricksetApiError } from '@/lib/providers/bricksetCollection';
import { BricksetThrottleError } from '@/lib/providers/bricksetThrottle';

const mockVerifyAuthToken = jest.fn();
const mockIsAdminConfigured = jest.fn();
const mockLogin = jest.fn();
const mockFetchOwned = jest.fn();
const mockTakeSlot = jest.fn();
const mockIsLinkConfigured = jest.fn();
const mockGetLink = jest.fn();
const mockSaveLink = jest.fn();
const mockDeleteLink = jest.fn();
const mockMarkSynced = jest.fn();

jest.mock('@/lib/supabase/admin', () => ({
  verifyAuthToken: (...args: unknown[]) => mockVerifyAuthToken(...args),
  isAdminConfigured: () => mockIsAdminConfigured(),
}));

jest.mock('@/lib/supabase/bricksetLinks', () => ({
  isBricksetLinkConfigured: () => mockIsLinkConfigured(),
  getBricksetLink: (...args: unknown[]) => mockGetLink(...args),
  saveBricksetLink: (...args: unknown[]) => mockSaveLink(...args),
  deleteBricksetLink: (...args: unknown[]) => mockDeleteLink(...args),
  markBricksetLinkSynced: (...args: unknown[]) => mockMarkSynced(...args),
}));

jest.mock('@/lib/providers/bricksetThrottle', () => {
  const actual = jest.requireActual('@/lib/providers/bricksetThrottle');
  return {
    BricksetThrottleError: actual.BricksetThrottleError,
    takeBricksetRequestSlot: (...args: unknown[]) => mockTakeSlot(...args),
  };
});

jest.mock('@/lib/providers/bricksetCollection', () => {
  const actual = jest.requireActual('@/lib/providers/bricksetCollection');
  return {
    BricksetApiError: actual.BricksetApiError,
    loginToBrickset: (...args: unknown[]) => mockLogin(...args),
    fetchBricksetOwnedSets: (...args: unknown[]) => mockFetchOwned(...args),
  };
});

function postRequest(
  body: unknown,
  token: string | null = 'jwt-123',
  extraHeaders: Record<string, string> = {}
): Request {
  return new Request('http://localhost:3000/api/brickset/collection', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const ORIGINAL_ENV = process.env;
const VALID_BODY = { username: 'brickfan', password: 'hunter2' };
const OWNED = [{ bricksetSetId: 1, setNumber: '10300', sourceId: '10300-1', name: 'DeLorean' }];

describe('POST /api/brickset/collection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env = { ...ORIGINAL_ENV, BRICKSET_API_KEY: 'bs-key' };
    mockIsAdminConfigured.mockReturnValue(true);
    mockIsLinkConfigured.mockReturnValue(true);
    mockVerifyAuthToken.mockResolvedValue({ uid: 'user-1', email: 'a@b.c' });
    mockTakeSlot.mockResolvedValue(undefined);
    mockLogin.mockResolvedValue('hash-abc');
    mockFetchOwned.mockResolvedValue(OWNED);
    mockGetLink.mockResolvedValue(null);
    mockSaveLink.mockResolvedValue(undefined);
    mockDeleteLink.mockResolvedValue(undefined);
    mockMarkSynced.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.restoreAllMocks();
  });

  describe('gatekeeping', () => {
    it('503s when the Brickset key is missing without touching Brickset', async () => {
      delete process.env.BRICKSET_API_KEY;
      const res = await POST(postRequest(VALID_BODY) as never);
      expect(res.status).toBe(503);
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('503s when the admin client is not configured', async () => {
      mockIsAdminConfigured.mockReturnValue(false);
      const res = await POST(postRequest(VALID_BODY) as never);
      expect(res.status).toBe(503);
    });

    it('401s when the caller is not signed in to Eggo', async () => {
      mockVerifyAuthToken.mockResolvedValue(null);
      const res = await POST(postRequest(VALID_BODY, null) as never);
      expect(res.status).toBe(401);
      expect(await res.json()).toMatchObject({ code: 'unauthorized' });
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('400s on a malformed JSON body', async () => {
      const res = await POST(postRequest('{not json') as never);
      expect(res.status).toBe(400);
    });

    it.each([
      ['missing username', { password: 'x' }],
      ['blank username', { username: '   ', password: 'x' }],
      ['missing password', { username: 'x' }],
      ['non-string password', { username: 'x', password: 42 }],
      ['oversized username', { username: 'a'.repeat(201), password: 'x' }],
    ])('400s on %s', async (_label, body) => {
      const res = await POST(postRequest(body) as never);
      expect(res.status).toBe(400);
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('rejects an oversized body before parsing it', async () => {
      const res = await POST(
        postRequest(VALID_BODY, 'jwt-123', { 'content-length': String(10_000) }) as never
      );
      expect(res.status).toBe(413);
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  describe('signing in with credentials', () => {
    it('logs in, fetches owned sets, and returns them with the trimmed username', async () => {
      const res = await POST(
        postRequest({ username: '  brickfan ', password: 'hunter2' }) as never
      );

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ username: 'brickfan', sets: OWNED, linked: false });
      expect(mockLogin).toHaveBeenCalledWith('bs-key', 'brickfan', 'hunter2');
      expect(mockFetchOwned).toHaveBeenCalledWith('bs-key', 'hash-abc');
      expect(mockSaveLink).not.toHaveBeenCalled();
    });

    it('takes a login slot before signing in and a fetch slot before reading', async () => {
      await POST(postRequest(VALID_BODY) as never);
      expect(mockTakeSlot.mock.calls).toEqual([
        ['user-1', 'login'],
        ['user-1', 'fetch'],
      ]);
      expect(mockTakeSlot.mock.invocationCallOrder[0]).toBeLessThan(
        mockLogin.mock.invocationCallOrder[0]
      );
    });

    it('429s with a code when the user is over the sign-in limit, without calling Brickset', async () => {
      mockTakeSlot.mockRejectedValueOnce(new BricksetThrottleError('login'));
      const res = await POST(postRequest(VALID_BODY) as never);
      expect(res.status).toBe(429);
      expect(await res.json()).toMatchObject({ code: 'too_many_requests' });
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('remembers the account when asked and linking is available', async () => {
      const res = await POST(postRequest({ ...VALID_BODY, remember: true }) as never);
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ linked: true });
      expect(mockSaveLink).toHaveBeenCalledWith('user-1', 'brickfan', 'hash-abc');
    });

    it('does not remember the account when linking is not configured', async () => {
      mockIsLinkConfigured.mockReturnValue(false);
      const res = await POST(postRequest({ ...VALID_BODY, remember: true }) as never);
      expect(await res.json()).toMatchObject({ linked: false });
      expect(mockSaveLink).not.toHaveBeenCalled();
    });

    it('ignores a non-boolean remember value', async () => {
      await POST(postRequest({ ...VALID_BODY, remember: 'yes' }) as never);
      expect(mockSaveLink).not.toHaveBeenCalled();
    });

    it('maps invalid Brickset credentials to 422, keeping 401 for Eggo auth', async () => {
      mockLogin.mockRejectedValue(new BricksetApiError('invalid_credentials', 'nope'));
      const res = await POST(postRequest(VALID_BODY) as never);
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual({ error: 'nope', code: 'invalid_credentials' });
    });

    it('maps a Brickset daily limit to 429', async () => {
      mockFetchOwned.mockRejectedValue(new BricksetApiError('rate_limited', 'limit'));
      const res = await POST(postRequest(VALID_BODY) as never);
      expect(res.status).toBe(429);
      expect(await res.json()).toMatchObject({ code: 'rate_limited' });
    });

    it('maps other Brickset failures to 502', async () => {
      mockLogin.mockRejectedValue(new BricksetApiError('upstream', 'boom'));
      const res = await POST(postRequest(VALID_BODY) as never);
      expect(res.status).toBe(502);
    });

    it('never echoes the password or hash in an error response or the server log', async () => {
      mockLogin.mockRejectedValue(new Error('unexpected'));
      const res = await POST(postRequest(VALID_BODY) as never);
      expect(res.status).toBe(502);
      const text = JSON.stringify(await res.json());
      expect(text).not.toContain('hunter2');
      expect(text).not.toContain('hash-abc');
      const logged = (console.error as jest.Mock).mock.calls.flat().map(String).join(' ');
      expect(logged).not.toContain('hunter2');
      expect(logged).not.toContain('brickfan');
    });

    it('logs only the error code for a Brickset failure', async () => {
      mockFetchOwned.mockRejectedValue(new BricksetApiError('rate_limited', 'limit hit'));
      await POST(postRequest(VALID_BODY) as never);
      const logged = (console.error as jest.Mock).mock.calls.flat().map(String).join(' ');
      expect(logged).toContain('rate_limited');
      expect(logged).not.toContain('hash-abc');
    });
  });

  describe('using the remembered account', () => {
    const LINK = {
      username: 'brickfan',
      userHash: 'hash-saved',
      linkedAt: '2026-11-01T00:00:00Z',
      lastSyncedAt: null,
    };

    it('fetches with the saved hash without logging in, and records the sync', async () => {
      mockGetLink.mockResolvedValue(LINK);
      const res = await POST(postRequest({ useLink: true }) as never);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ username: 'brickfan', sets: OWNED, linked: true });
      expect(mockLogin).not.toHaveBeenCalled();
      expect(mockFetchOwned).toHaveBeenCalledWith('bs-key', 'hash-saved');
      expect(mockTakeSlot.mock.calls).toEqual([['user-1', 'fetch']]);
      expect(mockMarkSynced).toHaveBeenCalledWith('user-1');
    });

    it('404s with not_linked when there is no saved account', async () => {
      const res = await POST(postRequest({ useLink: true }) as never);
      expect(res.status).toBe(404);
      expect(await res.json()).toMatchObject({ code: 'not_linked' });
      expect(mockFetchOwned).not.toHaveBeenCalled();
    });

    it('503s when linking is not configured on this deployment', async () => {
      mockIsLinkConfigured.mockReturnValue(false);
      const res = await POST(postRequest({ useLink: true }) as never);
      expect(res.status).toBe(503);
      expect(mockGetLink).not.toHaveBeenCalled();
    });

    it('drops the link and answers link_expired when Brickset rejects the saved hash', async () => {
      mockGetLink.mockResolvedValue(LINK);
      mockFetchOwned.mockRejectedValue(new BricksetApiError('invalid_user_hash', 'stale'));
      const res = await POST(postRequest({ useLink: true }) as never);

      expect(res.status).toBe(409);
      expect(await res.json()).toMatchObject({ code: 'link_expired' });
      expect(mockDeleteLink).toHaveBeenCalledWith('user-1');
      expect(mockMarkSynced).not.toHaveBeenCalled();
    });

    it('does not drop the link on an unrelated Brickset failure', async () => {
      mockGetLink.mockResolvedValue(LINK);
      mockFetchOwned.mockRejectedValue(new BricksetApiError('upstream', 'down'));
      const res = await POST(postRequest({ useLink: true }) as never);
      expect(res.status).toBe(502);
      expect(mockDeleteLink).not.toHaveBeenCalled();
    });

    it('429s when the user is over the fetch limit', async () => {
      mockGetLink.mockResolvedValue(LINK);
      mockTakeSlot.mockRejectedValueOnce(new BricksetThrottleError('fetch'));
      const res = await POST(postRequest({ useLink: true }) as never);
      expect(res.status).toBe(429);
      expect(mockFetchOwned).not.toHaveBeenCalled();
    });

    it('ignores credentials sent alongside useLink', async () => {
      mockGetLink.mockResolvedValue(LINK);
      await POST(postRequest({ useLink: true, ...VALID_BODY }) as never);
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });
});
