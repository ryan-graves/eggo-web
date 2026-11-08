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
  it('records the request when under the limit', async () => {
    mockCount.mockResolvedValue(2);
    await takeBricksetRequestSlot('user-1', 'login');
    expect(mockRecord).toHaveBeenCalledWith('user-1', 'login');
    const since = mockCount.mock.calls[0][2] as Date;
    expect(Date.now() - since.getTime()).toBeGreaterThan(14 * 60 * 1000);
  });

  it('throws without recording once the sign-in limit is reached', async () => {
    mockCount.mockResolvedValue(6);
    await expect(takeBricksetRequestSlot('user-1', 'login')).rejects.toBeInstanceOf(
      BricksetThrottleError
    );
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it('allows more fetches than sign-ins', async () => {
    mockCount.mockResolvedValue(6);
    await expect(takeBricksetRequestSlot('user-1', 'fetch')).resolves.toBeUndefined();
    mockCount.mockResolvedValue(12);
    await expect(takeBricksetRequestSlot('user-1', 'fetch')).rejects.toMatchObject({
      kind: 'fetch',
    });
  });
});
