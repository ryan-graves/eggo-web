import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { FirebaseAuthError } from 'firebase-admin/auth';
import { isAdminConfigured, getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';

const MAX_OWNERS = 20;
const MAX_STRING_LENGTH = 200;

/**
 * POST /api/collections - Create a new collection
 *
 * Uses the Firebase Admin SDK so that collection creation works regardless
 * of whether the deployed Firestore security rules properly handle CREATE
 * operations (CREATE requires `request.resource.data`, not `resource.data`).
 *
 * Expects:
 * - Authorization: Bearer <Firebase ID token>
 * - Body: { name: string, owners: string[] }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: 'Server is not configured for this operation' },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
  }

  const idToken = authHeader.substring(7);

  let decodedToken;
  try {
    decodedToken = await getAdminAuth().verifyIdToken(idToken);
  } catch (error) {
    if (error instanceof FirebaseAuthError) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }
    console.error('[POST /api/collections] Auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }

  const userId = decodedToken.uid;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const { name, owners } = body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  if (name.trim().length > MAX_STRING_LENGTH) {
    return NextResponse.json({ error: 'Name is too long' }, { status: 400 });
  }

  if (!Array.isArray(owners) || owners.length === 0) {
    return NextResponse.json({ error: 'At least one owner is required' }, { status: 400 });
  }

  if (owners.length > MAX_OWNERS) {
    return NextResponse.json({ error: 'Too many owners' }, { status: 400 });
  }

  const sanitizedOwners: string[] = [];
  for (const owner of owners) {
    if (typeof owner !== 'string') {
      return NextResponse.json({ error: 'Each owner must be a string' }, { status: 400 });
    }
    const trimmed = owner.trim();
    if (trimmed.length === 0) {
      continue;
    }
    if (trimmed.length > MAX_STRING_LENGTH) {
      return NextResponse.json({ error: 'Owner name is too long' }, { status: 400 });
    }
    if (!sanitizedOwners.includes(trimmed)) {
      sanitizedOwners.push(trimmed);
    }
  }

  if (sanitizedOwners.length === 0) {
    return NextResponse.json({ error: 'At least one non-empty owner is required' }, { status: 400 });
  }

  try {
    const db = getAdminFirestore();
    const docRef = await db.collection('collections').add({
      name: name.trim(),
      owners: sanitizedOwners,
      memberUserIds: [userId],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ id: docRef.id });
  } catch (error) {
    console.error('[POST /api/collections] Firestore error:', error);
    return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 });
  }
}
