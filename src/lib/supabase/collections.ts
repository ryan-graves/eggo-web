import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from './client';
import { getAccessToken } from './auth';
import type { Collection, PublicViewSettings } from '@/types';

const TABLE = 'collections';

/**
 * Snake-case Postgres row → camelCase Collection. Member ids come from the
 * embedded `collection_members(user_id)` rows.
 */
type CollectionMemberRow = { user_id: string };

interface CollectionRow {
  id: string;
  name: string;
  owners: string[];
  is_public: boolean;
  public_share_token: string | null;
  public_view_settings: PublicViewSettings | null;
  created_at: string;
  updated_at: string;
  collection_members?: CollectionMemberRow[];
}

function fromDb(row: CollectionRow): Collection {
  const memberUserIds = (row.collection_members ?? []).map((m) => m.user_id);
  return {
    id: row.id,
    name: row.name,
    owners: row.owners ?? [],
    memberUserIds,
    isPublic: row.is_public,
    publicShareToken: row.public_share_token ?? undefined,
    publicViewSettings: row.public_view_settings ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as Collection;
}

const COLLECTION_SELECT = '*, collection_members(user_id)';

/**
 * Create a new collection via the server-side API route, which uses the
 * secret key to bypass RLS for the membership insert.
 */
export async function createCollection(data: {
  name: string;
  owners: string[];
}): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error('Must be logged in to create a collection');

  const response = await fetch('/api/collections', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name: data.name, owners: data.owners }),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: 'Failed to create collection' }));
    throw new Error(errorData.error || 'Failed to create collection');
  }

  const result = await response.json();
  return result.id;
}

export async function getCollection(collectionId: string): Promise<Collection | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select(COLLECTION_SELECT)
    .eq('id', collectionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromDb(data as CollectionRow) : null;
}

export async function getCollectionsForUser(_userId: string): Promise<Collection[]> {
  // RLS already filters to collections where the authenticated user is a
  // member, so the userId parameter is informational. Kept for API parity.
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select(COLLECTION_SELECT)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => fromDb(row as CollectionRow));
}

/**
 * Realtime subscription. Fires the callback with the initial snapshot, then
 * again whenever the user's membership changes or any of the collections
 * they belong to is updated.
 *
 * Subscribes to one filtered channel per collection so the WebSocket only
 * receives events for collections this user is a member of — an unfiltered
 * `postgres_changes` listener on `collections` would stream payloads for
 * every other tenant's row updates. The membership channel triggers a
 * refetch which reconciles the per-collection channel set.
 */
export function subscribeToCollectionsForUser(
  userId: string,
  callback: (collections: Collection[]) => void,
  onError?: (error: Error) => void
): () => void {
  const supabase = getSupabaseClient();
  const perCollection = new Map<string, RealtimeChannel>();

  const refetch = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select(COLLECTION_SELECT)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const collections = (data ?? []).map((row) => fromDb(row as CollectionRow));
      callback(collections);

      // Reconcile per-collection channels with the new membership set
      const liveIds = new Set(collections.map((c) => c.id));
      for (const id of liveIds) {
        if (!perCollection.has(id)) {
          const ch = supabase
            .channel(`collection:${id}`)
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'collections', filter: `id=eq.${id}` },
              () => void refetch()
            )
            .subscribe();
          perCollection.set(id, ch);
        }
      }
      for (const [id, ch] of perCollection) {
        if (!liveIds.has(id)) {
          void supabase.removeChannel(ch);
          perCollection.delete(id);
        }
      }
    } catch (err) {
      console.error('[subscribeToCollectionsForUser] refetch error:', err);
      onError?.(err as Error);
    }
  };

  const membersChannel = supabase
    .channel(`collection_members:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'collection_members', filter: `user_id=eq.${userId}` },
      () => void refetch()
    )
    .subscribe();

  void refetch();

  return () => {
    void supabase.removeChannel(membersChannel);
    for (const ch of perCollection.values()) void supabase.removeChannel(ch);
    perCollection.clear();
  };
}

export async function updateCollection(
  collectionId: string,
  data: Partial<Pick<Collection, 'name' | 'owners' | 'memberUserIds'>>
): Promise<void> {
  const supabase = getSupabaseClient();
  const update: Record<string, unknown> = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.owners !== undefined) update.owners = data.owners;
  // memberUserIds is materialized via collection_members, not a column.
  // addMember / removeMember mutate that table directly.
  const { error } = await supabase.from(TABLE).update(update).eq('id', collectionId);
  if (error) throw new Error(error.message);

  if (data.memberUserIds !== undefined) {
    // Atomic delete + insert in a single transaction. The RPC is
    // SECURITY DEFINER and re-checks membership against auth.uid().
    const { error: rpcErr } = await supabase.rpc('replace_collection_members', {
      coll_id: collectionId,
      target_user_ids: data.memberUserIds,
    });
    if (rpcErr) throw new Error(rpcErr.message);
  }
}

export async function deleteCollection(collectionId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from(TABLE).delete().eq('id', collectionId);
  if (error) throw new Error(error.message);
}

export async function addMemberToCollection(
  collectionId: string,
  userId: string
): Promise<void> {
  const supabase = getSupabaseClient();
  // Idempotent: the partial unique index on (collection_id, user_id) where
  // user_id is not null protects against duplicates, but we want to swallow
  // the conflict rather than throw.
  const { error } = await supabase
    .from('collection_members')
    .upsert(
      { collection_id: collectionId, user_id: userId },
      { onConflict: 'collection_id,user_id', ignoreDuplicates: true }
    );
  if (error) throw new Error(error.message);
}

export async function removeMemberFromCollection(
  collectionId: string,
  userId: string
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('collection_members')
    .delete()
    .eq('collection_id', collectionId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

// ============================================================================
// Public sharing
// ============================================================================

function generateShareToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const randomValues = new Uint8Array(12);
  crypto.getRandomValues(randomValues);
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(randomValues[i] % chars.length);
  }
  return token;
}

export async function getCollectionByShareToken(
  shareToken: string
): Promise<Collection | null> {
  if (!shareToken || shareToken.length !== 12 || !/^[A-Za-z0-9]+$/.test(shareToken)) {
    return null;
  }
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select(COLLECTION_SELECT)
    .eq('public_share_token', shareToken)
    .eq('is_public', true)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromDb(data as CollectionRow) : null;
}

export async function enablePublicSharing(
  collectionId: string,
  viewSettings: PublicViewSettings
): Promise<string> {
  const supabase = getSupabaseClient();
  const existing = await getCollection(collectionId);
  if (!existing) throw new Error('Collection not found');
  const shareToken = existing.publicShareToken || generateShareToken();
  const { error } = await supabase
    .from(TABLE)
    .update({
      is_public: true,
      public_share_token: shareToken,
      public_view_settings: viewSettings,
    })
    .eq('id', collectionId);
  if (error) throw new Error(error.message);
  return shareToken;
}

export async function disablePublicSharing(collectionId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ is_public: false })
    .eq('id', collectionId);
  if (error) throw new Error(error.message);
}

export async function updatePublicViewSettings(
  collectionId: string,
  viewSettings: PublicViewSettings
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ public_view_settings: viewSettings })
    .eq('id', collectionId);
  if (error) throw new Error(error.message);
}
