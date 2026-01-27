import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFirebaseDb } from './config';
import type { LegoSet, CreateLegoSetInput, UpdateLegoSetInput } from '@/types';

const SETS_PATH = 'sets';

function getSetsRef() {
  return collection(getFirebaseDb(), SETS_PATH);
}

function getSetDocRef(setId: string) {
  return doc(getFirebaseDb(), SETS_PATH, setId);
}

/**
 * Remove undefined values from an object (Firestore doesn't accept undefined)
 */
function removeUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

/**
 * Create a new Lego set
 */
export async function createSet(data: CreateLegoSetInput): Promise<string> {
  const cleanData = removeUndefined(data as Record<string, unknown>);
  const docRef = await addDoc(getSetsRef(), {
    ...cleanData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get a single set by ID
 */
export async function getSet(setId: string): Promise<LegoSet | null> {
  const docSnap = await getDoc(getSetDocRef(setId));
  if (!docSnap.exists()) {
    return null;
  }
  return { id: docSnap.id, ...docSnap.data() } as LegoSet;
}

/**
 * Get all sets for a collection
 */
export async function getSetsForCollection(collectionId: string): Promise<LegoSet[]> {
  const q = query(
    getSetsRef(),
    where('collectionId', '==', collectionId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as LegoSet);
}

/**
 * Subscribe to sets for a collection (real-time updates)
 */
export function subscribeToSetsForCollection(
  collectionId: string,
  callback: (sets: LegoSet[]) => void
): Unsubscribe {
  const q = query(
    getSetsRef(),
    where('collectionId', '==', collectionId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const sets = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as LegoSet);
    callback(sets);
  });
}

/**
 * Update a set
 */
export async function updateSet(setId: string, data: UpdateLegoSetInput): Promise<void> {
  const cleanData = removeUndefined(data as Record<string, unknown>);
  await updateDoc(getSetDocRef(setId), {
    ...cleanData,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a set
 */
export async function deleteSet(setId: string): Promise<void> {
  await deleteDoc(getSetDocRef(setId));
}

/**
 * Get sets by owner within a collection
 */
export async function getSetsByOwner(collectionId: string, owner: string): Promise<LegoSet[]> {
  const q = query(
    getSetsRef(),
    where('collectionId', '==', collectionId),
    where('owner', '==', owner),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as LegoSet);
}

/**
 * Get sets by status within a collection
 */
export async function getSetsByStatus(
  collectionId: string,
  status: LegoSet['status']
): Promise<LegoSet[]> {
  const q = query(
    getSetsRef(),
    where('collectionId', '==', collectionId),
    where('status', '==', status),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as LegoSet);
}

/**
 * Get sets by theme within a collection
 */
export async function getSetsByTheme(collectionId: string, theme: string): Promise<LegoSet[]> {
  const q = query(
    getSetsRef(),
    where('collectionId', '==', collectionId),
    where('theme', '==', theme),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as LegoSet);
}

/**
 * Search sets by set number within a collection
 */
export async function findSetByNumber(
  collectionId: string,
  setNumber: string
): Promise<LegoSet | null> {
  const q = query(
    getSetsRef(),
    where('collectionId', '==', collectionId),
    where('setNumber', '==', setNumber)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as LegoSet;
}
