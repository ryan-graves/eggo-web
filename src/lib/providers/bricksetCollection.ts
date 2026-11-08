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
 * Hard stop on pagination. 10,000 owned sets is far beyond any real
 * collection; this only guards against a misbehaving `matches` count
 * keeping the loop alive.
 */
const MAX_PAGES = 20;

export type BricksetApiErrorCode =
  | 'invalid_credentials'
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
    });
  } catch {
    throw new BricksetApiError('upstream', 'Could not reach Brickset.');
  }

  if (!response.ok) {
    throw new BricksetApiError('upstream', `Brickset responded with HTTP ${response.status}.`);
  }

  const data = (await response.json()) as T;
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

    for (const set of data.sets) {
      // A set the user has since un-owned can still echo back on the owned
      // filter in edge cases; respect the flag when Brickset provides it.
      if (set.collection?.owned === false) continue;
      if (seen.has(set.setID)) continue;
      seen.add(set.setID);
      owned.push(mapBricksetSetToOwnedSet(set));
    }

    if (data.sets.length < PAGE_SIZE || owned.length >= data.matches) break;
  }

  return owned;
}
