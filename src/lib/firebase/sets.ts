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
import { getSetDataProvider } from '@/lib/providers';
import { removeImageBackground } from '@/lib/image';
import type { LegoSet, CreateLegoSetInput, UpdateLegoSetInput, DataSource } from '@/types';

const SETS_PATH = 'sets';

export interface RefreshSetResult {
  set: LegoSet | null;
  backgroundRemovalError: string | null;
}

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
 * Normalize set data to handle migration from owner (string) to owners (string[])
 * This ensures backward compatibility with existing data in Firestore.
 */
function normalizeSetData(data: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...data };

  // Migrate owner -> owners if needed
  if (!normalized.owners) {
    if (typeof normalized.owner === 'string' && normalized.owner) {
      normalized.owners = [normalized.owner];
    } else {
      normalized.owners = [];
    }
  }

  // Ensure owners is always an array
  if (!Array.isArray(normalized.owners)) {
    normalized.owners = [];
  }

  return normalized;
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
  const data = normalizeSetData(docSnap.data());
  return { id: docSnap.id, ...data } as LegoSet;
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
  return snapshot.docs.map((doc) => {
    const data = normalizeSetData(doc.data());
    return { id: doc.id, ...data } as LegoSet;
  });
}

/**
 * Subscribe to sets for a collection (real-time updates)
 */
export function subscribeToSetsForCollection(
  collectionId: string,
  callback: (sets: LegoSet[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    getSetsRef(),
    where('collectionId', '==', collectionId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const sets = snapshot.docs.map((doc) => {
        const data = normalizeSetData(doc.data());
        return { id: doc.id, ...data } as LegoSet;
      });
      callback(sets);
    },
    (error) => {
      console.error('[subscribeToSetsForCollection] Permission error:', error.message);
      if (onError) {
        onError(error);
      }
    }
  );
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
 * Uses array-contains since a set can have multiple owners
 */
export async function getSetsByOwner(collectionId: string, owner: string): Promise<LegoSet[]> {
  const q = query(
    getSetsRef(),
    where('collectionId', '==', collectionId),
    where('owners', 'array-contains', owner),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = normalizeSetData(doc.data());
    return { id: doc.id, ...data } as LegoSet;
  });
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
  return snapshot.docs.map((doc) => {
    const data = normalizeSetData(doc.data());
    return { id: doc.id, ...data } as LegoSet;
  });
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
  return snapshot.docs.map((doc) => {
    const data = normalizeSetData(doc.data());
    return { id: doc.id, ...data } as LegoSet;
  });
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
  const data = normalizeSetData(doc.data());
  return { id: doc.id, ...data } as LegoSet;
}

/**
 * Find all sets matching a set number within a collection.
 * Returns all copies (a user may own multiples of the same set).
 */
export async function findSetsByNumber(
  collectionId: string,
  setNumber: string
): Promise<LegoSet[]> {
  const q = query(
    getSetsRef(),
    where('collectionId', '==', collectionId),
    where('setNumber', '==', setNumber),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = normalizeSetData(doc.data());
    return { id: doc.id, ...data } as LegoSet;
  });
}

/**
 * Refresh a set's metadata from the external data provider.
 * Updates name, pieceCount, year, theme, subtheme, and imageUrl.
 * Optionally processes images to remove background (if enabled via ENABLE_BACKGROUND_REMOVAL).
 *
 * @returns A result object containing the updated set and any background removal error
 */
export async function refreshSetMetadata(setId: string): Promise<RefreshSetResult> {
  const set = await getSet(setId);
  if (!set) {
    return { set: null, backgroundRemovalError: null };
  }

  const provider = getSetDataProvider();
  const lookupResult = await provider.lookupSet(set.setNumber);

  if (!lookupResult) {
    throw new Error(`Set ${set.setNumber} not found in ${provider.name}`);
  }

  // Try to remove background from image if available
  let processedImageUrl: string | null = null;
  let backgroundRemovalError: string | null = null;

  if (lookupResult.imageUrl) {
    console.log('[refreshSetMetadata] Attempting background removal for:', lookupResult.imageUrl);
    const bgResult = await removeImageBackground(lookupResult.imageUrl, setId);
    processedImageUrl = bgResult.processedImageUrl;
    backgroundRemovalError = bgResult.error;
    console.log(
      '[refreshSetMetadata] Background removal result:',
      bgResult.processedImageUrl ? 'success' : bgResult.skipped ? 'skipped' : 'failed'
    );
  } else {
    console.log('[refreshSetMetadata] No image URL from provider, skipping background removal');
  }

  // Use null values directly to allow clearing stale data in Firestore.
  // Combine all updates into a single Firestore write for efficiency.
  const updates = removeUndefined({
    name: lookupResult.name,
    pieceCount: lookupResult.pieceCount,
    year: lookupResult.year,
    theme: lookupResult.theme,
    subtheme: lookupResult.subtheme,
    imageUrl: lookupResult.imageUrl,
    // Store processed image as custom image if background removal succeeded
    ...(processedImageUrl ? { customImageUrl: processedImageUrl } : {}),
    dataSource: provider.name as DataSource,
    dataSourceId: lookupResult.sourceId,
  } as Record<string, unknown>);

  await updateDoc(getSetDocRef(setId), {
    ...updates,
    lastSyncedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Return the updated set and any background removal error
  const updatedSet = await getSet(setId);
  return { set: updatedSet, backgroundRemovalError };
}
