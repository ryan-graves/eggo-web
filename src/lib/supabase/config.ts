/**
 * Centralizes Supabase env var validation. Throws on first access if a
 * required var is missing, so we fail loudly rather than silently
 * constructing a half-configured client.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && publishableKey);
}

export function getSupabaseUrl(): string {
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  return url;
}

export function getSupabasePublishableKey(): string {
  if (!publishableKey) throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set');
  return publishableKey;
}
