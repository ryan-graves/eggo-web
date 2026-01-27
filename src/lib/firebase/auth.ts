import {
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth } from './config';

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<User> {
  const auth = getFirebaseAuth();
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();
  await firebaseSignOut(auth);
}

export function subscribeToAuthChanges(callback: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  const auth = getFirebaseAuth();
  return auth.currentUser;
}
