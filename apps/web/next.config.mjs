// The browser talks to the API through this app (same origin), so the auth
// cookies are first-party. Browsers that block third-party cookies (Safari,
// Chrome Incognito) would otherwise drop them, because web and API run on
// different *.up.railway.app hosts. API_URL is read at build time.
const API_URL = (process.env.API_URL || 'http://localhost:5000').replace(/\/$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // workspace package shared with the API (CommonJS)
  transpilePackages: ['@teamhub/shared'],

  // Socket.IO requests /socket.io/?EIO=4…; Next's default 308 to the
  // slash-less URL would break the handshake.
  skipTrailingSlashRedirect: true,

  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_URL}/api/:path*` },
      { source: '/socket.io/', destination: `${API_URL}/socket.io/` },
      { source: '/socket.io/:path*', destination: `${API_URL}/socket.io/:path*` },
    ];
  },

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
