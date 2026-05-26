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

function getSupabaseHost(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: getAppVersion(),
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
