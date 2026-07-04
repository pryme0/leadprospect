/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Next 14 nests this under `experimental` (the top-level `serverExternalPackages`
  // is Next 15+ and was being silently ignored). Keeps native/server-only deps out
  // of the bundle so they load from node_modules at runtime.
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3', 'pg'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
    ],
  },
};

module.exports = nextConfig;
