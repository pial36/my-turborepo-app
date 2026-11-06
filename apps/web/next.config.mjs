/** @type {import('next').NextConfig} */
const nextConfig = {
  // workspace package shared with the API (CommonJS)
  transpilePackages: ['@teamhub/shared'],
};

export default nextConfig;
