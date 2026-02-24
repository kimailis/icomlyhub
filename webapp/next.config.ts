import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      }
        ],
      },
      async headers() {
        return [
          {
            source: '/(.*)',
            headers: [
              {
                key: 'Cross-Origin-Opener-Policy',
                value: 'same-origin-allow-popups',
              },
              {
                key: 'Cross-Origin-Embedder-Policy',
                value: 'unsafe-none',
              },
              {
                key: 'Cross-Origin-Resource-Policy',
                value: 'cross-origin',
              },
              {
                key: 'Referrer-Policy',
                value: 'no-referrer-when-downgrade',
              },
            ],
          },
        ];
      },
    };
    
    export default nextConfig;
    