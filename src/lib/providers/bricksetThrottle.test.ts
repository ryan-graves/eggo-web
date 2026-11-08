/**
 * @jest-environment node
 */
import { BricksetThrottleError, takeBricksetRequestSlot } from './bricksetThrottle';

const mockCount = jest.fn();
const mockRecord = jest.fn();

jest.mock('@/lib/supabase/bricksetLinks', () => ({
  countRecentBricksetRequests: (...args: unknown[]) => mockCount(...args),
  recordBricksetRequest: (...args: unknown[]) => mockRecord(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockRecord.mockResolvedValue(undefined);
});

describe('takeBricksetRequestSlot', () => {
  it('records the request before counting, and allows it when within the limit', async () => {
    mockCount.mockResolvedValue(3);
    await takeBricksetRequestSlot('user-1', 'login');
    expect(mockRecord).toHaveBeenCalledWith('user-1', 'login');
    expect(mockRecord.mock.invocationCallOrder[0]).toBeLessThan(
      mockCount.mock.invocationCallOrder[0]
    );
    const since = mockCount.mock.calls[0][2] as Date;
    expect(Date.now() - since.getTime()).toBeGreaterThan(14 * 60 * 1000);
  });

  it('allows exactly the limit and refuses the next one', async () => {
    mockCount.mockResolvedValue(6);
    await expect(takeBricksetRequestSlot('user-1', 'login')).resolves.toBeUndefined();
    mockCount.mockResolvedValue(7);
    await expect(takeBricksetRequestSlot('user-1', 'login')).rejects.toBeInstanceOf(
      BricksetThrottleError
    );
  });

  it('allows more fetches than sign-ins', async () => {
    mockCount.mockResolvedValue(12);
    await expect(takeBricksetRequestSlot('user-1', 'fetch')).resolves.toBeUndefined();
    mockCount.mockResolvedValue(13);
    await expect(takeBricksetRequestSlot('user-1', 'fetch')).rejects.toMatchObject({
      kind: 'fetch',
    });
  });

  it('holds the cap under a parallel burst', async () => {
    // Simulate the table: each insert lands on its own tick, and a count
    // sees every insert that has landed so far.
    let rows = 0;
    mockRecord.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      rows++;
    });
    mockCount.mockImplementation(async () => rows);

    const outcomes = await Promise.allSettled(
      Array.from({ length: 30 }, () => takeBricksetRequestSlot('user-1', 'login'))
    );
    const allowed = outcomes.filter((o) => o.status === 'fulfilled').length;

    expect(allowed).toBe(6);
  });
});
