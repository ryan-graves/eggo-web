import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getStorage, type Storage } from 'firebase-admin/storage';

/**
 * Firebase Admin SDK configuration for server-side operations.
 *
 * This is used by API routes that need to perform privileged operations
 * like uploading to Storage without user authentication context.
 *
 * Required environment variables:
 * - NEXT_PUBLIC_FIREBASE_PROJECT_ID: Your Firebase project ID (reused from client config)
 * - FIREBASE_CLIENT_EMAIL: Service account email
 * - FIREBASE_PRIVATE_KEY: Service account private key (with \n for newlines)
 * - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: Storage bucket name
 *
 * To get these values:
 * 1. Go to Firebase Console > Project Settings > Service Accounts
 * 2. Click "Generate new private key"
 * 3. Copy the values from the downloaded JSON file
 */

let adminApp: App | null = null;
let adminStorage: Storage | null = null;

function getPrivateKey(): string | undefined {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) return undefined;
  // Handle escaped newlines from environment variables
  return key.replace(/\\n/g, '\n');
}

export function isAdminConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  );
}

function getAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  if (!isAdminConfigured()) {
    throw new Error(
      'Firebase Admin is not configured. Please set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY environment variables.'
    );
  }

  adminApp = initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: getPrivateKey(),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });

  return adminApp;
}

export function getAdminStorage(): Storage {
  if (!adminStorage) {
    adminStorage = getStorage(getAdminApp());
  }
  return adminStorage;
}

/**
 * Upload an image buffer to Firebase Storage and return the public URL.
 *
 * @param buffer - The image data as a Buffer
 * @param path - The storage path (e.g., 'processed-images/set-123.png')
 * @param contentType - The MIME type (e.g., 'image/png')
 * @returns The public URL of the uploaded file
 */
export async function uploadToStorage(
  buffer: Buffer,
  path: string,
  contentType: string
): Promise<string> {
  const storage = getAdminStorage();
  const bucket = storage.bucket();
  const file = bucket.file(path);

  await file.save(buffer, {
    metadata: {
      contentType,
      cacheControl: 'public, max-age=2592000', // Cache for 30 days (allows re-processing with improved algorithms)
    },
  });

  // Note: We rely on bucket-level permissions for public access.
  // The bucket should have "allUsers" granted "Storage Object Viewer" role.
  // This is required because uniform bucket-level access doesn't allow per-object ACLs.

  // Return the public URL
  return `https://storage.googleapis.com/${bucket.name}/${path}`;
}
