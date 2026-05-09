import { NextRequest, NextResponse } from 'next/server';

/**
 * OAuth callback for Supabase Auth.
 *
 * The Google OAuth flow lands here with `?code=...` (PKCE flow). Rather
 * than exchanging the code in a server route — which would require the
 * @supabase/ssr cookie helpers — we redirect to a small client-side page
 * that lets the browser supabase-js client (which holds the PKCE
 * verifier in localStorage) do the exchange. The SDK reads the code
 * from the URL automatically and persists the session.
 *
 * For OAuth errors returned by the provider, surface the error param to
 * the sign-in page so the user sees a meaningful message.
 */
export function GET(request: NextRequest): NextResponse {
  const url = new URL(request.url);
  const error = url.searchParams.get('error_description') ?? url.searchParams.get('error');
  if (error) {
    const target = new URL('/sign-in', request.url);
    target.searchParams.set('error', error);
    return NextResponse.redirect(target);
  }

  // Forward to a client page that lets supabase-js consume the code from
  // window.location and exchange it. After successful exchange the page
  // redirects to `/`.
  const target = new URL('/auth/callback/exchange', request.url);
  // Preserve the original query string so the client sees `?code=...`
  target.search = url.search;
  return NextResponse.redirect(target);
}
