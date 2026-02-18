import { execSync } from 'node:child_process';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

function resolveSqlAdapterVersion() {
  try {
    if (process.env.NEXT_PUBLIC_SQL_ADAPTER_VERSION) {
      return process.env.NEXT_PUBLIC_SQL_ADAPTER_VERSION;
    }
    const out = execSync('npm view @framers/sql-storage-adapter version', { stdio: 'pipe' })
      .toString()
      .trim();
    return out || '';
  } catch {
    return '';
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  trailingSlash: true,
  // Disable typedRoutes to avoid strict Link route type errors
  // Enable static export for GitHub Pages
  output: 'export',
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_SQL_ADAPTER_VERSION: resolveSqlAdapterVersion(),
  },
  // Performance optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['framer-motion', 'lucide-react', 'react-syntax-highlighter'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Aggressive webpack optimizations for smaller bundles
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        moduleIds: 'deterministic',
        minimize: true,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // React framework bundle
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 50,
              enforce: true,
              reuseExistingChunk: true,
            },
            // Framer Motion - separate chunk due to size
            framerMotion: {
              name: 'framer-motion',
              chunks: 'all',
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              priority: 45,
              enforce: true,
              reuseExistingChunk: true,
            },
            // Lucide icons
            lucideReact: {
              name: 'lucide-react',
              chunks: 'all',
              test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
              priority: 43,
              enforce: true,
              reuseExistingChunk: true,
            },
            // Syntax highlighter - lazy loaded only when needed
            syntaxHighlighter: {
              name: 'syntax-highlighter',
              chunks: 'async',
              test: /[\\/]node_modules[\\/]react-syntax-highlighter[\\/]/,
              priority: 42,
              enforce: true,
              reuseExistingChunk: true,
            },
            // Next.js internals
            lib: {
              name: 'lib',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](next|next-intl|next-themes)[\\/]/,
              priority: 40,
              enforce: true,
              reuseExistingChunk: true,
            },
            // Shared components across pages
            commons: {
              name: 'commons',
              chunks: 'all',
              minChunks: 2,
              priority: 20,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
