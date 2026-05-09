import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublishableKey, getSupabaseUrl } from './config';

let cachedClient: SupabaseClient | null = null;

/**
 * Browser/client-side Supabase client. Uses the publishable key (subject to
 * RLS) and persists sessions in localStorage. Lazy singleton so importing
 * this module from a server component doesn't kick off a client init.
 */
export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;
  cachedClient = createClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });
  return cachedClient;
}
