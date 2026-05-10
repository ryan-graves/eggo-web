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

/**
 * Upload a processed-image PNG to Supabase Storage's `processed-images`
 * bucket at `{setId}.png`. Returns the public URL.
 */
export async function uploadProcessedImage(
  buffer: Buffer,
  setId: string,
  contentType = 'image/png'
): Promise<string> {
  const supabase = getAdminClient();
  const path = `${setId}.png`;
  const { error } = await supabase.storage
    .from('processed-images')
    .upload(path, buffer, {
      contentType,
      cacheControl: '2592000',
      upsert: true,
    });
  if (error) throw new Error(`storage upload failed: ${error.message}`);
  const { data } = supabase.storage.from('processed-images').getPublicUrl(path);
  return data.publicUrl;
}
