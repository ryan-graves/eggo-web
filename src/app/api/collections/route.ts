import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, isAdminConfigured, verifyAuthToken } from '@/lib/supabase/admin';

const MAX_OWNERS = 20;
const MAX_STRING_LENGTH = 200;

/**
 * POST /api/collections — Create a new collection.
 *
 * Uses the Supabase secret-key client to bypass RLS, mirroring the previous
 * Firebase Admin SDK pattern. The collection row is created and the calling
 * user's auth.users.id is inserted into collection_members in a single
 * sequence — both succeed or the row gets cleaned up.
 *
 * Expects:
 * - Authorization: Bearer <Supabase access token>
 * - Body: { name: string, owners: string[] }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: 'Server is not configured for this operation' },
      { status: 503 }
    );
  }

  const authResult = await verifyAuthToken(request.headers.get('Authorization'));
  if (!authResult) {
    return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
  }
  const userId = authResult.uid;

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
    if (trimmed.length === 0) continue;
    if (trimmed.length > MAX_STRING_LENGTH) {
      return NextResponse.json({ error: 'Owner name is too long' }, { status: 400 });
    }
    if (!sanitizedOwners.includes(trimmed)) {
      sanitizedOwners.push(trimmed);
    }
  }

  if (sanitizedOwners.length === 0) {
    return NextResponse.json(
      { error: 'At least one non-empty owner is required' },
      { status: 400 }
    );
  }

  const supabase = getAdminClient();

  // Insert the collection
  const { data: collectionRow, error: collectionError } = await supabase
    .from('collections')
    .insert({ name: name.trim(), owners: sanitizedOwners })
    .select('id')
    .single();
  if (collectionError || !collectionRow) {
    console.error('[POST /api/collections] insert collection failed:', collectionError);
    return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 });
  }

  // Insert the creator as the first member
  const { error: memberError } = await supabase
    .from('collection_members')
    .insert({ collection_id: collectionRow.id, user_id: userId });
  if (memberError) {
    console.error('[POST /api/collections] insert member failed; rolling back collection:', memberError);
    await supabase.from('collections').delete().eq('id', collectionRow.id);
    return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 });
  }

  return NextResponse.json({ id: collectionRow.id });
}
