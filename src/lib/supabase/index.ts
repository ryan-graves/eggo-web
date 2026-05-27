export { getSupabaseClient } from './client';
export { isSupabaseConfigured, getSupabaseUrl, getSupabasePublishableKey } from './config';
export {
  signInWithGoogle,
  signOut,
  subscribeToAuthChanges,
  getCurrentUser,
  getAccessToken,
  type User,
} from './auth';
export {
  createCollection,
  getCollection,
  getCollectionsForUser,
  subscribeToCollectionsForUser,
  updateCollection,
  deleteCollection,
  addMemberToCollection,
  removeMemberFromCollection,
  getCollectionByShareToken,
  enablePublicSharing,
  disablePublicSharing,
  updatePublicViewSettings,
} from './collections';
export {
  createSet,
  getSet,
  getSetsForCollection,
  subscribeToSetsForCollection,
  updateSet,
  deleteSet,
  getSetsByOwner,
  getSetsByStatus,
  getSetsByTheme,
  findSetByNumber,
  findSetsByNumber,
  refreshSetMetadata,
  type RefreshSetResult,
} from './sets';
export {
  getUserPreferences,
  setUserPreferences,
  updateThemePreference,
  updateHomeSections,
  subscribeToUserPreferences,
} from './userPreferences';
