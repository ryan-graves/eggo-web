import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabasePublishableKey } from '@/lib/supabase/config';

/**
 * DEV-ONLY local sign-in backdoor.
 *
 * Mints a real Supabase session for the dedicated local TEST account
 * (DEV_LOGIN_EMAIL / DEV_LOGIN_PASSWORD, seeded via
 * `scripts/seed-test-account.mjs`) so design/feature work can be verified in
 * a browser without going through Google OAuth.
 *
 * Hard-gated so it cannot exist in production:
 *   - returns 404 unless NODE_ENV !== 'production'
 *   - returns 404 unless DEV_LOGIN_ENABLED === 'true'
 *   - returns 404 unless the request host is localhost
 * Netlify builds run with NODE_ENV=production, so this route is permanently
 * 404 there regardless of env flags.
 *
 * It impersonates only the single configured TEST email — it never reads an
 * email from the request — so it can't be used as a general impersonation
 * oracle even when enabled.
 */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

function disabled(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.DEV_LOGIN_ENABLED !== 'true';
}

function isLocalhost(request: Request): boolean {
  const host = request.headers.get('host') ?? '';
  const hostname = host.replace(/:\d+$/, '');
  return LOCAL_HOSTS.has(hostname);
}

export async function POST(request: Request): Promise<Response> {
  if (disabled() || !isLocalhost(request)) {
    return new Response('Not found', { status: 404 });
  }

  const email = process.env.DEV_LOGIN_EMAIL;
  const password = process.env.DEV_LOGIN_PASSWORD;
  if (!email || !password) {
    return Response.json(
      { error: 'DEV_LOGIN_EMAIL and DEV_LOGIN_PASSWORD must be set in .env.local' },
      { status: 500 }
    );
  }

  // Fresh non-persisting client so this server-side sign-in doesn't touch any
  // shared client state.
  const supabase = createClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    return Response.json(
      { error: error?.message ?? 'Sign-in failed. Did you run scripts/seed-test-account.mjs?' },
      { status: 500 }
    );
  }

  // Defense in depth: only ever mint a session for a flagged seed account, so a
  // misconfigured DEV_LOGIN_EMAIL pointing at a real user can't be impersonated.
  // This, not the spoofable Host header, is the real guard on who gets logged in.
  if (data.user?.app_metadata?.seed !== true) {
    return new Response('Not found', { status: 404 });
  }

  return Response.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
}
