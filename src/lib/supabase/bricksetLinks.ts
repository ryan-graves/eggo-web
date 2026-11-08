import { getAdminClient } from './admin';
import { openSecret, parseSecretKey, sealSecret } from '@/lib/crypto/secretBox';

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

export interface BricksetLink {
  username: string;
  userHash: string;
  linkedAt: string;
  lastSyncedAt: string | null;
}

interface LinkRow {
  user_id: string;
  brickset_username: string;
  user_hash_ciphertext: string;
  linked_at: string;
  last_synced_at: string | null;
}

/** Whether this deployment can remember Brickset accounts at all. */
export function isBricksetLinkConfigured(): boolean {
  return Boolean(process.env.BRICKSET_HASH_KEY);
}

function getKey(): Buffer {
  const encoded = process.env.BRICKSET_HASH_KEY;
  if (!encoded) throw new Error('BRICKSET_HASH_KEY is not set');
  return parseSecretKey(encoded);
}

export async function getBricksetLink(userId: string): Promise<BricksetLink | null> {
  const { data, error } = await getAdminClient()
    .from(LINKS_TABLE)
    .select('user_id, brickset_username, user_hash_ciphertext, linked_at, last_synced_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as LinkRow;
  return {
    username: row.brickset_username,
    userHash: openSecret(row.user_hash_ciphertext, getKey()),
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

export async function deleteBricksetLink(userId: string): Promise<void> {
  const { error } = await getAdminClient().from(LINKS_TABLE).delete().eq('user_id', userId);
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
