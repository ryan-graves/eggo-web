import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { CollectionProvider, useCollection } from './useCollection';
import { useAuth } from '@/hooks/useAuth';
import { subscribeToCollectionsForUser, subscribeToSetsForCollection } from '@/lib/supabase';
import type { User } from '@/lib/supabase';
import type { Collection, LegoSet } from '@/types';

jest.mock('@/hooks/useAuth', () => ({ useAuth: jest.fn() }));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockSubscribeCollections = subscribeToCollectionsForUser as jest.MockedFunction<
  typeof subscribeToCollectionsForUser
>;
const mockSubscribeSets = subscribeToSetsForCollection as jest.MockedFunction<
  typeof subscribeToSetsForCollection
>;

const collection: Collection = {
  id: 'collection-1',
  name: 'The Graves Collection',
  owners: ['Ryan'],
  memberUserIds: ['user-1'],
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
};

const set = { id: 'set-1', collectionId: 'collection-1', name: 'Boat House' } as LegoSet;

function makeUser(id: string): User {
  return { id, app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '' } as User;
}

function wrapper({ children }: { children: ReactNode }): React.JSX.Element {
  return <CollectionProvider>{children}</CollectionProvider>;
}

describe('useCollection', () => {
  it('throws error when used outside CollectionProvider', () => {
    expect(() => {
      renderHook(() => useCollection());
    }).toThrow('useCollection must be used within a CollectionProvider');
  });
});

describe('CollectionProvider auth changes', () => {
  const unsubscribeCollections = jest.fn();
  const unsubscribeSets = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribeCollections.mockImplementation((_userId, callback) => {
      callback([collection]);
      return unsubscribeCollections;
    });
    mockSubscribeSets.mockImplementation((_collectionId, _userId, callback) => {
      callback([set]);
      return unsubscribeSets;
    });
  });

  function signIn(user: User): void {
    mockUseAuth.mockReturnValue({
      user,
      loading: false,
      error: null,
      signInWithGoogle: jest.fn(),
      signOut: jest.fn(),
    });
  }

  it('keeps the loaded collection when the same account gets a refreshed user object', () => {
    signIn(makeUser('user-1'));
    const { result, rerender } = renderHook(() => useCollection(), { wrapper });
    expect(result.current.isInitializing).toBe(false);
    expect(result.current.sets).toEqual([set]);

    // Supabase emits a new user object on token refresh, tab focus, and when
    // another tab recovers the session. None of that is a new user.
    signIn(makeUser('user-1'));
    act(() => rerender());

    expect(mockSubscribeCollections).toHaveBeenCalledTimes(1);
    expect(unsubscribeCollections).not.toHaveBeenCalled();
    expect(result.current.isInitializing).toBe(false);
    expect(result.current.activeCollection).toEqual(collection);
    expect(result.current.sets).toEqual([set]);
  });

  it('restarts the collection stream when a different account signs in', () => {
    signIn(makeUser('user-1'));
    const { rerender } = renderHook(() => useCollection(), { wrapper });

    signIn(makeUser('user-2'));
    act(() => rerender());

    expect(unsubscribeCollections).toHaveBeenCalledTimes(1);
    expect(mockSubscribeCollections).toHaveBeenCalledTimes(2);
    expect(mockSubscribeCollections).toHaveBeenLastCalledWith(
      'user-2',
      expect.any(Function),
      expect.any(Function)
    );
  });
});
