import { NextRequest, NextResponse } from 'next/server';
import { isAdminConfigured, verifyAuthToken } from '@/lib/supabase/admin';
import {
  deleteBricksetLink,
  getBricksetLink,
  isBricksetLinkConfigured,
  markBricksetLinkSynced,
  saveBricksetLink,
} from '@/lib/supabase/bricksetLinks';
import {
  BricksetApiError,
  fetchBricksetOwnedSets,
  loginToBrickset,
} from '@/lib/providers/bricksetCollection';
import { BricksetThrottleError, takeBricksetRequestSlot } from '@/lib/providers/bricksetThrottle';
import type { BricksetCollectionResponse } from '@/types';

/**
 * POST /api/brickset/collection
 *
 * Returns every set the caller has marked as owned on Brickset. Backs both
 * "Import from Brickset" and "Sync from Brickset".
 *
 * Two request shapes:
 *   { username, password, remember? }  Sign in to Brickset with these
 *       credentials. They are used for exactly one `login` call and dropped:
 *       nothing stores, logs, or echoes them. With `remember`, the resulting
 *       userHash (never the password) is sealed and kept so later syncs can
 *       skip the sign-in.
 *   { useLink: true }  Use the caller's remembered account. If Brickset has
 *       since invalidated that session the link is removed and the caller is
 *       told to sign in again.
 *
 * The caller must be a signed-in Eggo user, and each user is throttled per
 * kind of Brickset request, so the shared `BRICKSET_API_KEY` quota can't be
 * driven anonymously or used to guess Brickset passwords.
 */

/** Generous upper bound on either credential; Brickset's own limits are far lower. */
const MAX_CREDENTIAL_LENGTH = 200;

/** The body is a couple of short strings and a flag; anything bigger is not a real request. */
const MAX_BODY_BYTES = 4096;

interface CollectionRequestBody {
  username?: unknown;
  password?: unknown;
  remember?: unknown;
  useLink?: unknown;
}

// Bad Brickset credentials are a problem with the submitted form, not with
// the caller's Eggo session, so they must not look like a 401 to anything
// that treats 401 as "signed out". The same goes for an expired link.
const HTTP_STATUS_BY_CODE: Record<BricksetApiError['code'], number> = {
  invalid_credentials: 422,
  invalid_user_hash: 409,
  rate_limited: 429,
  invalid_api_key: 502,
  upstream: 502,
};

function errorResponse(status: number, code: string, error: string): NextResponse {
  return NextResponse.json({ error, code }, { status });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.BRICKSET_API_KEY;
  if (!apiKey || !isAdminConfigured()) {
    return errorResponse(503, 'not_configured', 'Brickset import is not configured');
  }

  const auth = await verifyAuthToken(request.headers.get('authorization'));
  if (!auth) {
    return errorResponse(401, 'unauthorized', 'Sign in required');
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return errorResponse(413, 'bad_request', 'Request too large');
  }

  let body: CollectionRequestBody;
  try {
    body = (await request.json()) as CollectionRequestBody;
  } catch {
    return errorResponse(400, 'bad_request', 'Invalid JSON body');
  }

  try {
    if (body.useLink === true) {
      return await respondWithLinkedCollection(apiKey, auth.uid);
    }

    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (
      !username ||
      !password ||
      username.length > MAX_CREDENTIAL_LENGTH ||
      password.length > MAX_CREDENTIAL_LENGTH
    ) {
      return errorResponse(400, 'bad_request', 'Brickset username and password are required');
    }
    const remember = body.remember === true;

    return await respondWithFreshCollection(apiKey, auth.uid, username, password, remember);
  } catch (error) {
    if (error instanceof BricksetThrottleError) {
      return errorResponse(429, 'too_many_requests', error.message);
    }
    if (error instanceof BricksetApiError) {
      // Log the class of failure only: never the credentials or the hash.
      console.error('[brickset/collection] Brickset error:', error.code);
      return errorResponse(HTTP_STATUS_BY_CODE[error.code], error.code, error.message);
    }
    console.error('[brickset/collection] Unexpected error:', error);
    return errorResponse(502, 'upstream', 'Could not load your Brickset collection');
  }
}

async function respondWithFreshCollection(
  apiKey: string,
  userId: string,
  username: string,
  password: string,
  remember: boolean
): Promise<NextResponse> {
  await takeBricksetRequestSlot(userId, 'login');
  const userHash = await loginToBrickset(apiKey, username, password);

  await takeBricksetRequestSlot(userId, 'fetch');
  const sets = await fetchBricksetOwnedSets(apiKey, userHash);

  let linked = false;
  if (remember && isBricksetLinkConfigured()) {
    await saveBricksetLink(userId, username, userHash);
    linked = true;
  }

  const payload: BricksetCollectionResponse = { username, sets, linked };
  return NextResponse.json(payload);
}

async function respondWithLinkedCollection(apiKey: string, userId: string): Promise<NextResponse> {
  if (!isBricksetLinkConfigured()) {
    return errorResponse(503, 'not_configured', 'Remembered Brickset accounts are not available');
  }
  const link = await getBricksetLink(userId);
  if (!link) {
    return errorResponse(404, 'not_linked', 'No Brickset account is linked');
  }

  await takeBricksetRequestSlot(userId, 'fetch');
  let sets;
  try {
    sets = await fetchBricksetOwnedSets(apiKey, link.userHash);
  } catch (error) {
    if (error instanceof BricksetApiError && error.code === 'invalid_user_hash') {
      // The saved session is dead; drop it so the UI falls back to sign-in.
      await deleteBricksetLink(userId);
      return errorResponse(409, 'link_expired', error.message);
    }
    throw error;
  }
  await markBricksetLinkSynced(userId);

  const payload: BricksetCollectionResponse = { username: link.username, sets, linked: true };
  return NextResponse.json(payload);
}
