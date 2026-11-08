import { NextRequest, NextResponse } from 'next/server';
import { isAdminConfigured, verifyAuthToken } from '@/lib/supabase/admin';
import {
  BricksetApiError,
  fetchBricksetOwnedSets,
  loginToBrickset,
} from '@/lib/providers/bricksetCollection';
import type { BricksetCollectionResponse } from '@/types';

/**
 * POST /api/brickset/collection
 *
 * Signs in to Brickset with the caller's Brickset username and password and
 * returns every set they have marked as owned. Backs the "Import from
 * Brickset" flow.
 *
 * The credentials are used for exactly one Brickset `login` call and then
 * dropped: nothing here stores, logs, or echoes them, and the resulting
 * userHash never leaves the server. The caller must be a signed-in Eggo
 * user so the shared `BRICKSET_API_KEY` quota can't be driven anonymously.
 */

/** Generous upper bound on either credential; Brickset's own limits are far lower. */
const MAX_CREDENTIAL_LENGTH = 200;

interface CollectionRequestBody {
  username?: unknown;
  password?: unknown;
}

const HTTP_STATUS_BY_CODE: Record<BricksetApiError['code'], number> = {
  invalid_credentials: 401,
  rate_limited: 429,
  invalid_api_key: 502,
  upstream: 502,
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.BRICKSET_API_KEY;
  if (!apiKey || !isAdminConfigured()) {
    return NextResponse.json(
      { error: 'Brickset import is not configured', code: 'not_configured' },
      { status: 503 }
    );
  }

  const auth = await verifyAuthToken(request.headers.get('authorization'));
  if (!auth) {
    return NextResponse.json({ error: 'Sign in required', code: 'unauthorized' }, { status: 401 });
  }

  let body: CollectionRequestBody;
  try {
    body = (await request.json()) as CollectionRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body', code: 'bad_request' }, { status: 400 });
  }

  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (
    !username ||
    !password ||
    username.length > MAX_CREDENTIAL_LENGTH ||
    password.length > MAX_CREDENTIAL_LENGTH
  ) {
    return NextResponse.json(
      { error: 'Brickset username and password are required', code: 'bad_request' },
      { status: 400 }
    );
  }

  try {
    const userHash = await loginToBrickset(apiKey, username, password);
    const sets = await fetchBricksetOwnedSets(apiKey, userHash);
    const payload: BricksetCollectionResponse = { username, sets };
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof BricksetApiError) {
      // Log the class of failure only: never the credentials or the hash.
      console.error('[brickset/collection] Brickset error:', error.code);
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: HTTP_STATUS_BY_CODE[error.code] }
      );
    }
    console.error('[brickset/collection] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Could not load your Brickset collection', code: 'upstream' },
      { status: 502 }
    );
  }
}
