import {
  readStoredActiveCollectionId,
  resolveActiveCollection,
  storeActiveCollectionId,
} from './activeCollection';
import type { Collection } from '@/types';

function makeCollection(id: string, name = id): Collection {
  return {
    id,
    name,
    owners: ['Ryan'],
    memberUserIds: ['user-1'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('readStoredActiveCollectionId / storeActiveCollectionId', () => {
  it('round-trips a collection id for a user', () => {
    storeActiveCollectionId('user-1', 'coll-a');
    expect(readStoredActiveCollectionId('user-1')).toBe('coll-a');
  });

  it('returns null when nothing has been stored', () => {
    expect(readStoredActiveCollectionId('user-1')).toBeNull();
  });

  it('keeps each user’s choice separate', () => {
    storeActiveCollectionId('user-1', 'coll-a');
    storeActiveCollectionId('user-2', 'coll-b');
    expect(readStoredActiveCollectionId('user-1')).toBe('coll-a');
    expect(readStoredActiveCollectionId('user-2')).toBe('coll-b');
  });

  it('treats an unavailable storage as "nothing stored" instead of throwing', () => {
    const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => storeActiveCollectionId('user-1', 'coll-a')).not.toThrow();
    expect(readStoredActiveCollectionId('user-1')).toBeNull();

    getItem.mockRestore();
    setItem.mockRestore();
  });
});

describe('resolveActiveCollection', () => {
  const newest = makeCollection('coll-new', 'Newest');
  const older = makeCollection('coll-old', 'Older');
  const collections = [newest, older];

  it('prefers the remembered collection when the user still belongs to it', () => {
    expect(resolveActiveCollection(collections, 'coll-old')).toBe(older);
  });

  it('falls back to the first (newest) collection when the remembered one is gone', () => {
    expect(resolveActiveCollection(collections, 'coll-deleted')).toBe(newest);
  });

  it('falls back to the first collection when nothing is remembered', () => {
    expect(resolveActiveCollection(collections, null)).toBe(newest);
  });

  it('returns null for an empty list', () => {
    expect(resolveActiveCollection([], 'coll-old')).toBeNull();
  });
});
