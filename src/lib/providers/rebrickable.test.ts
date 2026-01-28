import { RebrickableProvider } from './rebrickable';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('RebrickableProvider', () => {
  let provider: RebrickableProvider;

  beforeEach(() => {
    provider = new RebrickableProvider('test-api-key');
    mockFetch.mockReset();
  });

  describe('lookupSet', () => {
    it('returns set data when found', async () => {
      const mockSetResponse = {
        set_num: '75192-1',
        name: 'Millennium Falcon',
        year: 2017,
        num_parts: 7541,
        set_img_url: 'https://example.com/image.jpg',
        theme_id: 158,
      };

      const mockThemeResponse = {
        id: 158,
        name: 'Star Wars',
        parent_id: null,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSetResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockThemeResponse),
        });

      const result = await provider.lookupSet('75192');

      expect(result).toEqual({
        setNumber: '75192',
        name: 'Millennium Falcon',
        year: 2017,
        pieceCount: 7541,
        theme: 'Star Wars',
        subtheme: null,
        imageUrl: 'https://example.com/image.jpg',
        sourceId: '75192-1',
        dataSource: 'rebrickable',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/lego/sets/75192-1/'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'key test-api-key',
          }),
        })
      );
    });

    it('returns null when set is not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await provider.lookupSet('99999');

      expect(result).toBeNull();
    });

    it('handles sets with subthemes', async () => {
      const mockSetResponse = {
        set_num: '75341-1',
        name: "Luke Skywalker's Landspeeder",
        year: 2022,
        num_parts: 1890,
        set_img_url: 'https://example.com/landspeeder.jpg',
        theme_id: 714,
      };

      const mockSubthemeResponse = {
        id: 714,
        name: 'Ultimate Collector Series',
        parent_id: 158,
      };

      const mockParentThemeResponse = {
        id: 158,
        name: 'Star Wars',
        parent_id: null,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSetResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSubthemeResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockParentThemeResponse),
        });

      const result = await provider.lookupSet('75341');

      expect(result).toEqual({
        setNumber: '75341',
        name: "Luke Skywalker's Landspeeder",
        year: 2022,
        pieceCount: 1890,
        theme: 'Star Wars',
        subtheme: 'Ultimate Collector Series',
        imageUrl: 'https://example.com/landspeeder.jpg',
        sourceId: '75341-1',
        dataSource: 'rebrickable',
      });
    });

    it('normalizes set numbers without suffix', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await provider.lookupSet('12345');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/lego/sets/12345-1/'),
        expect.anything()
      );
    });

    it('preserves set numbers with existing suffix', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await provider.lookupSet('12345-2');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/lego/sets/12345-2/'),
        expect.anything()
      );
    });

    it('throws error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(provider.lookupSet('75192')).rejects.toThrow(
        'Rebrickable API error: 500 Internal Server Error'
      );
    });
  });

  describe('searchSets', () => {
    it('returns search results', async () => {
      const mockSearchResponse = {
        count: 2,
        results: [
          {
            set_num: '75192-1',
            name: 'Millennium Falcon',
            year: 2017,
            num_parts: 7541,
            set_img_url: 'https://example.com/falcon.jpg',
            theme_id: 158,
          },
          {
            set_num: '75375-1',
            name: 'Millennium Falcon',
            year: 2024,
            num_parts: 921,
            set_img_url: 'https://example.com/falcon2.jpg',
            theme_id: 158,
          },
        ],
      };

      const mockThemeResponse = {
        id: 158,
        name: 'Star Wars',
        parent_id: null,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSearchResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockThemeResponse),
        });

      const results = await provider.searchSets('millennium falcon');

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Millennium Falcon');
      expect(results[1].name).toBe('Millennium Falcon');
    });

    it('respects limit option', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 0, results: [] }),
      });

      await provider.searchSets('test', { limit: 5 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page_size=5'),
        expect.anything()
      );
    });
  });

  describe('getImageUrl', () => {
    it('returns image URL for valid set', async () => {
      const mockSetResponse = {
        set_num: '75192-1',
        name: 'Millennium Falcon',
        year: 2017,
        num_parts: 7541,
        set_img_url: 'https://example.com/image.jpg',
        theme_id: 158,
      };

      const mockThemeResponse = {
        id: 158,
        name: 'Star Wars',
        parent_id: null,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSetResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockThemeResponse),
        });

      const url = await provider.getImageUrl('75192');

      expect(url).toBe('https://example.com/image.jpg');
    });

    it('returns null for non-existent set', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const url = await provider.getImageUrl('99999');

      expect(url).toBeNull();
    });
  });
});
