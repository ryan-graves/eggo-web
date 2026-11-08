import { mapBricksetSetToOwnedSet, type BricksetSetsResponse } from './bricksetMapping';
import type { BricksetOwnedSet } from '@/types';

/**
 * Server-only Brickset API v3 client for reading a user's own collection.
 *
 * Brickset has no OAuth: the only way to read someone's collection is
 * `login(apiKey, username, password)`, which returns a `userHash` that the
 * `owned: 1` filter on `getSets` then honors. Everything here POSTs form
 * bodies so the password never lands in a URL (and therefore never in a
 * request log), and nothing here logs or persists the credentials or hash.
 *
 * Runs on the server because it needs `BRICKSET_API_KEY`; the browser reaches
 * it through `POST /api/brickset/collection`.
 */

const BRICKSET_API_BASE = 'https://brickset.com/api/v3.asmx';

/** Brickset's documented maximum for `pageSize`. */
const PAGE_SIZE = 500;

/**
 * Hard stop on pagination. 5,000 owned sets is far beyond any real
 * collection; this bounds how much of the shared daily quota one request
 * can spend and guards against a misbehaving `matches` count.
 */
const MAX_PAGES = 10;

/** Per-call ceiling so a stalled Brickset fails cleanly instead of hitting the platform's function timeout. */
const UPSTREAM_TIMEOUT_MS = 15_000;

export type BricksetApiErrorCode =
  | 'invalid_credentials'
  /** A stored userHash Brickset no longer accepts: the user must sign in again. */
  | 'invalid_user_hash'
  | 'invalid_api_key'
  | 'rate_limited'
  | 'upstream';

export class BricksetApiError extends Error {
  readonly code: BricksetApiErrorCode;

  constructor(code: BricksetApiErrorCode, message: string) {
    super(message);
    this.name = 'BricksetApiError';
    this.code = code;
  }
}

interface BricksetStatusResponse {
  status: string;
  message?: string;
}

interface BricksetLoginResponse extends BricksetStatusResponse {
  hash?: string;
}

/**
 * Brickset reports every failure as `{ status: 'error', message }` with a
 * 200. Map the handful of messages the import flow needs to distinguish
 * onto stable codes; anything else is an upstream failure.
 */
function classifyBricksetError(message: string | undefined): BricksetApiError {
  const normalized = (message ?? '').toLowerCase();

  if (normalized.includes('invalid username or password')) {
    return new BricksetApiError(
      'invalid_credentials',
      'Brickset did not recognize that username and password.'
    );
  }
  if (normalized.includes('invalid user hash')) {
    return new BricksetApiError(
      'invalid_user_hash',
      'Brickset no longer recognizes the saved sign-in. Please sign in again.'
    );
  }
  if (normalized.includes('invalid api key')) {
    return new BricksetApiError('invalid_api_key', 'The Brickset API key was rejected.');
  }
  if (normalized.includes('api limit')) {
    return new BricksetApiError(
      'rate_limited',
      'Brickset has reached its daily request limit. Please try again tomorrow.'
    );
  }
  return new BricksetApiError('upstream', message || 'Brickset returned an error.');
}

async function callBrickset<T extends BricksetStatusResponse>(
  method: string,
  form: Record<string, string>
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BRICKSET_API_BASE}/${method}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(form).toString(),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    throw new BricksetApiError('upstream', 'Could not reach Brickset.');
  }

  if (!response.ok) {
    throw new BricksetApiError('upstream', `Brickset responded with HTTP ${response.status}.`);
  }

  let data: T;
  try {
    data = (await response.json()) as T;
  } catch {
    throw new BricksetApiError('upstream', 'Brickset returned an unreadable response.');
  }
  if (data.status !== 'success') {
    throw classifyBricksetError(data.message);
  }
  return data;
}

/**
 * Exchange a Brickset username and password for a userHash.
 * The hash is what later calls use; the password is never needed again.
 */
export async function loginToBrickset(
  apiKey: string,
  username: string,
  password: string
): Promise<string> {
  const data = await callBrickset<BricksetLoginResponse>('login', {
    apiKey,
    username,
    password,
  });
  if (!data.hash) {
    throw new BricksetApiError('upstream', 'Brickset did not return a session.');
  }
  return data.hash;
}

/**
 * Fetch every set the user has marked as owned, with full metadata,
 * paging through `getSets` until the reported match count is reached.
 */
export async function fetchBricksetOwnedSets(
  apiKey: string,
  userHash: string
): Promise<BricksetOwnedSet[]> {
  const seen = new Set<number>();
  const owned: BricksetOwnedSet[] = [];
  // Records Brickset has sent so far, including ones skipped below. The
  // exit test compares this to `matches`, not `owned.length`, so a skipped
  // record can't make the loop spend an extra page.
  let received = 0;
  let matches = 0;

  for (let pageNumber = 1; pageNumber <= MAX_PAGES; pageNumber++) {
    const data = await callBrickset<BricksetSetsResponse>('getSets', {
      apiKey,
      userHash,
      // Brickset documents params as string values, so send them that way.
      params: JSON.stringify({
        owned: '1',
        orderBy: 'Number',
        pageSize: String(PAGE_SIZE),
        pageNumber: String(pageNumber),
      }),
    });
    if (!Array.isArray(data.sets)) {
      throw new BricksetApiError('upstream', 'Brickset returned an unreadable response.');
    }

    matches = data.matches;
    received += data.sets.length;
    for (const set of data.sets) {
      // A set the user has since un-owned can still echo back on the owned
      // filter in edge cases; respect the flag when Brickset provides it.
      if (set.collection?.owned === false) continue;
      if (seen.has(set.setID)) continue;
      seen.add(set.setID);
      owned.push(mapBricksetSetToOwnedSet(set));
    }

    if (data.sets.length < PAGE_SIZE || received >= matches) return owned;
  }

  // Ran out of pages with Brickset still reporting more. Surface it rather
  // than hand back a silently truncated collection.
  throw new BricksetApiError(
    'upstream',
    `This Brickset collection has more than ${(MAX_PAGES * PAGE_SIZE).toLocaleString()} owned sets, which is more than Eggo can import at once.`
  );
}
