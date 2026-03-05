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

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: getAppVersion(),
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
    ],
  },
};

export default nextConfig;
