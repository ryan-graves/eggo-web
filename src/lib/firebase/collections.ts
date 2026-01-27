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
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFirebaseDb } from './config';
import type { Collection } from '@/types';

const COLLECTIONS_PATH = 'collections';

function getCollectionsRef() {
  return collection(getFirebaseDb(), COLLECTIONS_PATH);
}

function getCollectionDocRef(collectionId: string) {
  return doc(getFirebaseDb(), COLLECTIONS_PATH, collectionId);
}

/**
 * Create a new collection
 */
export async function createCollection(data: {
  name: string;
  owners: string[];
  memberUserIds: string[];
}): Promise<string> {
  const docRef = await addDoc(getCollectionsRef(), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get a single collection by ID
 */
export async function getCollection(collectionId: string): Promise<Collection | null> {
  const docSnap = await getDoc(getCollectionDocRef(collectionId));
  if (!docSnap.exists()) {
    return null;
  }
  return { id: docSnap.id, ...docSnap.data() } as Collection;
}

/**
 * Get all collections for a user
 */
export async function getCollectionsForUser(userId: string): Promise<Collection[]> {
  const q = query(getCollectionsRef(), where('memberUserIds', 'array-contains', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Collection);
}

/**
 * Subscribe to collections for a user (real-time updates)
 */
export function subscribeToCollectionsForUser(
  userId: string,
  callback: (collections: Collection[]) => void
): Unsubscribe {
  const q = query(getCollectionsRef(), where('memberUserIds', 'array-contains', userId));
  return onSnapshot(q, (snapshot) => {
    const collections = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Collection);
    callback(collections);
  });
}

/**
 * Update a collection
 */
export async function updateCollection(
  collectionId: string,
  data: Partial<Pick<Collection, 'name' | 'owners' | 'memberUserIds'>>
): Promise<void> {
  await updateDoc(getCollectionDocRef(collectionId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a collection
 */
export async function deleteCollection(collectionId: string): Promise<void> {
  await deleteDoc(getCollectionDocRef(collectionId));
}

/**
 * Add a member to a collection
 */
export async function addMemberToCollection(collectionId: string, userId: string): Promise<void> {
  const collectionData = await getCollection(collectionId);
  if (!collectionData) {
    throw new Error('Collection not found');
  }
  if (collectionData.memberUserIds.includes(userId)) {
    return; // Already a member
  }
  await updateCollection(collectionId, {
    memberUserIds: [...collectionData.memberUserIds, userId],
  });
}

/**
 * Remove a member from a collection
 */
export async function removeMemberFromCollection(
  collectionId: string,
  userId: string
): Promise<void> {
  const collectionData = await getCollection(collectionId);
  if (!collectionData) {
    throw new Error('Collection not found');
  }
  await updateCollection(collectionId, {
    memberUserIds: collectionData.memberUserIds.filter((id) => id !== userId),
  });
}
