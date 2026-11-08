import {
  BricksetImportError,
  applyDetailsToAll,
  buildImportCandidates,
  fetchBricksetOwnedSets,
  getBricksetLinkStatus,
  runBricksetImport,
  unlinkBrickset,
  todayIsoDate,
  updateCandidate,
  type ImportDetails,
  type ImportProgress,
} from './bricksetImport';
import type { BricksetOwnedSet, LegoSet } from '@/types';

const mockCreateSet = jest.fn();
const mockUpdateSet = jest.fn();
const mockGetAccessToken = jest.fn();
const mockRemoveImageBackground = jest.fn();

jest.mock('@/lib/supabase', () => ({
  createSet: (...args: unknown[]) => mockCreateSet(...args),
  updateSet: (...args: unknown[]) => mockUpdateSet(...args),
  getAccessToken: () => mockGetAccessToken(),
}));

jest.mock('@/lib/image', () => ({
  removeImageBackground: (...args: unknown[]) => mockRemoveImageBackground(...args),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

function owned(overrides: Partial<BricksetOwnedSet> = {}): BricksetOwnedSet {
  return {
    bricksetSetId: 1,
    setNumber: '10300',
    sourceId: '10300-1',
    name: 'Back to the Future Time Machine',
    year: 2022,
    pieceCount: 1872,
    theme: 'Icons',
    subtheme: 'Back to the Future',
    imageUrl: 'https://images.brickset.com/sets/images/10300-1.jpg',
    quantity: 1,
    notes: null,
    ...overrides,
  };
}

function existing(overrides: Partial<LegoSet> = {}): LegoSet {
  return {
    id: 'row-1',
    collectionId: 'col-1',
    setNumber: '10300',
    name: 'Back to the Future Time Machine',
    pieceCount: 1872,
    year: 2022,
    theme: 'Icons',
    subtheme: null,
    imageUrl: null,
    status: 'assembled',
    hasBeenAssembled: true,
    dateReceived: null,
    owners: [],
    dataSource: 'brickset',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const DEFAULTS: ImportDetails = {
  status: 'assembled',
  owners: ['Ryan'],
  dateReceived: '2026-11-07',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAccessToken.mockResolvedValue('jwt');
});

describe('todayIsoDate', () => {
  it('formats the local calendar date as YYYY-MM-DD', () => {
    expect(todayIsoDate(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});

describe('fetchBricksetOwnedSets', () => {
  const credentials = {
    kind: 'credentials',
    username: 'brickfan',
    password: 'pw',
    remember: true,
  } as const;

  it('sends the credentials and remember flag with the Eggo bearer token and returns the payload', async () => {
    const payload = { username: 'brickfan', sets: [owned()], linked: true };
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(payload) });

    const result = await fetchBricksetOwnedSets(credentials);

    expect(result).toEqual(payload);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/brickset/collection');
    expect(init.headers.Authorization).toBe('Bearer jwt');
    expect(JSON.parse(init.body)).toEqual({ username: 'brickfan', password: 'pw', remember: true });
  });

  it('asks for the remembered account without sending credentials', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ username: 'brickfan', sets: [], linked: true }),
    });
    await fetchBricksetOwnedSets({ kind: 'linked' });
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ useLink: true });
  });

  it('fails fast without a session instead of calling the API', async () => {
    mockGetAccessToken.mockResolvedValue(null);
    await expect(fetchBricksetOwnedSets(credentials)).rejects.toMatchObject({
      code: 'unauthorized',
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('surfaces the server error code and message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ error: 'Bad login', code: 'invalid_credentials' }),
    });

    const err = await fetchBricksetOwnedSets(credentials).catch((e) => e);
    expect(err).toBeInstanceOf(BricksetImportError);
    expect(err.code).toBe('invalid_credentials');
    expect(err.message).toBe('Bad login');
  });

  it.each(['link_expired', 'not_linked', 'too_many_requests'])(
    'recognizes the %s code',
    async (code) => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ error: 'x', code }),
      });
      await expect(fetchBricksetOwnedSets({ kind: 'linked' })).rejects.toMatchObject({ code });
    }
  );

  it('falls back to an upstream code when the error body is unusable', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    });
    await expect(fetchBricksetOwnedSets(credentials)).rejects.toMatchObject({ code: 'upstream' });
  });

  it('reports a network failure distinctly', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(fetchBricksetOwnedSets(credentials)).rejects.toMatchObject({ code: 'network' });
  });
});

describe('link status helpers', () => {
  it('reads the link status with the bearer token', async () => {
    const status = { available: true, linked: true, username: 'brickfan' };
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(status) });
    expect(await getBricksetLinkStatus()).toEqual(status);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/brickset/link');
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBe('Bearer jwt');
  });

  it('unlinks with DELETE and resolves on 204', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });
    await expect(unlinkBrickset()).resolves.toBeUndefined();
    expect(mockFetch.mock.calls[0][1].method).toBe('DELETE');
  });

  it('throws a typed error when unlinking fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'nope', code: 'upstream' }),
    });
    await expect(unlinkBrickset()).rejects.toMatchObject({ code: 'upstream', message: 'nope' });
  });
});

describe('buildImportCandidates', () => {
  it('pre-selects sets not already in the collection', () => {
    const candidates = buildImportCandidates([owned()], [], DEFAULTS);
    expect(candidates).toEqual([{ set: owned(), existingCount: 0, selected: true, ...DEFAULTS }]);
  });

  it('flags duplicates by set number and leaves them unselected', () => {
    const candidates = buildImportCandidates(
      [owned(), owned({ bricksetSetId: 2, setNumber: '21333', sourceId: '21333-1' })],
      [existing(), existing({ id: 'row-2' })],
      DEFAULTS
    );
    expect(candidates[0]).toMatchObject({ existingCount: 2, selected: false });
    expect(candidates[1]).toMatchObject({ existingCount: 0, selected: true });
  });

  it('matches older rows that stored the variant suffix in the set number', () => {
    const candidates = buildImportCandidates(
      [owned()],
      [existing({ setNumber: '10300-1' })],
      DEFAULTS
    );
    expect(candidates[0]).toMatchObject({ existingCount: 1, selected: false });
  });

  it('matches on the Brickset source id when the number was stored differently', () => {
    const candidates = buildImportCandidates(
      [owned()],
      [existing({ setNumber: 'something-else', dataSourceId: '10300-1' })],
      DEFAULTS
    );
    expect(candidates[0]).toMatchObject({ existingCount: 1, selected: false });
  });
});

describe('candidate detail helpers', () => {
  const two = () =>
    buildImportCandidates(
      [owned(), owned({ bricksetSetId: 2, setNumber: '21333', sourceId: '21333-1' })],
      [],
      DEFAULTS
    );

  it('updateCandidate changes only the matching row', () => {
    const next = updateCandidate(two(), '21333-1', { status: 'unopened', selected: false });
    expect(next[0]).toMatchObject({ status: 'assembled', selected: true });
    expect(next[1]).toMatchObject({ status: 'unopened', selected: false });
  });

  it('applyDetailsToAll sets the same value on every row', () => {
    const next = applyDetailsToAll(two(), { dateReceived: null });
    expect(next.every((c) => c.dateReceived === null)).toBe(true);
  });
});

describe('runBricksetImport', () => {
  const options = { collectionId: 'col-1' };

  beforeEach(() => {
    let nextId = 1;
    mockCreateSet.mockImplementation(() => Promise.resolve(`set-${nextId++}`));
    mockUpdateSet.mockResolvedValue(undefined);
    mockRemoveImageBackground.mockImplementation((_url: string, setId: string) =>
      Promise.resolve({
        processedImageUrl: `https://storage/${setId}.png`,
        error: null,
        skipped: false,
      })
    );
  });

  it('creates one row per copy, carrying the chosen status, owners, and Brickset notes', async () => {
    const candidates = buildImportCandidates(
      [owned({ quantity: 2, notes: 'Birthday' })],
      [],
      DEFAULTS
    );

    const summary = await runBricksetImport(candidates, options, () => {});

    expect(mockCreateSet).toHaveBeenCalledTimes(2);
    expect(mockCreateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionId: 'col-1',
        setNumber: '10300',
        name: 'Back to the Future Time Machine',
        status: 'assembled',
        hasBeenAssembled: true,
        owners: ['Ryan'],
        notes: 'Birthday',
        dataSource: 'brickset',
        dataSourceId: '10300-1',
        dateReceived: '2026-11-07',
      })
    );
    expect(summary).toEqual({
      setsCreated: 2,
      imagesProcessed: 2,
      imageFailures: 0,
      failures: [],
    });
  });

  it('skips unselected candidates', async () => {
    const candidates = buildImportCandidates([owned()], [existing()], DEFAULTS);
    const summary = await runBricksetImport(candidates, options, () => {});
    expect(mockCreateSet).not.toHaveBeenCalled();
    expect(summary.setsCreated).toBe(0);
  });

  it('marks hasBeenAssembled false for statuses that have not been built', async () => {
    await runBricksetImport(
      buildImportCandidates([owned()], [], { ...DEFAULTS, status: 'unopened' }),
      options,
      () => {}
    );
    expect(mockCreateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'unopened', hasBeenAssembled: false })
    );
  });

  it("uses each row's own status, owners, and date", async () => {
    let rows = buildImportCandidates(
      [owned(), owned({ bricksetSetId: 2, setNumber: '21333', sourceId: '21333-1' })],
      [],
      DEFAULTS
    );
    rows = updateCandidate(rows, '21333-1', {
      status: 'unopened',
      owners: ['Alyssa'],
      dateReceived: null,
    });

    await runBricksetImport(rows, options, () => {});

    expect(mockCreateSet).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        setNumber: '10300',
        status: 'assembled',
        owners: ['Ryan'],
        dateReceived: '2026-11-07',
      })
    );
    expect(mockCreateSet).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        setNumber: '21333',
        status: 'unopened',
        hasBeenAssembled: false,
        owners: ['Alyssa'],
        dateReceived: null,
      })
    );
  });

  it('processes images after all rows exist and writes the processed URL back', async () => {
    const callOrder: string[] = [];
    mockCreateSet.mockImplementation(() => {
      callOrder.push('create');
      return Promise.resolve(`set-${callOrder.length}`);
    });
    mockRemoveImageBackground.mockImplementation((_url: string, setId: string) => {
      callOrder.push('image');
      return Promise.resolve({ processedImageUrl: `p/${setId}`, error: null, skipped: false });
    });

    await runBricksetImport(
      buildImportCandidates(
        [owned(), owned({ bricksetSetId: 2, setNumber: '21333', sourceId: '21333-1' })],
        [],
        DEFAULTS
      ),
      options,
      () => {}
    );

    expect(callOrder).toEqual(['create', 'create', 'image', 'image']);
    expect(mockRemoveImageBackground).toHaveBeenCalledWith(owned().imageUrl, 'set-1');
    expect(mockUpdateSet).toHaveBeenCalledWith('set-1', { customImageUrl: 'p/set-1' });
  });

  it('keeps the row and counts an image failure when background removal fails', async () => {
    mockRemoveImageBackground.mockResolvedValue({
      processedImageUrl: null,
      error: 'rembg down',
      skipped: false,
    });

    const summary = await runBricksetImport(
      buildImportCandidates([owned()], [], DEFAULTS),
      options,
      () => {}
    );

    expect(summary).toMatchObject({ setsCreated: 1, imagesProcessed: 0, imageFailures: 1 });
    expect(mockUpdateSet).not.toHaveBeenCalled();
  });

  it('does not count a skipped image step (feature not configured) as a failure', async () => {
    mockRemoveImageBackground.mockResolvedValue({
      processedImageUrl: null,
      error: null,
      skipped: true,
    });
    const summary = await runBricksetImport(
      buildImportCandidates([owned()], [], DEFAULTS),
      options,
      () => {}
    );
    expect(summary).toMatchObject({ imagesProcessed: 0, imageFailures: 0 });
  });

  it('skips the image phase entirely when no created set has an image', async () => {
    const progress: ImportProgress[] = [];
    const summary = await runBricksetImport(
      buildImportCandidates([owned({ imageUrl: null })], [], DEFAULTS),
      options,
      (p) => progress.push(p)
    );
    expect(mockRemoveImageBackground).not.toHaveBeenCalled();
    expect(progress.some((p) => p.phase === 'images')).toBe(false);
    expect(summary).toMatchObject({ setsCreated: 1, imagesProcessed: 0, imageFailures: 0 });
  });

  it('counts an image failure when the processed URL cannot be saved', async () => {
    mockUpdateSet.mockRejectedValue(new Error('offline'));
    const summary = await runBricksetImport(
      buildImportCandidates([owned()], [], DEFAULTS),
      options,
      () => {}
    );
    expect(summary).toMatchObject({ setsCreated: 1, imagesProcessed: 0, imageFailures: 1 });
  });

  it('reports one failure per set, counting the copies that failed', async () => {
    mockCreateSet
      .mockRejectedValueOnce(new Error('RLS denied'))
      .mockResolvedValueOnce('set-ok')
      .mockRejectedValueOnce(new Error('RLS denied'));

    const summary = await runBricksetImport(
      buildImportCandidates([owned({ quantity: 3 })], [], DEFAULTS),
      options,
      () => {}
    );

    expect(summary.setsCreated).toBe(1);
    expect(summary.failures).toEqual([
      { set: owned({ quantity: 3 }), message: 'RLS denied', copies: 2 },
    ]);
  });

  it('never runs more than three image jobs at once and drains them all', async () => {
    let inFlight = 0;
    let peak = 0;
    const release: Array<() => void> = [];
    mockRemoveImageBackground.mockImplementation(
      (_url: string, setId: string) =>
        new Promise((resolve) => {
          inFlight++;
          peak = Math.max(peak, inFlight);
          release.push(() => {
            inFlight--;
            resolve({ processedImageUrl: `p/${setId}`, error: null, skipped: false });
          });
        })
    );
    const five = Array.from({ length: 5 }, (_, i) =>
      owned({ bricksetSetId: i + 1, setNumber: String(10000 + i), sourceId: `${10000 + i}-1` })
    );

    const run = runBricksetImport(buildImportCandidates(five, [], DEFAULTS), options, () => {});
    // Let the create pass and the first wave of image jobs start.
    await new Promise((r) => setTimeout(r, 0));
    expect(peak).toBe(3);
    while (release.length > 0) {
      release.shift()!();
      await new Promise((r) => setTimeout(r, 0));
    }
    const summary = await run;

    expect(peak).toBe(3);
    expect(summary.imagesProcessed).toBe(5);
    expect(mockUpdateSet).toHaveBeenCalledTimes(5);
  });

  it('records a failure and continues when a row cannot be created', async () => {
    mockCreateSet.mockRejectedValueOnce(new Error('RLS denied')).mockResolvedValueOnce('set-ok');
    const second = owned({
      bricksetSetId: 2,
      setNumber: '21333',
      sourceId: '21333-1',
      name: 'Globe',
    });

    const summary = await runBricksetImport(
      buildImportCandidates([owned(), second], [], DEFAULTS),
      options,
      () => {}
    );

    expect(summary.setsCreated).toBe(1);
    expect(summary.failures).toEqual([{ set: owned(), message: 'RLS denied', copies: 1 }]);
  });

  it('reports progress through both phases', async () => {
    const progress: ImportProgress[] = [];
    await runBricksetImport(
      buildImportCandidates([owned({ quantity: 2 })], [], DEFAULTS),
      options,
      (p) => progress.push(p)
    );

    const creating = progress.filter((p) => p.phase === 'creating');
    const images = progress.filter((p) => p.phase === 'images');
    expect(creating[0]).toEqual({ phase: 'creating', completed: 0, total: 2, currentName: null });
    expect(creating[creating.length - 1]).toMatchObject({ completed: 2, total: 2 });
    expect(images[images.length - 1]).toMatchObject({ completed: 2, total: 2 });
  });
});
