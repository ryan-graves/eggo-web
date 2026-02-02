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
  limit,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFirebaseDb } from './config';
import type { Collection, PublicViewSettings } from '@/types';

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

/**
 * Generate a unique share token for public sharing
 * Uses crypto.getRandomValues() for secure random generation
 */
function generateShareToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const randomValues = new Uint8Array(12);
  crypto.getRandomValues(randomValues);
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(randomValues[i] % chars.length);
  }
  return token;
}

/**
 * Get a collection by its public share token
 */
export async function getCollectionByShareToken(shareToken: string): Promise<Collection | null> {
  // Validate token format (must be 12 alphanumeric characters)
  if (!shareToken || shareToken.length !== 12 || !/^[A-Za-z0-9]+$/.test(shareToken)) {
    return null;
  }

  const q = query(
    getCollectionsRef(),
    where('publicShareToken', '==', shareToken),
    where('isPublic', '==', true),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Collection;
}

/**
 * Enable public sharing for a collection
 */
export async function enablePublicSharing(
  collectionId: string,
  viewSettings: PublicViewSettings
): Promise<string> {
  const collectionData = await getCollection(collectionId);
  if (!collectionData) {
    throw new Error('Collection not found');
  }

  // Use existing token if available, otherwise generate new one
  const shareToken = collectionData.publicShareToken || generateShareToken();

  await updateDoc(getCollectionDocRef(collectionId), {
    isPublic: true,
    publicShareToken: shareToken,
    publicViewSettings: viewSettings,
    updatedAt: serverTimestamp(),
  });

  return shareToken;
}

/**
 * Disable public sharing for a collection
 */
export async function disablePublicSharing(collectionId: string): Promise<void> {
  await updateDoc(getCollectionDocRef(collectionId), {
    isPublic: false,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update public view settings for a collection
 */
export async function updatePublicViewSettings(
  collectionId: string,
  viewSettings: PublicViewSettings
): Promise<void> {
  await updateDoc(getCollectionDocRef(collectionId), {
    publicViewSettings: viewSettings,
    updatedAt: serverTimestamp(),
  });
}
