/**
 * @jest-environment node
 */
import { DELETE, GET } from './route';

const mockVerifyAuthToken = jest.fn();
const mockIsAdminConfigured = jest.fn();
const mockIsLinkConfigured = jest.fn();
const mockGetSummary = jest.fn();
const mockDeleteLink = jest.fn();

jest.mock('@/lib/supabase/admin', () => ({
  verifyAuthToken: (...args: unknown[]) => mockVerifyAuthToken(...args),
  isAdminConfigured: () => mockIsAdminConfigured(),
}));

jest.mock('@/lib/supabase/bricksetLinks', () => ({
  isBricksetLinkConfigured: () => mockIsLinkConfigured(),
  getBricksetLinkSummary: (...args: unknown[]) => mockGetSummary(...args),
  deleteBricksetLink: (...args: unknown[]) => mockDeleteLink(...args),
}));

function request(method: 'GET' | 'DELETE', token: string | null = 'jwt-123'): Request {
  return new Request('http://localhost:3000/api/brickset/link', {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

describe('/api/brickset/link', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockIsAdminConfigured.mockReturnValue(true);
    mockIsLinkConfigured.mockReturnValue(true);
    mockVerifyAuthToken.mockResolvedValue({ uid: 'user-1', email: null });
    mockGetSummary.mockResolvedValue(null);
    mockDeleteLink.mockResolvedValue(undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('GET', () => {
    it('401s without an Eggo session', async () => {
      mockVerifyAuthToken.mockResolvedValue(null);
      const res = await GET(request('GET', null) as never);
      expect(res.status).toBe(401);
    });

    it('reports linking unavailable without consulting the store', async () => {
      mockIsLinkConfigured.mockReturnValue(false);
      const res = await GET(request('GET') as never);
      expect(await res.json()).toEqual({ available: false, linked: false });
      expect(mockGetSummary).not.toHaveBeenCalled();
    });

    it('reports no link', async () => {
      const res = await GET(request('GET') as never);
      expect(await res.json()).toEqual({ available: true, linked: false });
    });

    it('reports the linked account from the summary, never touching the session hash', async () => {
      mockGetSummary.mockResolvedValue({
        username: 'brickfan',
        linkedAt: '2026-11-01T00:00:00Z',
        lastSyncedAt: '2026-11-07T00:00:00Z',
      });
      const res = await GET(request('GET') as never);
      const body = await res.json();
      expect(body).toEqual({
        available: true,
        linked: true,
        username: 'brickfan',
        linkedAt: '2026-11-01T00:00:00Z',
        lastSyncedAt: '2026-11-07T00:00:00Z',
      });
      expect(JSON.stringify(body)).not.toContain('hash');
    });

    it('500s cleanly when the store fails', async () => {
      mockGetSummary.mockRejectedValue(new Error('db down'));
      const res = await GET(request('GET') as never);
      expect(res.status).toBe(500);
    });
  });

  describe('DELETE', () => {
    it('401s without an Eggo session', async () => {
      mockVerifyAuthToken.mockResolvedValue(null);
      const res = await DELETE(request('DELETE', null) as never);
      expect(res.status).toBe(401);
      expect(mockDeleteLink).not.toHaveBeenCalled();
    });

    it("forgets the caller's link and answers 204", async () => {
      const res = await DELETE(request('DELETE') as never);
      expect(res.status).toBe(204);
      expect(mockDeleteLink).toHaveBeenCalledWith('user-1');
    });
  });
});
