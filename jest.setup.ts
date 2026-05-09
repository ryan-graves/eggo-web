import '@testing-library/jest-dom';

// Polyfill fetch for Supabase in Node.js test environment
if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn();
}

// Mock Supabase modules to avoid initialization errors in tests
jest.mock('@/lib/supabase', () => ({
  subscribeToAuthChanges: jest.fn(),
  signInWithGoogle: jest.fn(),
  signOut: jest.fn(),
  subscribeToCollectionsForUser: jest.fn(),
  subscribeToSetsForCollection: jest.fn(),
  subscribeToUserPreferences: jest.fn(),
  createCollection: jest.fn(),
  setUserPreferences: jest.fn(),
}));
