import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider } from './AuthProvider';
import { useAuth } from '@/hooks/useAuth';
import { identifyUser, resetAnalyticsUser } from '@/lib/analytics';
import { isSupabaseConfigured, signOut, subscribeToAuthChanges, type User } from '@/lib/supabase';

jest.mock('@/lib/analytics', () => ({
  identifyUser: jest.fn(),
  resetAnalyticsUser: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: jest.fn(),
  subscribeToAuthChanges: jest.fn(),
  signInWithGoogle: jest.fn(),
  signOut: jest.fn(),
}));

const mockSubscribe = subscribeToAuthChanges as jest.MockedFunction<typeof subscribeToAuthChanges>;
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;

function wrapper({ children }: { children: ReactNode }): React.JSX.Element {
  return <AuthProvider>{children}</AuthProvider>;
}

function makeUser(overrides: Partial<User>): User {
  return {
    id: 'user-1',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '',
    ...overrides,
  };
}

describe('AuthProvider analytics', () => {
  let emitAuthChange: (user: User | null) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
    mockSubscribe.mockImplementation((callback) => {
      emitAuthChange = callback;
      return jest.fn();
    });
  });

  it('identifies the signed-in user by ID', async () => {
    renderHook(() => useAuth(), { wrapper });

    act(() => emitAuthChange({ id: 'user-1' } as User));

    await waitFor(() => expect(identifyUser).toHaveBeenCalledWith('user-1'));
  });

  it('does not identify anonymous visitors', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => emitAuthChange(null));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(identifyUser).not.toHaveBeenCalled();
  });

  it('does not reset when the first auth resolution is signed out', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => emitAuthChange(null));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(resetAnalyticsUser).not.toHaveBeenCalled();
  });

  it('resets the analytics identity when the user signs out', async () => {
    renderHook(() => useAuth(), { wrapper });

    act(() => emitAuthChange({ id: 'user-1' } as User));
    act(() => emitAuthChange(null));

    await waitFor(() => expect(resetAnalyticsUser).toHaveBeenCalledTimes(1));
  });

  it('resets before identifying a different user on the same browser', async () => {
    renderHook(() => useAuth(), { wrapper });

    act(() => emitAuthChange({ id: 'user-1' } as User));
    act(() => emitAuthChange({ id: 'user-2' } as User));

    await waitFor(() => expect(identifyUser).toHaveBeenLastCalledWith('user-2'));
    expect(resetAnalyticsUser).toHaveBeenCalledTimes(1);
    expect((resetAnalyticsUser as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
      (identifyUser as jest.Mock).mock.invocationCallOrder[1]
    );
  });

  it('keeps the analytics identity across token refreshes', async () => {
    renderHook(() => useAuth(), { wrapper });

    act(() => emitAuthChange({ id: 'user-1' } as User));
    act(() => emitAuthChange({ id: 'user-1' } as User));

    await waitFor(() => expect(identifyUser).toHaveBeenCalledWith('user-1'));
    expect(identifyUser).toHaveBeenCalledTimes(1);
    expect(resetAnalyticsUser).not.toHaveBeenCalled();
  });

  it('keeps the analytics identity when sign-out fails', async () => {
    mockSignOut.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => emitAuthChange({ id: 'user-1' } as User));

    await act(async () => {
      await expect(result.current.signOut()).rejects.toThrow('network down');
    });

    expect(resetAnalyticsUser).not.toHaveBeenCalled();
  });
});

describe('AuthProvider user identity', () => {
  let emitAuthChange: (user: User | null) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
    mockSubscribe.mockImplementation((callback) => {
      emitAuthChange = callback;
      return jest.fn();
    });
  });

  it('keeps the same user object when a refreshed session is for the same account', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const metadata = { full_name: 'Ryan', avatar_url: 'https://example.com/a.png' };

    act(() => emitAuthChange(makeUser({ email: 'r@example.com', user_metadata: metadata })));
    await waitFor(() => expect(result.current.user?.id).toBe('user-1'));
    const firstUser = result.current.user;

    // Supabase builds a fresh object for every event (token refresh, another
    // tab recovering the session, the tab regaining focus).
    act(() => emitAuthChange(makeUser({ email: 'r@example.com', user_metadata: { ...metadata } })));

    expect(result.current.user).toBe(firstUser);
  });

  it('replaces the user when the profile changes', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => emitAuthChange(makeUser({ user_metadata: { full_name: 'Ryan' } })));
    await waitFor(() => expect(result.current.user?.id).toBe('user-1'));
    const firstUser = result.current.user;

    act(() => emitAuthChange(makeUser({ user_metadata: { full_name: 'Ryan G' } })));

    expect(result.current.user).not.toBe(firstUser);
    expect(result.current.user?.user_metadata.full_name).toBe('Ryan G');
  });

  it('replaces the user when a different account signs in', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => emitAuthChange(makeUser({ id: 'user-1' })));
    await waitFor(() => expect(result.current.user?.id).toBe('user-1'));

    act(() => emitAuthChange(makeUser({ id: 'user-2' })));

    expect(result.current.user?.id).toBe('user-2');
  });
});
