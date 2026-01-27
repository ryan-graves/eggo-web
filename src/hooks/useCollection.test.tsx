import { renderHook } from '@testing-library/react';
import { useCollection } from './useCollection';

describe('useCollection', () => {
  it('throws error when used outside CollectionProvider', () => {
    expect(() => {
      renderHook(() => useCollection());
    }).toThrow('useCollection must be used within a CollectionProvider');
  });
});
