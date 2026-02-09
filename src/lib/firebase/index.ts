export { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from './config';
export { signInWithGoogle, signOut, subscribeToAuthChanges, getCurrentUser } from './auth';
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
  updateUIThemePreference,
  updateHomeSections,
  subscribeToUserPreferences,
} from './userPreferences';
