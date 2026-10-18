import type { NextConfig } from 'next';
import packageJson from './package.json';

function getAppVersion(): string {
  const base = packageJson.version;
  const context = process.env.CONTEXT; // Netlify: 'production', 'deploy-preview', 'branch-deploy'

  if (context === 'production') {
    return base;
  }

  const sha = process.env.COMMIT_REF?.slice(0, 7);
  if (sha) {
    return `${base}-dev.${sha}`;
  }

  return `${base}-local`;
}

/**
 * PostHog has no test-mode bucket, so only the production deploy gets the
 * project token; local dev and deploy/branch previews build with analytics off.
 */
function getPostHogProjectToken(): string {
  if (process.env.CONTEXT !== 'production') return '';
  return process.env.POSTHOG_PROJECT_TOKEN ?? '';
}

function getSupabaseHost(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * Headers for every response the Next.js runtime serves (SSR, prerendered,
 * and route-handler responses). On Netlify, `netlify.toml` `[[headers]]` only
 * reach files the CDN serves directly (`/_next/static/*`, `public/`), so page
 * headers have to live here. Keep the two lists in sync.
 *
 * Framing is restricted with CSP `frame-ancestors` rather than
 * `X-Frame-Options`, which has no way to allow a specific origin: PostHog's
 * in-app heatmaps load the site in an iframe on us.posthog.com.
 */
const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self' https://us.posthog.com" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: getAppVersion(),
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: getPostHogProjectToken(),
  },
  /**
   * `/sign-in` used to be the standalone auth surface, but the landing
   * page now doubles as both marketing and sign-in (CTA triggers Google
   * OAuth directly via useAuth). This 308 preserves any bookmarks /
   * stale external links that still point at /sign-in and forwards
   * query strings so `?error=…` from OAuth callbacks still reaches the
   * landing page's error display.
   */
  async redirects() {
    return [
      {
        source: '/sign-in',
        destination: '/',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: SECURITY_HEADERS,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.rebrickable.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'rebrickable.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.brickset.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/**',
      },
      ...(getSupabaseHost()
        ? [
            {
              protocol: 'https' as const,
              hostname: getSupabaseHost() as string,
              pathname: '/storage/v1/object/public/**',
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
