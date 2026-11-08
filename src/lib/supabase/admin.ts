import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client using the secret key, which bypasses RLS.
 * Used by /api/collections (member insert during create) and
 * /api/remove-background (Storage upload).
 */

let cachedAdmin: SupabaseClient | null = null;

function getProjectUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  return url;
}

function getSecretKey(): string {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error('SUPABASE_SECRET_KEY is not set');
  return key;
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

export function getAdminClient(): SupabaseClient {
  if (cachedAdmin) return cachedAdmin;
  cachedAdmin = createClient(getProjectUrl(), getSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedAdmin;
}

/**
 * Verify a Bearer token from a request header. Returns the user's auth.users
 * row id and email on success, or null if missing/invalid.
 */
export async function verifyAuthToken(
  authHeader: string | null
): Promise<{ uid: string; email: string | null } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;
  const { data, error } = await getAdminClient().auth.getUser(token);
  if (error || !data.user) return null;
  return { uid: data.user.id, email: data.user.email ?? null };
}

/** Object name for a processed image: `{setId}.png` or `{setId}.webp`, matching its bytes. */
export function processedImagePath(setId: string, contentType: string): string {
  return `${setId}.${contentType === 'image/webp' ? 'webp' : 'png'}`;
}

/**
 * Upload a processed image to Supabase Storage's `processed-images` bucket
 * under `{setId}.{ext}`, with the extension matching the content type (rembg
 * returns WebP for large images). Returns the public URL with a version
 * query so a re-processed image at the same path isn't hidden behind the
 * 30-day browser cache of the previous one.
 */
export async function uploadProcessedImage(
  buffer: Buffer,
  setId: string,
  contentType = 'image/png'
): Promise<string> {
  const supabase = getAdminClient();
  const path = processedImagePath(setId, contentType);
  const { error } = await supabase.storage.from('processed-images').upload(path, buffer, {
    contentType,
    cacheControl: '2592000',
    upsert: true,
  });
  if (error) throw new Error(`storage upload failed: ${error.message}`);
  const { data } = supabase.storage.from('processed-images').getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}
