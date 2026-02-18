import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    // This monorepo uses ESLint v9 at the workspace root, but Next's build-time
    // lint runner still passes legacy options that can break with v9.
    // Keep linting available via `npm --prefix frontend run lint`.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
