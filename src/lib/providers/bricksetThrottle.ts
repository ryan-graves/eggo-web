import {
  countRecentBricksetRequests,
  recordBricksetRequest,
  type BricksetRequestKind,
} from '@/lib/supabase/bricksetLinks';

/**
 * Per-user ceilings on Brickset traffic through Eggo. Brickset's daily API
 * quota is shared by every Eggo user, and the sign-in proxy would otherwise
 * let one account guess passwords from Eggo's IP and key. The numbers leave
 * plenty of room for a real person retrying a typo or re-syncing.
 */
const WINDOW_MS = 15 * 60 * 1000;

const LIMITS: Record<BricksetRequestKind, number> = {
  login: 6,
  fetch: 12,
};

export class BricksetThrottleError extends Error {
  readonly kind: BricksetRequestKind;

  constructor(kind: BricksetRequestKind) {
    super(
      kind === 'login'
        ? 'Too many Brickset sign-in attempts. Please wait a few minutes and try again.'
        : 'You have refreshed from Brickset a lot recently. Please wait a few minutes and try again.'
    );
    this.name = 'BricksetThrottleError';
    this.kind = kind;
  }
}

/**
 * Record one request of `kind` for the user, then throw if that pushed them
 * over the limit for the current window. Recording first means a burst of
 * parallel requests all land in the log before any of them counts, so the
 * cap holds under concurrency; the cost is that refused attempts also
 * occupy a slot, which only lengthens the cool-down for someone hammering.
 */
export async function takeBricksetRequestSlot(
  userId: string,
  kind: BricksetRequestKind
): Promise<void> {
  await recordBricksetRequest(userId, kind);
  const since = new Date(Date.now() - WINDOW_MS);
  const recent = await countRecentBricksetRequests(userId, kind, since);
  if (recent > LIMITS[kind]) throw new BricksetThrottleError(kind);
}
