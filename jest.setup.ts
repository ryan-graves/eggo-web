import '@testing-library/jest-dom';

// Polyfill fetch for Firebase in Node.js test environment
if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn();
}

// Mock Firebase modules to avoid initialization errors in tests
jest.mock('@/lib/firebase', () => ({
  subscribeToAuthChanges: jest.fn(),
  signInWithGoogle: jest.fn(),
  signOut: jest.fn(),
  subscribeToCollectionsForUser: jest.fn(),
  subscribeToSetsForCollection: jest.fn(),
  createCollection: jest.fn(),
}));
