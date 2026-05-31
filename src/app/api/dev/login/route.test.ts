/**
 * @jest-environment node
 */
import { POST } from './route';

const mockSignInWithPassword = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ auth: { signInWithPassword: mockSignInWithPassword } })),
}));

jest.mock('@/lib/supabase/config', () => ({
  getSupabaseUrl: () => 'https://test.supabase.co',
  getSupabasePublishableKey: () => 'sb_publishable_test',
}));

function postRequest(host = 'localhost:3000'): Request {
  return new Request('http://localhost:3000/api/dev/login', {
    method: 'POST',
    headers: { host },
  });
}

const ORIGINAL_ENV = process.env;

describe('POST /api/dev/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: 'development',
      DEV_LOGIN_ENABLED: 'true',
      DEV_LOGIN_EMAIL: 'eggo-dev-test@example.com',
      DEV_LOGIN_PASSWORD: 'pw',
    };
    mockSignInWithPassword.mockResolvedValue({
      data: {
        session: { access_token: 'access-123', refresh_token: 'refresh-456' },
        user: { app_metadata: { seed: true } },
      },
      error: null,
    });
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('404s in production without attempting sign-in', async () => {
    process.env = { ...process.env, NODE_ENV: 'production' };
    const res = await POST(postRequest());
    expect(res.status).toBe(404);
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('404s when DEV_LOGIN_ENABLED is not set', async () => {
    delete process.env.DEV_LOGIN_ENABLED;
    const res = await POST(postRequest());
    expect(res.status).toBe(404);
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('404s when the request is not from localhost', async () => {
    const res = await POST(postRequest('eggo.example.com'));
    expect(res.status).toBe(404);
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('500s when the test credentials env is missing', async () => {
    delete process.env.DEV_LOGIN_EMAIL;
    const res = await POST(postRequest());
    expect(res.status).toBe(500);
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('404s when the signed-in account is not flagged seed', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {
        session: { access_token: 'access-123', refresh_token: 'refresh-456' },
        user: { app_metadata: {} },
      },
      error: null,
    });
    const res = await POST(postRequest());
    expect(res.status).toBe(404);
  });

  it('returns the session tokens for a flagged seed account on localhost', async () => {
    const res = await POST(postRequest());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      access_token: 'access-123',
      refresh_token: 'refresh-456',
    });
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'eggo-dev-test@example.com',
      password: 'pw',
    });
  });
});
