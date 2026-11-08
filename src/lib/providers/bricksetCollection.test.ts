/**
 * @jest-environment node
 */
import { BricksetApiError, fetchBricksetOwnedSets, loginToBrickset } from './bricksetCollection';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function bricksetSet(setID: number, number: string, collection?: Record<string, unknown>) {
  return {
    setID,
    number,
    numberVariant: 1,
    name: `Set ${number}`,
    year: 2020,
    theme: 'Icons',
    themeGroup: 'Model making',
    subtheme: null,
    pieces: 100,
    minifigs: 0,
    image: {
      thumbnailURL: `https://images.brickset.com/sets/small/${number}-1.jpg`,
      imageURL: `https://images.brickset.com/sets/images/${number}-1.jpg`,
    },
    bricksetURL: `https://brickset.com/sets/${number}-1`,
    collection: { owned: true, qtyOwned: 1, ...collection },
  };
}

function lastRequest(): { url: string; body: URLSearchParams } {
  const [url, init] = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
  return { url, body: new URLSearchParams(init.body as string) };
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('loginToBrickset', () => {
  it('POSTs the credentials as a form body and returns the hash', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ status: 'success', hash: 'abc123' }));

    const hash = await loginToBrickset('key', 'brickfan', 'p@ss word');

    expect(hash).toBe('abc123');
    const { url, body } = lastRequest();
    expect(url).toBe('https://brickset.com/api/v3.asmx/login');
    expect(body.get('apiKey')).toBe('key');
    expect(body.get('username')).toBe('brickfan');
    expect(body.get('password')).toBe('p@ss word');
    expect(mockFetch.mock.calls[0][1].method).toBe('POST');
    // The password must travel in the body, never the URL.
    expect(url).not.toContain('p@ss');
  });

  it('classifies a bad username/password', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ status: 'error', message: 'Invalid username or password' })
    );

    await expect(loginToBrickset('key', 'u', 'p')).rejects.toMatchObject({
      name: 'BricksetApiError',
      code: 'invalid_credentials',
    });
  });

  it('classifies a rejected API key', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ status: 'error', message: 'Invalid API key' }));
    await expect(loginToBrickset('key', 'u', 'p')).rejects.toMatchObject({
      code: 'invalid_api_key',
    });
  });

  it('treats a success without a hash as an upstream failure', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ status: 'success' }));
    await expect(loginToBrickset('key', 'u', 'p')).rejects.toMatchObject({ code: 'upstream' });
  });

  it('wraps network failures', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(loginToBrickset('key', 'u', 'p')).rejects.toBeInstanceOf(BricksetApiError);
  });

  it('treats a non-2xx response as an upstream failure', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, false, 500));
    await expect(loginToBrickset('key', 'u', 'p')).rejects.toMatchObject({ code: 'upstream' });
  });
});

describe('fetchBricksetOwnedSets', () => {
  it('requests owned sets with the user hash and maps them', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        status: 'success',
        matches: 2,
        sets: [
          bricksetSet(1, '10300', { qtyOwned: 2, notes: '  Gift from Dad  ' }),
          bricksetSet(2, '21333', { qtyOwned: 0 }),
        ],
      })
    );

    const owned = await fetchBricksetOwnedSets('key', 'hash');

    const { body } = lastRequest();
    expect(body.get('userHash')).toBe('hash');
    expect(JSON.parse(body.get('params')!)).toMatchObject({
      owned: '1',
      pageSize: '500',
      pageNumber: '1',
    });

    expect(owned).toEqual([
      expect.objectContaining({
        bricksetSetId: 1,
        setNumber: '10300',
        sourceId: '10300-1',
        imageUrl: 'https://images.brickset.com/sets/images/10300-1.jpg',
        quantity: 2,
        notes: 'Gift from Dad',
      }),
      expect.objectContaining({ bricksetSetId: 2, quantity: 1, notes: null }),
    ]);
  });

  it('pages until the match count is reached and dedupes across pages', async () => {
    const page1 = Array.from({ length: 500 }, (_, i) => bricksetSet(i + 1, String(10000 + i)));
    const page2 = [bricksetSet(500, '10499'), bricksetSet(501, '10501')];
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ status: 'success', matches: 501, sets: page1 }))
      .mockResolvedValueOnce(jsonResponse({ status: 'success', matches: 501, sets: page2 }));

    const owned = await fetchBricksetOwnedSets('key', 'hash');

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(lastRequest().body.get('params')!).pageNumber).toBe('2');
    expect(owned).toHaveLength(501);
  });

  it('skips records Brickset flags as not owned', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        status: 'success',
        matches: 2,
        sets: [bricksetSet(1, '10300'), bricksetSet(2, '21333', { owned: false })],
      })
    );

    const owned = await fetchBricksetOwnedSets('key', 'hash');
    expect(owned.map((s) => s.bricksetSetId)).toEqual([1]);
  });

  it('stops paging as soon as every reported match has arrived, even when some were skipped', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        status: 'success',
        matches: 2,
        sets: [bricksetSet(1, '10300'), bricksetSet(2, '21333', { owned: false })],
      })
    );
    await fetchBricksetOwnedSets('key', 'hash');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('refuses to hand back a truncated collection when the page limit is hit', async () => {
    const fullPage = Array.from({ length: 500 }, (_, i) => bricksetSet(i + 1, String(i)));
    mockFetch.mockResolvedValue(
      jsonResponse({ status: 'success', matches: 99_999, sets: fullPage })
    );

    await expect(fetchBricksetOwnedSets('key', 'hash')).rejects.toMatchObject({
      code: 'upstream',
      message: expect.stringContaining('more than'),
    });
    expect(mockFetch).toHaveBeenCalledTimes(10);
  });

  it('treats a 200 with an unreadable body as an upstream failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError('bad json')),
    } as unknown as Response);
    await expect(fetchBricksetOwnedSets('key', 'hash')).rejects.toMatchObject({ code: 'upstream' });
  });

  it('treats a success without a sets array as an upstream failure', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ status: 'success', matches: 1 }));
    await expect(fetchBricksetOwnedSets('key', 'hash')).rejects.toMatchObject({ code: 'upstream' });
  });

  it('bounds every call with a timeout signal', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ status: 'success', hash: 'h' }));
    await loginToBrickset('key', 'u', 'p');
    expect(mockFetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it('returns an empty list for an empty collection', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ status: 'success', matches: 0, sets: [] }));
    expect(await fetchBricksetOwnedSets('key', 'hash')).toEqual([]);
  });

  it('classifies a rejected saved session distinctly from bad credentials', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ status: 'error', message: 'Invalid user hash' })
    );
    await expect(fetchBricksetOwnedSets('key', 'stale')).rejects.toMatchObject({
      code: 'invalid_user_hash',
    });
  });

  it('classifies the daily API limit', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ status: 'error', message: 'API limit exceeded' })
    );
    await expect(fetchBricksetOwnedSets('key', 'hash')).rejects.toMatchObject({
      code: 'rate_limited',
    });
  });
});
