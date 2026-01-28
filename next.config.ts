import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
    ],
  },
};

export default nextConfig;
