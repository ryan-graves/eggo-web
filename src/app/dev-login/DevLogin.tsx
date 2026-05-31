'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';

/**
 * Client half of the dev-login flow: mints a session for the seeded test
 * account and drops you on /home. Rendered only when the server guard in
 * page.tsx has confirmed dev login is enabled (non-prod + flag), so it does no
 * gating of its own. The API it calls is itself hard-gated to non-production
 * localhost and to flagged seed accounts (see /api/dev/login).
 */
export function DevLogin(): React.JSX.Element {
  const router = useRouter();
  const [status, setStatus] = useState('Signing in to the test account…');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/dev/login', { method: 'POST' });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `${res.status} ${res.statusText}`);
        }
        const { access_token, refresh_token } = await res.json();
        const { error } = await getSupabaseClient().auth.setSession({ access_token, refresh_token });
        if (error) throw error;
        if (!cancelled) router.replace('/home');
      } catch (err) {
        if (!cancelled) {
          setStatus(`Dev login failed: ${err instanceof Error ? err.message : 'unknown error'}`);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', color: '#52525b' }}>
      {status}
    </main>
  );
}
