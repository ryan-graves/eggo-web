import { BricksetProvider } from './brickset';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('BricksetProvider', () => {
  let provider: BricksetProvider;

  beforeEach(() => {
    provider = new BricksetProvider();
    mockFetch.mockReset();
  });

  describe('lookupSet', () => {
    it('returns set data when found', async () => {
      const mockResponse = {
        status: 'success',
        matches: 1,
        sets: [
          {
            setID: 27791,
            number: '75192',
            numberVariant: 1,
            name: 'Millennium Falcon',
            year: 2017,
            theme: 'Star Wars',
            themeGroup: 'Licensed',
            subtheme: 'Ultimate Collector Series',
            pieces: 7541,
            minifigs: 7,
            image: {
              thumbnailURL: 'https://images.brickset.com/sets/small/75192-1.jpg',
              imageURL: 'https://images.brickset.com/sets/images/75192-1.jpg',
            },
            bricksetURL: 'https://brickset.com/sets/75192-1',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await provider.lookupSet('75192');

      expect(result).toEqual({
        setNumber: '75192',
        name: 'Millennium Falcon',
        year: 2017,
        pieceCount: 7541,
        theme: 'Star Wars',
        subtheme: 'Ultimate Collector Series',
        imageUrl: 'https://images.brickset.com/sets/images/75192-1.jpg',
        sourceId: '75192-1',
        dataSource: 'brickset',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/brickset'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('returns null when set is not found', async () => {
      const mockResponse = {
        status: 'success',
        matches: 0,
        sets: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      // Also mock the fallback search
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'success',
            matches: 0,
            sets: [],
          }),
      });

      const result = await provider.lookupSet('99999');

      expect(result).toBeNull();
    });

    it('normalizes set numbers without suffix', async () => {
      const mockResponse = {
        status: 'success',
        matches: 0,
        sets: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'success',
            matches: 0,
            sets: [],
          }),
      });

      await provider.lookupSet('12345');

      // Check that first call includes normalized set number
      const firstCallUrl = mockFetch.mock.calls[0][0];
      const params = JSON.parse(new URLSearchParams(firstCallUrl.split('?')[1]).get('params')!);
      expect(params.setNumber).toBe('12345-1');
    });

    it('preserves set numbers with existing suffix', async () => {
      const mockResponse = {
        status: 'success',
        matches: 0,
        sets: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await provider.lookupSet('12345-2');

      const firstCallUrl = mockFetch.mock.calls[0][0];
      const params = JSON.parse(new URLSearchParams(firstCallUrl.split('?')[1]).get('params')!);
      expect(params.setNumber).toBe('12345-2');
    });

    it('uses fallback search when exact match not found', async () => {
      // First call returns no matches
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'success',
            matches: 0,
            sets: [],
          }),
      });

      // Fallback search finds the set
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'success',
            matches: 1,
            sets: [
              {
                setID: 12345,
                number: '12345',
                numberVariant: 2,
                name: 'Test Set',
                year: 2023,
                theme: 'City',
                themeGroup: 'Modern Day',
                subtheme: null,
                pieces: 100,
                minifigs: 2,
                image: {
                  thumbnailURL: null,
                  imageURL: 'https://images.brickset.com/sets/images/12345-2.jpg',
                },
                bricksetURL: 'https://brickset.com/sets/12345-2',
              },
            ],
          }),
      });

      const result = await provider.lookupSet('12345');

      expect(result).not.toBeNull();
      expect(result!.setNumber).toBe('12345');
      expect(result!.name).toBe('Test Set');
    });

    it('throws error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error'),
      });

      await expect(provider.lookupSet('75192')).rejects.toThrow('Brickset API error: 500');
    });

    it('throws error when API returns error status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'error',
            message: 'Invalid API key',
          }),
      });

      await expect(provider.lookupSet('75192')).rejects.toThrow('Invalid API key');
    });

    it('uses thumbnail when main image is not available', async () => {
      const mockResponse = {
        status: 'success',
        matches: 1,
        sets: [
          {
            setID: 12345,
            number: '12345',
            numberVariant: 1,
            name: 'Test Set',
            year: 2023,
            theme: 'City',
            themeGroup: 'Modern Day',
            subtheme: null,
            pieces: 100,
            minifigs: 2,
            image: {
              thumbnailURL: 'https://images.brickset.com/sets/small/12345-1.jpg',
              imageURL: null,
            },
            bricksetURL: 'https://brickset.com/sets/12345-1',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await provider.lookupSet('12345');

      expect(result!.imageUrl).toBe('https://images.brickset.com/sets/small/12345-1.jpg');
    });
  });

  describe('searchSets', () => {
    it('returns search results', async () => {
      const mockResponse = {
        status: 'success',
        matches: 2,
        sets: [
          {
            setID: 27791,
            number: '75192',
            numberVariant: 1,
            name: 'Millennium Falcon',
            year: 2017,
            theme: 'Star Wars',
            themeGroup: 'Licensed',
            subtheme: 'Ultimate Collector Series',
            pieces: 7541,
            minifigs: 7,
            image: {
              thumbnailURL: 'https://images.brickset.com/sets/small/75192-1.jpg',
              imageURL: 'https://images.brickset.com/sets/images/75192-1.jpg',
            },
            bricksetURL: 'https://brickset.com/sets/75192-1',
          },
          {
            setID: 34567,
            number: '75375',
            numberVariant: 1,
            name: 'Millennium Falcon',
            year: 2024,
            theme: 'Star Wars',
            themeGroup: 'Licensed',
            subtheme: null,
            pieces: 921,
            minifigs: 4,
            image: {
              thumbnailURL: 'https://images.brickset.com/sets/small/75375-1.jpg',
              imageURL: 'https://images.brickset.com/sets/images/75375-1.jpg',
            },
            bricksetURL: 'https://brickset.com/sets/75375-1',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const results = await provider.searchSets('millennium falcon');

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Millennium Falcon');
      expect(results[1].name).toBe('Millennium Falcon');
    });

    it('respects limit option', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'success',
            matches: 0,
            sets: [],
          }),
      });

      await provider.searchSets('test', { limit: 5 });

      const callUrl = mockFetch.mock.calls[0][0];
      const params = JSON.parse(new URLSearchParams(callUrl.split('?')[1]).get('params')!);
      expect(params.pageSize).toBe('5');
    });

    it('includes theme in search params when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'success',
            matches: 0,
            sets: [],
          }),
      });

      await provider.searchSets('falcon', { theme: 'Star Wars' });

      const callUrl = mockFetch.mock.calls[0][0];
      const params = JSON.parse(new URLSearchParams(callUrl.split('?')[1]).get('params')!);
      expect(params.theme).toBe('Star Wars');
    });

    it('returns empty array on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error'),
      });

      const results = await provider.searchSets('test');

      expect(results).toEqual([]);
    });
  });

  describe('getImageUrl', () => {
    it('returns image URL for valid set', async () => {
      const mockResponse = {
        status: 'success',
        matches: 1,
        sets: [
          {
            setID: 27791,
            number: '75192',
            numberVariant: 1,
            name: 'Millennium Falcon',
            year: 2017,
            theme: 'Star Wars',
            themeGroup: 'Licensed',
            subtheme: 'Ultimate Collector Series',
            pieces: 7541,
            minifigs: 7,
            image: {
              thumbnailURL: 'https://images.brickset.com/sets/small/75192-1.jpg',
              imageURL: 'https://images.brickset.com/sets/images/75192-1.jpg',
            },
            bricksetURL: 'https://brickset.com/sets/75192-1',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const url = await provider.getImageUrl('75192');

      expect(url).toBe('https://images.brickset.com/sets/images/75192-1.jpg');
    });

    it('returns null for non-existent set', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'success',
            matches: 0,
            sets: [],
          }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'success',
            matches: 0,
            sets: [],
          }),
      });

      const url = await provider.getImageUrl('99999');

      expect(url).toBeNull();
    });
  });
});
