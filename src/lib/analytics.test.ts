import posthog from 'posthog-js';
import { identifyUser, initAnalytics, resetAnalyticsUser } from './analytics';

jest.mock('posthog-js', () => ({
  __esModule: true,
  default: {
    __loaded: false,
    init: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
  },
}));

const mockPosthog = posthog as jest.Mocked<typeof posthog>;

describe('analytics', () => {
  const originalToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPosthog.__loaded = false;
    delete process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  });

  afterAll(() => {
    if (originalToken === undefined) {
      delete process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    } else {
      process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = originalToken;
    }
  });

  describe('initAnalytics', () => {
    it('does not start PostHog when the build has no project token', () => {
      initAnalytics();

      expect(mockPosthog.init).not.toHaveBeenCalled();
    });

    it('starts PostHog through the reverse proxy when a token is present', () => {
      process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = 'phc_test';

      initAnalytics();

      expect(mockPosthog.init).toHaveBeenCalledWith(
        'phc_test',
        expect.objectContaining({
          api_host: 'https://a.ryangrav.es',
          ui_host: 'https://us.posthog.com',
        })
      );
    });
  });

  describe('identifyUser', () => {
    it('is a no-op when PostHog was never started', () => {
      identifyUser('user-1');

      expect(mockPosthog.identify).not.toHaveBeenCalled();
    });

    it('identifies by user ID only', () => {
      mockPosthog.__loaded = true;

      identifyUser('user-1');

      expect(mockPosthog.identify).toHaveBeenCalledWith('user-1');
    });
  });

  describe('resetAnalyticsUser', () => {
    it('is a no-op when PostHog was never started', () => {
      resetAnalyticsUser();

      expect(mockPosthog.reset).not.toHaveBeenCalled();
    });

    it('resets the identity when PostHog is running', () => {
      mockPosthog.__loaded = true;

      resetAnalyticsUser();

      expect(mockPosthog.reset).toHaveBeenCalled();
    });
  });
});
