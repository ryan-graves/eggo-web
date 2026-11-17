import {
  bricksetLargeImageVariant,
  displaySetNumber,
  mapBricksetSetToLookupResult,
  mapBricksetSetToOwnedSet,
  normalizeSetNumber,
  sourceImageCandidates,
  standardBricksetImage,
  usRetailPrice,
  type BricksetSet,
} from './bricksetMapping';

function record(overrides: Partial<BricksetSet> = {}): BricksetSet {
  return {
    setID: 32129,
    number: '10300',
    numberVariant: 1,
    name: 'Back to the Future Time Machine',
    year: 2022,
    theme: 'Icons',
    themeGroup: 'Model making',
    subtheme: 'Back to the Future',
    pieces: 1872,
    minifigs: 2,
    image: {
      thumbnailURL: 'https://images.brickset.com/sets/small/10300-1.jpg',
      imageURL: 'https://images.brickset.com/sets/images/10300-1.jpg',
    },
    bricksetURL: 'https://brickset.com/sets/10300-1',
    LEGOCom: { US: { retailPrice: 199.99 } },
    collection: { owned: true, qtyOwned: 1 },
    ...overrides,
  };
}

describe('set number helpers', () => {
  it('normalizes bare numbers to the -1 variant and leaves suffixed ones alone', () => {
    expect(normalizeSetNumber('10300')).toBe('10300-1');
    expect(normalizeSetNumber('10300-2')).toBe('10300-2');
  });

  it('strips the variant suffix for display', () => {
    expect(displaySetNumber('10300-1')).toBe('10300');
    expect(displaySetNumber('10300')).toBe('10300');
  });

  it('normalizes Brickset image paths to the standard rendition and passes others through', () => {
    expect(standardBricksetImage('https://images.brickset.com/sets/small/1-1.jpg')).toBe(
      'https://images.brickset.com/sets/images/1-1.jpg'
    );
    expect(standardBricksetImage('https://images.brickset.com/sets/large/1-1.jpg')).toBe(
      'https://images.brickset.com/sets/images/1-1.jpg'
    );
    expect(standardBricksetImage('https://cdn.rebrickable.com/x.jpg')).toBe(
      'https://cdn.rebrickable.com/x.jpg'
    );
    expect(standardBricksetImage(null)).toBeNull();
  });

  it('derives the large variant only for Brickset set images', () => {
    expect(bricksetLargeImageVariant('https://images.brickset.com/sets/images/1-1.jpg')).toBe(
      'https://images.brickset.com/sets/large/1-1.jpg'
    );
    expect(bricksetLargeImageVariant('https://images.brickset.com/sets/large/1-1.jpg')).toBeNull();
    expect(bricksetLargeImageVariant('https://cdn.rebrickable.com/x.jpg')).toBeNull();
  });

  it('tries the large rendition before the stored URL, and only the URL for other hosts', () => {
    expect(sourceImageCandidates('https://images.brickset.com/sets/images/6339-1.jpg')).toEqual([
      'https://images.brickset.com/sets/large/6339-1.jpg',
      'https://images.brickset.com/sets/images/6339-1.jpg',
    ]);
    expect(sourceImageCandidates('https://cdn.rebrickable.com/x.jpg')).toEqual([
      'https://cdn.rebrickable.com/x.jpg',
    ]);
  });
});

describe('mapBricksetSetToOwnedSet', () => {
  it('maps a full record', () => {
    expect(
      mapBricksetSetToOwnedSet(record({ collection: { qtyOwned: 2, notes: ' Gift ' } }))
    ).toEqual({
      bricksetSetId: 32129,
      setNumber: '10300',
      sourceId: '10300-1',
      name: 'Back to the Future Time Machine',
      year: 2022,
      pieceCount: 1872,
      theme: 'Icons',
      subtheme: 'Back to the Future',
      imageUrl: 'https://images.brickset.com/sets/images/10300-1.jpg',
      retailPrice: 199.99,
      quantity: 2,
      notes: 'Gift',
    });
  });

  it('survives a record with no image at all', () => {
    expect(mapBricksetSetToOwnedSet(record({ image: undefined })).imageUrl).toBeNull();
    expect(mapBricksetSetToOwnedSet(record({ image: null })).imageUrl).toBeNull();
    expect(
      mapBricksetSetToOwnedSet(record({ image: { thumbnailURL: null, imageURL: null } })).imageUrl
    ).toBeNull();
  });

  it('falls back to the thumbnail when only that exists', () => {
    const set = record({
      image: { thumbnailURL: 'https://images.brickset.com/sets/small/10300-1.jpg' },
    });
    expect(mapBricksetSetToOwnedSet(set).imageUrl).toBe(
      'https://images.brickset.com/sets/images/10300-1.jpg'
    );
  });

  it('normalizes empty or missing catalog fields to null', () => {
    const set = record({
      year: 0,
      pieces: undefined,
      theme: '',
      subtheme: null,
      collection: undefined,
    });
    expect(mapBricksetSetToOwnedSet(set)).toMatchObject({
      year: null,
      pieceCount: null,
      theme: null,
      subtheme: null,
      quantity: 1,
      notes: null,
    });
  });

  it('treats whitespace-only notes as no notes and a zero quantity as one copy', () => {
    const set = record({ collection: { qtyOwned: 0, notes: '   ' } });
    expect(mapBricksetSetToOwnedSet(set)).toMatchObject({ quantity: 1, notes: null });
  });
});

describe('mapBricksetSetToLookupResult', () => {
  it('produces the same shape the add-set lookup has always used', () => {
    expect(mapBricksetSetToLookupResult(record())).toEqual({
      setNumber: '10300',
      name: 'Back to the Future Time Machine',
      year: 2022,
      pieceCount: 1872,
      theme: 'Icons',
      subtheme: 'Back to the Future',
      imageUrl: 'https://images.brickset.com/sets/images/10300-1.jpg',
      retailPrice: 199.99,
      sourceId: '10300-1',
      dataSource: 'brickset',
    });
  });

  it('does not throw on a record without an image', () => {
    expect(mapBricksetSetToLookupResult(record({ image: undefined })).imageUrl).toBeNull();
  });
});

describe('usRetailPrice', () => {
  it('reads the LEGO.com US price', () => {
    expect(usRetailPrice(record())).toBe(199.99);
  });

  it('treats a missing or zero price as unknown', () => {
    expect(usRetailPrice(record({ LEGOCom: undefined }))).toBeNull();
    expect(usRetailPrice(record({ LEGOCom: null }))).toBeNull();
    expect(usRetailPrice(record({ LEGOCom: { US: null } }))).toBeNull();
    expect(usRetailPrice(record({ LEGOCom: { US: { retailPrice: 0 } } }))).toBeNull();
  });
});
