import { createSet, getAccessToken, updateSet } from '@/lib/supabase';
import { removeImageBackground } from '@/lib/image';
import { displaySetNumber } from '@/lib/providers/bricksetMapping';
import type {
  BricksetCollectionResponse,
  BricksetLinkStatus,
  BricksetOwnedSet,
  LegoSet,
  SetStatus,
} from '@/types';

/**
 * Browser-side half of "Import from Brickset".
 *
 * 1. `fetchBricksetOwnedSets` asks `POST /api/brickset/collection` for the
 *    user's owned sets, either signing in (the server does the Brickset
 *    login) or using the account the server remembers for this user.
 * 2. `buildImportCandidates` lines those up against what's already in the
 *    target collection so the review step can flag duplicates, and seeds
 *    each row's status, owners, and date, which the review step then edits
 *    per set or for all sets at once.
 * 3. `runBricksetImport` writes the chosen sets through the same
 *    `createSet` / background-removal path the add-set form uses, in two
 *    passes: rows first (fast, so the collection fills in right away), then
 *    images. A set whose image fails still exists with Brickset's original
 *    picture, exactly like a single add whose background removal failed.
 */

export type BricksetImportErrorCode =
  | 'invalid_credentials'
  | 'rate_limited'
  | 'too_many_requests'
  | 'not_configured'
  | 'not_linked'
  | 'link_expired'
  | 'unauthorized'
  | 'network'
  | 'upstream';

export class BricksetImportError extends Error {
  readonly code: BricksetImportErrorCode;

  constructor(code: BricksetImportErrorCode, message: string) {
    super(message);
    this.name = 'BricksetImportError';
    this.code = code;
  }
}

const KNOWN_CODES: ReadonlySet<string> = new Set<BricksetImportErrorCode>([
  'invalid_credentials',
  'rate_limited',
  'too_many_requests',
  'not_configured',
  'not_linked',
  'link_expired',
  'unauthorized',
  'upstream',
]);

/** How to reach Brickset: fresh credentials, or the account the server remembers. */
export type BricksetAccess =
  | { kind: 'credentials'; username: string; password: string; remember: boolean }
  | { kind: 'linked' };

async function authorizedFetch(path: string, init: RequestInit): Promise<Response> {
  const token = await getAccessToken();
  if (!token) {
    throw new BricksetImportError('unauthorized', 'Your Eggo session has expired. Sign in again.');
  }
  try {
    return await fetch(path, {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new BricksetImportError('network', 'Could not reach Eggo. Check your connection.');
  }
}

async function throwForResponse(response: Response, fallback: string): Promise<never> {
  let code: BricksetImportErrorCode = 'upstream';
  let message = fallback;
  try {
    const data = (await response.json()) as { error?: string; code?: string };
    if (data.code && KNOWN_CODES.has(data.code)) code = data.code as BricksetImportErrorCode;
    if (data.error) message = data.error;
  } catch {
    // Non-JSON error body: keep the generic message.
  }
  throw new BricksetImportError(code, message);
}

/** Ask the server for the user's owned Brickset sets, signing in or using the remembered account. */
export async function fetchBricksetOwnedSets(
  access: BricksetAccess
): Promise<BricksetCollectionResponse> {
  const body =
    access.kind === 'linked'
      ? { useLink: true }
      : { username: access.username, password: access.password, remember: access.remember };
  const response = await authorizedFetch('/api/brickset/collection', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    await throwForResponse(response, 'Could not load your Brickset collection.');
  }
  return (await response.json()) as BricksetCollectionResponse;
}

/** "Nov 7, 2026" style date for the last-synced line, in the viewer's locale. */
export function formatBricksetSyncDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Whether the signed-in user has a remembered Brickset account. */
export async function getBricksetLinkStatus(): Promise<BricksetLinkStatus> {
  const response = await authorizedFetch('/api/brickset/link', { method: 'GET' });
  if (!response.ok) {
    await throwForResponse(response, 'Could not check your Brickset link.');
  }
  return (await response.json()) as BricksetLinkStatus;
}

/** Forget the remembered Brickset account. */
export async function unlinkBrickset(): Promise<void> {
  const response = await authorizedFetch('/api/brickset/link', { method: 'DELETE' });
  if (!response.ok) {
    await throwForResponse(response, 'Could not unlink your Brickset account.');
  }
}

/** The per-set choices the user makes in the review step. */
export interface ImportDetails {
  status: SetStatus;
  owners: string[];
  /** YYYY-MM-DD, or null for no date. */
  dateReceived: string | null;
}

export type ImportDetailKey = keyof ImportDetails;

/** An owned Brickset set lined up against the target collection, with its import details. */
export interface ImportCandidate extends ImportDetails {
  set: BricksetOwnedSet;
  /** Copies of this set already in the collection, by set number. */
  existingCount: number;
  /** Pre-ticked in the review list. Duplicates start unticked. */
  selected: boolean;
}

/** Today's date in the local timezone as YYYY-MM-DD, the shape `dateReceived` stores. */
export function todayIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Match owned sets against the collection's current contents. A set counts as
 * already present when its number matches an existing row's number (older
 * rows may carry a "-1" suffix) or its Brickset id matches `dataSourceId`.
 * Every candidate starts with the same `defaults`; the review step edits
 * them per row.
 */
export function buildImportCandidates(
  owned: BricksetOwnedSet[],
  existing: LegoSet[],
  defaults: ImportDetails
): ImportCandidate[] {
  const countsByNumber = new Map<string, number>();
  const countsBySourceId = new Map<string, number>();
  for (const set of existing) {
    const number = displaySetNumber(set.setNumber);
    countsByNumber.set(number, (countsByNumber.get(number) ?? 0) + 1);
    if (set.dataSourceId) {
      countsBySourceId.set(set.dataSourceId, (countsBySourceId.get(set.dataSourceId) ?? 0) + 1);
    }
  }

  return owned.map((set) => {
    const existingCount = Math.max(
      countsByNumber.get(set.setNumber) ?? 0,
      countsBySourceId.get(set.sourceId) ?? 0
    );
    return {
      set,
      existingCount,
      selected: existingCount === 0,
      status: defaults.status,
      owners: [...defaults.owners],
      dateReceived: defaults.dateReceived,
    };
  });
}

/** Change one candidate's selection or details, leaving the rest untouched. */
export function updateCandidate(
  candidates: ImportCandidate[],
  sourceId: string,
  patch: Partial<ImportDetails> & { selected?: boolean }
): ImportCandidate[] {
  return candidates.map((c) => (c.set.sourceId === sourceId ? { ...c, ...patch } : c));
}

/** Apply the same details to every candidate (a property locked to "same for every set"). */
export function applyDetailsToAll(
  candidates: ImportCandidate[],
  patch: Partial<ImportDetails>
): ImportCandidate[] {
  return candidates.map((c) => ({ ...c, ...patch }));
}

export interface ImportOptions {
  collectionId: string;
}

export type ImportPhase = 'creating' | 'images';

export interface ImportProgress {
  phase: ImportPhase;
  completed: number;
  total: number;
  /** Name of the set being worked on, for the progress caption. */
  currentName: string | null;
}

export interface ImportFailure {
  set: BricksetOwnedSet;
  message: string;
  /** Copies of this set that could not be created. */
  copies: number;
}

export interface ImportSummary {
  /** Rows written (one per copy). */
  setsCreated: number;
  /** Rows that got a background-removed image. */
  imagesProcessed: number;
  /** Rows created whose image step failed; they keep Brickset's original picture. */
  imageFailures: number;
  /** Sets that could not be created at all. */
  failures: ImportFailure[];
}

/** Parallel background-removal jobs. Keeps rembg load modest while the import stays snappy. */
const IMAGE_CONCURRENCY = 3;

interface CreatedRow {
  setId: string;
  set: BricksetOwnedSet;
}

/**
 * Write the selected candidates into the collection, then process their
 * images. Resolves with a summary; never rejects for a per-set failure.
 */
export async function runBricksetImport(
  candidates: ImportCandidate[],
  options: ImportOptions,
  onProgress: (progress: ImportProgress) => void
): Promise<ImportSummary> {
  const selected = candidates.filter((c) => c.selected);
  const totalCopies = selected.reduce((sum, c) => sum + c.set.quantity, 0);

  const created: CreatedRow[] = [];
  const failures: ImportFailure[] = [];
  let copiesDone = 0;

  onProgress({ phase: 'creating', completed: 0, total: totalCopies, currentName: null });

  for (const { set, status, owners, dateReceived } of selected) {
    onProgress({
      phase: 'creating',
      completed: copiesDone,
      total: totalCopies,
      currentName: set.name,
    });
    const hasBeenAssembled = status === 'assembled' || status === 'disassembled';
    for (let copy = 0; copy < set.quantity; copy++) {
      try {
        const setId = await createSet({
          collectionId: options.collectionId,
          setNumber: set.setNumber,
          name: set.name,
          pieceCount: set.pieceCount,
          year: set.year,
          theme: set.theme,
          subtheme: set.subtheme,
          imageUrl: set.imageUrl,
          status,
          hasBeenAssembled,
          owners,
          dateReceived,
          notes: set.notes ?? undefined,
          dataSource: 'brickset',
          dataSourceId: set.sourceId,
          lastSyncedAt: new Date().toISOString(),
        });
        created.push({ setId, set });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not add this set';
        const existing = failures.find((f) => f.set.sourceId === set.sourceId);
        if (existing) existing.copies++;
        else failures.push({ set, message, copies: 1 });
      }
      copiesDone++;
      onProgress({
        phase: 'creating',
        completed: copiesDone,
        total: totalCopies,
        currentName: set.name,
      });
    }
  }

  const withImages = created.filter((row) => row.set.imageUrl);
  let imagesDone = 0;
  let imagesProcessed = 0;
  let imageFailures = 0;

  if (withImages.length === 0) {
    return { setsCreated: created.length, imagesProcessed, imageFailures, failures };
  }

  onProgress({ phase: 'images', completed: 0, total: withImages.length, currentName: null });

  const queue = [...withImages];
  const worker = async (): Promise<void> => {
    for (let row = queue.shift(); row; row = queue.shift()) {
      onProgress({
        phase: 'images',
        completed: imagesDone,
        total: withImages.length,
        currentName: row.set.name,
      });
      try {
        const result = await removeImageBackground(row.set.imageUrl as string, row.setId);
        if (result.processedImageUrl) {
          await updateSet(row.setId, { customImageUrl: result.processedImageUrl });
          imagesProcessed++;
        } else if (!result.skipped) {
          imageFailures++;
        }
      } catch {
        imageFailures++;
      }
      imagesDone++;
      onProgress({
        phase: 'images',
        completed: imagesDone,
        total: withImages.length,
        currentName: row.set.name,
      });
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(IMAGE_CONCURRENCY, withImages.length) }, () => worker())
  );

  return { setsCreated: created.length, imagesProcessed, imageFailures, failures };
}
