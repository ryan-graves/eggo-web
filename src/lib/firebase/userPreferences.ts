import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { getFirebaseDb } from './config';
import type { UserPreferences, ThemePreference, UITheme } from '@/types';

const COLLECTION = 'userPreferences';

/**
 * Get user preferences from Firestore
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  const db = getFirebaseDb();
  const docRef = doc(db, COLLECTION, userId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return docSnap.data() as UserPreferences;
}

/**
 * Set user preferences in Firestore
 */
export async function setUserPreferences(
  userId: string,
  preferences: Partial<Omit<UserPreferences, 'updatedAt'>>
): Promise<void> {
  const db = getFirebaseDb();
  const docRef = doc(db, COLLECTION, userId);

  await setDoc(
    docRef,
    {
      ...preferences,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Update theme preference
 */
export async function updateThemePreference(
  userId: string,
  theme: ThemePreference
): Promise<void> {
  await setUserPreferences(userId, { theme });
}

/**
 * Update UI theme preference
 */
export async function updateUIThemePreference(
  userId: string,
  uiTheme: UITheme
): Promise<void> {
  await setUserPreferences(userId, { uiTheme });
}

/**
 * Subscribe to user preferences changes
 */
export function subscribeToUserPreferences(
  userId: string,
  callback: (preferences: UserPreferences | null) => void,
  onError?: (error: Error) => void
): () => void {
  const db = getFirebaseDb();
  const docRef = doc(db, COLLECTION, userId);

  return onSnapshot(
    docRef,
    (docSnap) => {
      if (!docSnap.exists()) {
        callback(null);
        return;
      }
      callback(docSnap.data() as UserPreferences);
    },
    (error) => {
      console.error('[subscribeToUserPreferences] Permission error:', error.message);
      if (onError) {
        onError(error);
      }
    }
  );
}
