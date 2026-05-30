'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';

/**
 * DEV-ONLY: one-navigation local sign-in. Visiting /dev-login mints a session
 * for the seeded test account and drops you on /home. Inert unless
 * NEXT_PUBLIC_DEV_LOGIN_ENABLED === 'true', and the API it calls is itself
 * hard-gated to non-production localhost (see /api/dev/login).
 */
export default function DevLoginPage(): React.JSX.Element {
  const router = useRouter();
  const [status, setStatus] = useState('Signing in to the test account…');

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEV_LOGIN_ENABLED !== 'true') {
      setStatus('Dev login is disabled. Set NEXT_PUBLIC_DEV_LOGIN_ENABLED=true in .env.local.');
      return;
    }

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
