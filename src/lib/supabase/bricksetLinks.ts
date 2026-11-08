import { getAdminClient } from './admin';
import { SecretBoxError, openSecret, parseSecretKey, sealSecret } from '@/lib/crypto/secretBox';

/**
 * Server-only store for remembered Brickset accounts and the Brickset
 * request log. Both tables have RLS enabled with no policies, so they are
 * reachable only through the secret-key client; routes verify the caller's
 * JWT before touching them. The Brickset session hash is sealed with
 * BRICKSET_HASH_KEY before it is written and opened only here.
 */

const LINKS_TABLE = 'brickset_links';
const REQUESTS_TABLE = 'brickset_requests';

export type BricksetRequestKind = 'login' | 'fetch';

export interface BricksetLinkSummary {
  username: string;
  linkedAt: string;
  lastSyncedAt: string | null;
}

export interface BricksetLink extends BricksetLinkSummary {
  userHash: string;
  /** The stored ciphertext, so a later delete can be made conditional on it. */
  ciphertext: string;
}

interface LinkRow {
  user_id: string;
  brickset_username: string;
  user_hash_ciphertext: string;
  linked_at: string;
  last_synced_at: string | null;
}

/**
 * Whether this deployment can remember Brickset accounts at all: the key
 * must be present AND well-formed, so a mistyped key is caught here rather
 * than after a Brickset sign-in has already spent quota.
 */
export function isBricksetLinkConfigured(): boolean {
  const encoded = process.env.BRICKSET_HASH_KEY;
  if (!encoded) return false;
  try {
    parseSecretKey(encoded);
    return true;
  } catch {
    return false;
  }
}

function getKey(): Buffer {
  const encoded = process.env.BRICKSET_HASH_KEY;
  if (!encoded) throw new Error('BRICKSET_HASH_KEY is not set');
  return parseSecretKey(encoded);
}

/** Link status without touching the sealed hash. Safe to call even if the key has changed. */
export async function getBricksetLinkSummary(userId: string): Promise<BricksetLinkSummary | null> {
  const { data, error } = await getAdminClient()
    .from(LINKS_TABLE)
    .select('brickset_username, linked_at, last_synced_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as Pick<LinkRow, 'brickset_username' | 'linked_at' | 'last_synced_at'>;
  return {
    username: row.brickset_username,
    linkedAt: row.linked_at,
    lastSyncedAt: row.last_synced_at,
  };
}

/**
 * The link with its session hash opened. A row sealed under a previous key
 * (or otherwise unreadable) is useless, so it is removed and treated as
 * "not linked": the user simply signs in and remembers the account again.
 */
export async function getBricksetLink(userId: string): Promise<BricksetLink | null> {
  const { data, error } = await getAdminClient()
    .from(LINKS_TABLE)
    .select('user_id, brickset_username, user_hash_ciphertext, linked_at, last_synced_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as LinkRow;
  let userHash: string;
  try {
    userHash = openSecret(row.user_hash_ciphertext, getKey());
  } catch (err) {
    if (!(err instanceof SecretBoxError)) throw err;
    await deleteBricksetLink(userId, row.user_hash_ciphertext);
    return null;
  }
  return {
    username: row.brickset_username,
    userHash,
    ciphertext: row.user_hash_ciphertext,
    linkedAt: row.linked_at,
    lastSyncedAt: row.last_synced_at,
  };
}

/** Remember (or replace) the user's Brickset account. */
export async function saveBricksetLink(
  userId: string,
  username: string,
  userHash: string
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await getAdminClient()
    .from(LINKS_TABLE)
    .upsert(
      {
        user_id: userId,
        brickset_username: username,
        user_hash_ciphertext: sealSecret(userHash, getKey()),
        linked_at: now,
        last_synced_at: now,
        updated_at: now,
      },
      { onConflict: 'user_id' }
    );
  if (error) throw new Error(error.message);
}

/**
 * Forget the link. With `onlyIfCiphertext`, delete only the exact row that
 * was read, so an in-flight request holding a dead session can't wipe a link
 * the user has just re-created in another tab.
 */
export async function deleteBricksetLink(userId: string, onlyIfCiphertext?: string): Promise<void> {
  let query = getAdminClient().from(LINKS_TABLE).delete().eq('user_id', userId);
  if (onlyIfCiphertext !== undefined) query = query.eq('user_hash_ciphertext', onlyIfCiphertext);
  const { error } = await query;
  if (error) throw new Error(error.message);
}

export async function markBricksetLinkSynced(userId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await getAdminClient()
    .from(LINKS_TABLE)
    .update({ last_synced_at: now, updated_at: now })
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

/** How many Brickset requests of a kind the user has made since `since`. */
export async function countRecentBricksetRequests(
  userId: string,
  kind: BricksetRequestKind,
  since: Date
): Promise<number> {
  const { count, error } = await getAdminClient()
    .from(REQUESTS_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('kind', kind)
    .gte('created_at', since.toISOString());
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Log a Brickset request, pruning the user's entries older than a day as we go. */
export async function recordBricksetRequest(
  userId: string,
  kind: BricksetRequestKind
): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase.from(REQUESTS_TABLE).insert({ user_id: userId, kind });
  if (error) throw new Error(error.message);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  // Best effort: a failed prune must not fail the request it rode along with.
  await supabase.from(REQUESTS_TABLE).delete().eq('user_id', userId).lt('created_at', dayAgo);
}
