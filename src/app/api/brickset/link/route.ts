import { NextRequest, NextResponse } from 'next/server';
import { isAdminConfigured, verifyAuthToken } from '@/lib/supabase/admin';
import {
  deleteBricksetLink,
  getBricksetLink,
  isBricksetLinkConfigured,
} from '@/lib/supabase/bricksetLinks';
import type { BricksetLinkStatus } from '@/types';

/**
 * /api/brickset/link — the caller's remembered Brickset account.
 *
 *   GET     Whether an account is linked (username and timestamps only; the
 *           session hash never leaves the server) and whether linking is
 *           available on this deployment.
 *   DELETE  Forget the linked account.
 */

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: 'Not configured', code: 'not_configured' }, { status: 503 });
  }
  const auth = await verifyAuthToken(request.headers.get('authorization'));
  if (!auth) {
    return NextResponse.json({ error: 'Sign in required', code: 'unauthorized' }, { status: 401 });
  }

  const available = isBricksetLinkConfigured();
  if (!available) {
    const payload: BricksetLinkStatus = { available: false, linked: false };
    return NextResponse.json(payload);
  }

  try {
    const link = await getBricksetLink(auth.uid);
    const payload: BricksetLinkStatus = link
      ? {
          available: true,
          linked: true,
          username: link.username,
          linkedAt: link.linkedAt,
          lastSyncedAt: link.lastSyncedAt,
        }
      : { available: true, linked: false };
    return NextResponse.json(payload);
  } catch (error) {
    console.error('[brickset/link] Lookup failed:', error);
    return NextResponse.json(
      { error: 'Could not check the Brickset link', code: 'upstream' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: 'Not configured', code: 'not_configured' }, { status: 503 });
  }
  const auth = await verifyAuthToken(request.headers.get('authorization'));
  if (!auth) {
    return NextResponse.json({ error: 'Sign in required', code: 'unauthorized' }, { status: 401 });
  }

  try {
    await deleteBricksetLink(auth.uid);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[brickset/link] Delete failed:', error);
    return NextResponse.json(
      { error: 'Could not unlink the Brickset account', code: 'upstream' },
      { status: 500 }
    );
  }
}
