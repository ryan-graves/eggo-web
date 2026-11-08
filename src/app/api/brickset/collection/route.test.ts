/**
 * @jest-environment node
 */
import { POST } from './route';
import { BricksetApiError } from '@/lib/providers/bricksetCollection';

const mockVerifyAuthToken = jest.fn();
const mockIsAdminConfigured = jest.fn();
const mockLogin = jest.fn();
const mockFetchOwned = jest.fn();

jest.mock('@/lib/supabase/admin', () => ({
  verifyAuthToken: (...args: unknown[]) => mockVerifyAuthToken(...args),
  isAdminConfigured: () => mockIsAdminConfigured(),
}));

jest.mock('@/lib/providers/bricksetCollection', () => {
  const actual = jest.requireActual('@/lib/providers/bricksetCollection');
  return {
    BricksetApiError: actual.BricksetApiError,
    loginToBrickset: (...args: unknown[]) => mockLogin(...args),
    fetchBricksetOwnedSets: (...args: unknown[]) => mockFetchOwned(...args),
  };
});

function postRequest(body: unknown, token: string | null = 'jwt-123'): Request {
  return new Request('http://localhost:3000/api/brickset/collection', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const ORIGINAL_ENV = process.env;
const VALID_BODY = { username: 'brickfan', password: 'hunter2' };

describe('POST /api/brickset/collection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env = { ...ORIGINAL_ENV, BRICKSET_API_KEY: 'bs-key' };
    mockIsAdminConfigured.mockReturnValue(true);
    mockVerifyAuthToken.mockResolvedValue({ uid: 'user-1', email: 'a@b.c' });
    mockLogin.mockResolvedValue('hash-abc');
    mockFetchOwned.mockResolvedValue([]);
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.restoreAllMocks();
  });

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

  it('logs in, fetches owned sets, and returns them with the trimmed username', async () => {
    const owned = [{ bricksetSetId: 1, setNumber: '10300', sourceId: '10300-1', name: 'DeLorean' }];
    mockFetchOwned.mockResolvedValue(owned);

    const res = await POST(postRequest({ username: '  brickfan ', password: 'hunter2' }) as never);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ username: 'brickfan', sets: owned });
    expect(mockLogin).toHaveBeenCalledWith('bs-key', 'brickfan', 'hunter2');
    expect(mockFetchOwned).toHaveBeenCalledWith('bs-key', 'hash-abc');
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

  it('rejects an oversized body before parsing it', async () => {
    const req = new Request('http://localhost:3000/api/brickset/collection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-123',
        'content-length': String(10_000),
      },
      body: JSON.stringify(VALID_BODY),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(413);
    expect(mockLogin).not.toHaveBeenCalled();
  });
});
