import { getSupabaseClient } from './client';
import { getSetDataProvider } from '@/lib/providers';
import { removeImageBackground } from '@/lib/image';
import type {
  CreateLegoSetInput,
  DataSource,
  LegoSet,
  SetStatus,
  UpdateLegoSetInput,
} from '@/types';

const TABLE = 'sets';

interface SetRow {
  id: string;
  collection_id: string;
  set_number: string;
  name: string;
  piece_count: number | null;
  year: number | null;
  theme: string | null;
  subtheme: string | null;
  image_url: string | null;
  custom_image_url: string | null;
  status: SetStatus;
  has_been_assembled: boolean;
  occasion: string | null;
  date_received: string | null;
  owners: string[];
  notes: string | null;
  data_source: DataSource;
  data_source_id: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

function fromDb(row: SetRow): LegoSet {
  return {
    id: row.id,
    collectionId: row.collection_id,
    setNumber: row.set_number,
    name: row.name,
    pieceCount: row.piece_count,
    year: row.year,
    theme: row.theme,
    subtheme: row.subtheme,
    imageUrl: row.image_url,
    customImageUrl: row.custom_image_url ?? undefined,
    status: row.status,
    hasBeenAssembled: row.has_been_assembled,
    occasion: row.occasion ?? undefined,
    dateReceived: row.date_received,
    owners: row.owners ?? [],
    notes: row.notes ?? undefined,
    dataSource: row.data_source,
    dataSourceId: row.data_source_id ?? undefined,
    lastSyncedAt: row.last_synced_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as LegoSet;
}

/**
 * camelCase LegoSet (or partial input) → snake_case Postgres columns.
 * Returns only fields present in the input — Postgres ignores unspecified
 * columns on UPDATE and uses defaults on INSERT.
 */
function toDb(input: Partial<LegoSet>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.collectionId !== undefined) out.collection_id = input.collectionId;
  if (input.setNumber !== undefined) out.set_number = input.setNumber;
  if (input.name !== undefined) out.name = input.name;
  if (input.pieceCount !== undefined) out.piece_count = input.pieceCount;
  if (input.year !== undefined) out.year = input.year;
  if (input.theme !== undefined) out.theme = input.theme;
  if (input.subtheme !== undefined) out.subtheme = input.subtheme;
  if (input.imageUrl !== undefined) out.image_url = input.imageUrl;
  if (input.customImageUrl !== undefined) out.custom_image_url = input.customImageUrl;
  if (input.status !== undefined) out.status = input.status;
  if (input.hasBeenAssembled !== undefined) out.has_been_assembled = input.hasBeenAssembled;
  if (input.occasion !== undefined) out.occasion = input.occasion;
  if (input.dateReceived !== undefined) out.date_received = input.dateReceived;
  if (input.owners !== undefined) out.owners = input.owners;
  if (input.notes !== undefined) out.notes = input.notes;
  if (input.dataSource !== undefined) out.data_source = input.dataSource;
  if (input.dataSourceId !== undefined) out.data_source_id = input.dataSourceId;
  if (input.lastSyncedAt !== undefined) out.last_synced_at = input.lastSyncedAt;
  return out;
}

export async function createSet(data: CreateLegoSetInput): Promise<string> {
  const supabase = getSupabaseClient();
  const { data: row, error } = await supabase
    .from(TABLE)
    .insert(toDb(data as Partial<LegoSet>))
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return row.id;
}

export async function getSet(setId: string): Promise<LegoSet | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', setId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromDb(data as SetRow) : null;
}

/**
 * Fetch all sets in a collection. When `userId` is provided, gates the
 * read on membership via the `is_collection_member()` SECURITY DEFINER
 * RPC and returns `[]` if the user isn't a member — defense in depth
 * for issue #58. Without `userId`, falls back to RLS-only behavior
 * (used by /share/{token} viewers, which are intentional non-member
 * readers of public collections).
 */
export async function getSetsForCollection(
  collectionId: string,
  userId?: string,
): Promise<LegoSet[]> {
  const supabase = getSupabaseClient();
  if (userId) {
    const { data: isMember, error: rpcErr } = await supabase.rpc('is_collection_member', {
      coll_id: collectionId,
      uid: userId,
    });
    if (rpcErr) throw new Error(rpcErr.message);
    if (!isMember) return [];
  }
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('collection_id', collectionId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => fromDb(r as SetRow));
}

/**
 * Realtime subscription on sets within a single collection. Refetches on any
 * row-level change rather than applying deltas — fine at our scale and avoids
 * having to reconcile postgres_changes payloads against an in-memory list.
 *
 * `userId` is the membership gate: refetches go through
 * `getSetsForCollection(collectionId, userId)`, so a non-member who
 * somehow got this collection id (stale localStorage, leaked URL) gets
 * an empty list rather than the public-RLS read of the collection's
 * sets. See issue #58.
 */
export function subscribeToSetsForCollection(
  collectionId: string,
  userId: string,
  callback: (sets: LegoSet[]) => void,
  onError?: (error: Error) => void
): () => void {
  const supabase = getSupabaseClient();
  // Suppress callbacks from a refetch that's still in flight after unsubscribe,
  // so a stale failure can't surface against a since-switched collection.
  let cancelled = false;

  const refetch = async () => {
    try {
      const sets = await getSetsForCollection(collectionId, userId);
      if (cancelled) return;
      callback(sets);
    } catch (err) {
      if (cancelled) return;
      console.error('[subscribeToSetsForCollection] refetch error:', err);
      onError?.(err as Error);
    }
  };

  void refetch();

  const channel = supabase
    .channel(`sets:${collectionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'sets',
        filter: `collection_id=eq.${collectionId}`,
      },
      () => {
        void refetch();
      }
    )
    .subscribe();

  return () => {
    cancelled = true;
    void supabase.removeChannel(channel);
  };
}

export async function updateSet(setId: string, data: UpdateLegoSetInput): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from(TABLE)
    .update(toDb(data as Partial<LegoSet>))
    .eq('id', setId);
  if (error) throw new Error(error.message);
}

export async function deleteSet(setId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from(TABLE).delete().eq('id', setId);
  if (error) throw new Error(error.message);
}

export async function getSetsByOwner(
  collectionId: string,
  owner: string
): Promise<LegoSet[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('collection_id', collectionId)
    .contains('owners', [owner])
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => fromDb(r as SetRow));
}

export async function getSetsByStatus(
  collectionId: string,
  status: SetStatus
): Promise<LegoSet[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('collection_id', collectionId)
    .eq('status', status)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => fromDb(r as SetRow));
}

export async function getSetsByTheme(
  collectionId: string,
  theme: string
): Promise<LegoSet[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('collection_id', collectionId)
    .eq('theme', theme)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => fromDb(r as SetRow));
}

export async function findSetByNumber(
  collectionId: string,
  setNumber: string
): Promise<LegoSet | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('collection_id', collectionId)
    .eq('set_number', setNumber)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromDb(data as SetRow) : null;
}

export async function findSetsByNumber(
  collectionId: string,
  setNumber: string
): Promise<LegoSet[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('collection_id', collectionId)
    .eq('set_number', setNumber)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => fromDb(r as SetRow));
}

export interface RefreshSetResult {
  set: LegoSet | null;
  backgroundRemovalError: string | null;
}

/**
 * Refresh a set's metadata from the external data provider. Re-fetches
 * name/pieceCount/year/theme/subtheme/image and optionally re-runs
 * background removal.
 */
export async function refreshSetMetadata(setId: string): Promise<RefreshSetResult> {
  const set = await getSet(setId);
  if (!set) return { set: null, backgroundRemovalError: null };

  const provider = getSetDataProvider();
  const lookupResult = await provider.lookupSet(set.setNumber);
  if (!lookupResult) {
    throw new Error(`Set ${set.setNumber} not found in ${provider.name}`);
  }

  let processedImageUrl: string | null = null;
  let backgroundRemovalError: string | null = null;
  if (lookupResult.imageUrl) {
    const bgResult = await removeImageBackground(lookupResult.imageUrl, setId);
    processedImageUrl = bgResult.processedImageUrl;
    backgroundRemovalError = bgResult.error;
  }

  const updates: Partial<LegoSet> = {
    name: lookupResult.name,
    pieceCount: lookupResult.pieceCount,
    year: lookupResult.year,
    theme: lookupResult.theme,
    subtheme: lookupResult.subtheme,
    imageUrl: lookupResult.imageUrl,
    dataSource: provider.name as DataSource,
    dataSourceId: lookupResult.sourceId,
  };
  if (processedImageUrl) updates.customImageUrl = processedImageUrl;

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ ...toDb(updates), last_synced_at: new Date().toISOString() })
    .eq('id', setId);
  if (error) throw new Error(error.message);

  const updatedSet = await getSet(setId);
  return { set: updatedSet, backgroundRemovalError };
}
