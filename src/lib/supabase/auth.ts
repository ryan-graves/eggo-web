import type { User as SupabaseUser } from '@supabase/supabase-js';
import { getSupabaseClient } from './client';

/**
 * Re-export Supabase's User shape. Consumer code should read `user.id`,
 * `user.email`, and `user.user_metadata.full_name` / `avatar_url` rather
 * than Firebase's `uid` / `displayName` / `photoURL`.
 */
export type User = SupabaseUser;

/**
 * Trigger the OAuth redirect flow for Google sign-in. The user is sent to
 * Google, then to Supabase's `/auth/v1/callback`, then back to our
 * `/auth/callback` route which exchanges the code for a session.
 */
export async function signInWithGoogle(): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Subscribe to auth state changes. Fires the callback once with the current
 * user (resolved from any persisted session) and again on every login/logout.
 * Returns an unsubscribe function for the React effect cleanup.
 */
export function subscribeToAuthChanges(
  callback: (user: User | null) => void
): () => void {
  const supabase = getSupabaseClient();

  // Resolve any persisted session once, immediately
  void supabase.auth.getSession().then(({ data: { session } }) => {
    callback(session?.user ?? null);
  });

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });

  return () => data.subscription.unsubscribe();
}

/**
 * Async getter for the current user. Supabase resolves the session
 * asynchronously from localStorage on first call, so this is async.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

/**
 * Async getter for the current access token (the JWT to send as Bearer
 * to server routes). Returns null if no session.
 */
export async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
