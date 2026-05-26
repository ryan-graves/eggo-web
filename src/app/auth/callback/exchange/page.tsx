'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';

/**
 * Client-side completion of the OAuth flow. supabase-js reads `?code=...`
 * from the current URL automatically (when `detectSessionInUrl: true`),
 * exchanges it using the PKCE verifier stored in localStorage, and
 * persists the resulting session. Once the session is established we
 * redirect home.
 */
export default function AuthCallbackExchangePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    let cancelled = false;

    void (async () => {
      try {
        const { data, error: getErr } = await supabase.auth.getSession();
        if (cancelled) return;
        if (getErr) {
          setError(getErr.message);
          return;
        }
        if (data.session) {
          router.replace('/');
          return;
        }
        // No session yet — wait for the auto-exchange to complete via the
        // onAuthStateChange listener below.
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (session) router.replace('/');
      else if (event === 'SIGNED_OUT') setError('Sign-in failed. Please try again.');
    });

    // Stuck-spinner fallback: if the SDK never finishes the code exchange
    // (malformed/expired code, missing PKCE verifier), surface an error UI
    // instead of leaving the user on an indefinite loading screen.
    const timeout = window.setTimeout(() => {
      if (!cancelled) setError('Sign-in timed out. Please try again.');
    }, 10_000);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      subscription.subscription.unsubscribe();
    };
  }, [router]);

  if (error) {
    return (
      <main style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Sign-in failed: {error}</p>
        <Link href="/">Return to Eggo</Link>
      </main>
    );
  }
  return (
    <main style={{ padding: '2rem', textAlign: 'center' }}>
      <p>Completing sign-in…</p>
    </main>
  );
}
