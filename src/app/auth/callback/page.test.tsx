import { render, screen, waitFor } from '@testing-library/react';
import AuthCallbackPage from './page';
import { getSupabaseClient } from '@/lib/supabase';

const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@/lib/supabase', () => ({
  getSupabaseClient: jest.fn(),
}));

const mockGetSession = jest.fn();
const mockExchange = jest.fn();

function setUrl(search: string): void {
  window.history.replaceState(null, '', `/auth/callback${search}`);
}

describe('AuthCallbackPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSupabaseClient as jest.Mock).mockReturnValue({
      auth: { getSession: mockGetSession, exchangeCodeForSession: mockExchange },
    });
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockExchange.mockResolvedValue({ data: {}, error: null });
  });

  it('sends provider errors back to the landing page', () => {
    setUrl('?error=access_denied&error_description=User%20cancelled');

    render(<AuthCallbackPage />);

    expect(mockReplace).toHaveBeenCalledWith('/?error=User%20cancelled');
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it('goes home when supabase-js already exchanged the code on init', async () => {
    setUrl('?code=abc');
    mockGetSession.mockResolvedValue({ data: { session: { user: {} } }, error: null });

    render(<AuthCallbackPage />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    expect(mockExchange).not.toHaveBeenCalled();
  });

  it('exchanges the code explicitly when no session exists yet', async () => {
    setUrl('?code=abc');

    render(<AuthCallbackPage />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    expect(mockExchange).toHaveBeenCalledWith('abc');
  });

  it('shows the exchange error instead of stalling', async () => {
    setUrl('?code=abc');
    mockExchange.mockResolvedValue({
      data: {},
      error: { message: 'PKCE code verifier not found in storage' },
    });

    render(<AuthCallbackPage />);

    expect(
      await screen.findByText('Sign-in failed: PKCE code verifier not found in storage')
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return to Eggo' })).toHaveAttribute('href', '/');
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('explains a callback that carries no code', async () => {
    setUrl('');

    render(<AuthCallbackPage />);

    expect(
      await screen.findByText('Sign-in failed: No sign-in code was returned. Please try again.')
    ).toBeInTheDocument();
    expect(mockGetSession).not.toHaveBeenCalled();
  });
});
