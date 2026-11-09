'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';

/**
 * OAuth callback for Supabase Auth (PKCE flow). Google sends the user to
 * Supabase, which redirects here with `?code=...`; the browser client
 * exchanges the code using the PKCE verifier it stored in this origin's
 * localStorage when sign-in started.
 *
 * This is a client page on purpose, with no server hop. A route handler that
 * redirects with `new URL(path, request.url)` lands on the deploy's canonical
 * host on Netlify (the permalink host on deploy previews), which is a
 * different origin from the one the user signed in on, so the verifier is
 * missing there and the exchange never runs.
 */
export default function AuthCallbackPage(): React.JSX.Element {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Provider errors (user cancelled, consent denied) go back to the landing
    // page, whose CTA shows the message.
    const providerError = params.get('error_description') ?? params.get('error');
    if (providerError) {
      router.replace(`/?error=${encodeURIComponent(providerError)}`);
      return;
    }

    const code = params.get('code');
    if (!code) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot client-only read of the callback URL
      setError('No sign-in code was returned. Please try again.');
      return;
    }

    const supabase = getSupabaseClient();
    let cancelled = false;

    void (async () => {
      try {
        // supabase-js (detectSessionInUrl) exchanges the code itself while it
        // initializes, when it finds the verifier; getSession waits for that.
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          router.replace('/');
          return;
        }

        // Otherwise exchange explicitly so a failure has a message (a missing
        // verifier, an expired or reused code) instead of a silent stall.
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }
        router.replace('/');
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Sign-in failed.');
      }
    })();

    return () => {
      cancelled = true;
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
