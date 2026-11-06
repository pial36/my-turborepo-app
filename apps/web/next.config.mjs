/** @type {import('next').NextConfig} */
const nextConfig = {
  // workspace package shared with the API (CommonJS)
  transpilePackages: ['@teamhub/shared'],

  async headers() {
    return [
      {
        // always fetch the latest service worker
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
