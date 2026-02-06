import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { isAdminConfigured, getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';

/**
 * POST /api/collections - Create a new collection
 *
 * Uses the Firebase Admin SDK to bypass client-side Firestore security rules.
 * The client security rules use `resource.data` for write operations, which
 * fails for CREATE (new documents) because `resource.data` is null.
 * The Admin SDK bypasses these rules entirely.
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

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const body = await request.json();
    const { name, owners } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!Array.isArray(owners) || owners.length === 0) {
      return NextResponse.json({ error: 'At least one owner is required' }, { status: 400 });
    }

    const db = getAdminFirestore();
    const docRef = await db.collection('collections').add({
      name: name.trim(),
      owners,
      memberUserIds: [userId],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ id: docRef.id });
  } catch (error) {
    console.error('[POST /api/collections] Error:', error);

    if (error instanceof Error && error.message.includes('auth')) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 });
  }
}
