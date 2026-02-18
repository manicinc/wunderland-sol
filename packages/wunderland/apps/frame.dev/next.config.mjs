/** @type {import('next').NextConfig} */

// ============================================================================
// BUILD CONFIGURATION
// ============================================================================

// Conditional static export:
// - STATIC_EXPORT=true (CI/GitHub Pages) -> static HTML, no API routes
// - STATIC_EXPORT not set (local dev, server deploy) -> full Next.js with API routes
const isStaticExport = process.env.STATIC_EXPORT === 'true'

// Deployment mode: 'static' (free/GitHub Pages) or 'offline' (paid/local)
const deploymentMode = process.env.NEXT_PUBLIC_DEPLOYMENT_MODE || 'static'
const isOfflineMode = deploymentMode === 'offline'

// Edition: 'community' (free) or 'premium' (paid) - defaults to premium for full codebase
const edition = process.env.NEXT_PUBLIC_EDITION || 'premium'
const isPremiumBuild = edition === 'premium' || isOfflineMode

// Log build configuration
console.log('[Build Config]', {
  deploymentMode,
  edition,
  isStaticExport,
  isPremiumBuild,
})

// For Electron builds, use standalone output (minimal server bundle)
// For GitHub Pages, use static export (no server needed)
// For Capacitor/mobile builds, use static export
const isElectronBuild = process.env.ELECTRON_BUILD === 'true'
const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true'

// Base path for path-based routing (e.g., quarry.space/app)
// Only used for production deployments, not for local dev or Electron/Capacitor
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
const useBasePath = basePath && !isElectronBuild && !isCapacitorBuild

if (useBasePath) {
  console.log('[Build Config] Using basePath:', basePath)
}

const nextConfig = {
  // Modern browser targets and performance optimizations
  experimental: {
    // Tree-shake these packages for smaller bundles
    optimizePackageImports: ['framer-motion', 'lucide-react', '@radix-ui/react-icons'],
  },
  // Conditional output mode:
  // - STATIC_EXPORT=true (GitHub Pages) -> static HTML, no API routes
  // - ELECTRON_BUILD=true (Electron) -> standalone server bundle with API routes
  // - CAPACITOR_BUILD=true (iOS/Android) -> static HTML for native wrapper
  // - Neither (local dev) -> default Next.js behavior
  ...((isStaticExport || isCapacitorBuild) && { output: 'export' }),
  ...(isElectronBuild && { output: 'standalone' }),

  // For standalone builds with pnpm, we need to explicitly include certain modules
  // that the file tracer misses due to pnpm's symlink structure
  ...(isElectronBuild && {
    experimental: {
      outputFileTracingIncludes: {
        '/**': ['./node_modules/styled-jsx/**/*'],
      },
    },
  }),

  // Base path for path-based routing (e.g., /app for quarry.space/app)
  // Only applied when NEXT_PUBLIC_BASE_PATH is set and not in Electron/Capacitor
  ...(useBasePath && { basePath }),
  ...(useBasePath && { assetPrefix: basePath }),

  trailingSlash: true, // Required for static export client-side navigation
  images: {
    unoptimized: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  // Route redirects for backwards compatibility
  async redirects() {
    return [
      // Backwards compatibility: /codex/* → /quarry/*
      {
        source: '/codex',
        destination: '/quarry',
        permanent: true, // 301 redirect
      },
      {
        source: '/codex/:path*',
        destination: '/quarry/:path*',
        permanent: true,
      },
      // Redirect /checkout to /app/checkout for quarry.space (basePath = /app)
      // basePath: false prevents automatic basePath prepending
      {
        source: '/checkout',
        destination: '/app/checkout',
        permanent: true,
        basePath: false,
      },
      {
        source: '/checkout/:path*',
        destination: '/app/checkout/:path*',
        permanent: true,
        basePath: false,
      },
    ]
  },
  // Cache control and security headers
  async headers() {
    return [
      {
        // Security headers for all routes
        source: '/:path*',
        headers: [
          // HSTS - Force HTTPS for 2 years
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Prevent MIME type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Control referrer information
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Cross-Origin-Opener-Policy for origin isolation
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          // Basic CSP for frame-ancestors (XSS protection)
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
        ],
      },
      {
        // Static assets - aggressive caching (1 year)
        source: '/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // JavaScript and CSS chunks - aggressive caching (1 year, fingerprinted)
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Landing pages - moderate caching (1 hour for freshness)
        source: '/quarry/landing/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ]
  },
  typescript: {
    // Ignore build errors caused by @types/react version conflicts between
    // radix-ui bundled types and project types. These are type-only issues
    // that don't affect runtime behavior.
    ignoreBuildErrors: true
  },
  // Transpile @huggingface/transformers for proper ESM handling
  // Also transpile @framers/sql-storage-adapter to ensure proper browser compatibility
  transpilePackages: ['@huggingface/transformers', '@framers/sql-storage-adapter'],
  webpack: (config, { isServer, webpack }) => {
    config.resolve = config.resolve || {}

    // ========================================================================
    // BUILD-TIME FEATURE FLAGS (for dead code elimination)
    // ========================================================================
    config.plugins = config.plugins || []
    config.plugins.push(
      new webpack.DefinePlugin({
        // Deployment mode flags
        '__DEPLOYMENT_MODE__': JSON.stringify(deploymentMode),
        '__EDITION__': JSON.stringify(edition),
        '__IS_OFFLINE_BUILD__': JSON.stringify(isOfflineMode),
        '__IS_PREMIUM_BUILD__': JSON.stringify(isPremiumBuild),
        '__IS_COMMUNITY_BUILD__': JSON.stringify(!isPremiumBuild),
        '__IS_STATIC_EXPORT__': JSON.stringify(isStaticExport),

        // Feature flags for tree-shaking
        // Premium features (disabled in community builds for smaller bundle)
        '__ENABLE_QUIZZES__': JSON.stringify(isPremiumBuild),
        '__ENABLE_FLASHCARDS__': JSON.stringify(isPremiumBuild),
        '__ENABLE_QNA__': JSON.stringify(isPremiumBuild),
        '__ENABLE_EXPORT__': JSON.stringify(isPremiumBuild),

        // Always enabled features
        '__ENABLE_SPIRAL_PATH__': JSON.stringify(true),
        '__ENABLE_SEMANTIC_SEARCH__': JSON.stringify(true),
        '__ENABLE_BOOKMARKS__': JSON.stringify(true),
      })
    )

    // Ignore server-only dependencies for client bundles
    if (!isServer) {
      // Build the alias object - webpack requires false (not undefined) to ignore modules
      const clientAliases = {
        ...config.resolve.alias,
        'onnxruntime-node': false,
        'sharp': false,
        'pg': false,
        'pg-native': false,
        '@aws-sdk/client-s3': false,
        'fs': false,
        'dns': false,
        'net': false,
        'tls': false,
        'module': false,
        'perf_hooks': false,
        // Optional dependencies from 'natural' library (not installed but referenced)
        'webworker-threads': false,
        'aws4': false,
        // MongoDB/Mongoose optional deps
        'mongodb-client-encryption': false,
        'kerberos': false,
        '@mongodb-js/zstd': false,
        'snappy': false,
        '@aws-sdk/credential-providers': false,
      }
      
      // Native SQLite/Capacitor dependencies - stub appropriately based on build target
      // @capacitor-community/sqlite is only for Capacitor (mobile) builds
      if (!isCapacitorBuild) {
        clientAliases['@capacitor-community/sqlite'] = false
        clientAliases['@capacitor/core'] = false
      }
      // better-sqlite3 is only for Electron builds with native bindings
      // Also stub for static exports since native modules don't work in browsers
      if (!isElectronBuild || isStaticExport) {
        clientAliases['better-sqlite3'] = false
      }
      
      config.resolve.alias = clientAliases
      
      // ====================================================================
      // EXTERNALIZE ONNX RUNTIME WEB FOR ALL PRODUCTION BUILDS
      // ====================================================================
      // Externalize onnxruntime-web to avoid Terser minification issues with
      // import.meta.url. The semantic search module uses dynamic imports with
      // CDN fallbacks, so this is safe for both static and server builds.
      // Note: This only affects production builds - dev mode doesn't minify.
      config.externals = config.externals || []
      if (typeof config.externals === 'object' && !Array.isArray(config.externals)) {
        config.externals = [config.externals]
      }
      config.externals.push(({ request }, callback) => {
        if (request === 'onnxruntime-web' || request?.startsWith('onnxruntime-web/')) {
          // Use root global for browser environment
          return callback(null, `root ortRuntime`)
        }
        callback()
      })
    } else {
      // Server-side aliases
      const serverAliases = {
        ...(config.resolve.alias || {}),
        'onnxruntime-web': false,
        // Block any potential native ORT bindings from server bundle
        'onnxruntime-node': false,
        'onnxruntime-common': false,
        // Block transformers on server to avoid import.meta issues
        '@huggingface/transformers': false,
        // Optional dependencies from 'natural' library (not installed but referenced)
        'webworker-threads': false,
        'aws4': false,
        // MongoDB/Mongoose optional deps
        'mongodb-client-encryption': false,
        'kerberos': false,
        '@mongodb-js/zstd': false,
        'snappy': false,
        '@aws-sdk/credential-providers': false,
      }
      
      // Native SQLite/Capacitor dependencies - always stub on server for web builds
      // These are only used in Capacitor (mobile) or Electron (desktop) environments
      if (!isCapacitorBuild) {
        serverAliases['@capacitor-community/sqlite'] = false
        serverAliases['@capacitor/core'] = false
      }
      // better-sqlite3 is only for Electron builds with native bindings
      if (!isElectronBuild) {
        serverAliases['better-sqlite3'] = false
      }
      
      config.resolve.alias = serverAliases
      // Prevent webpack from trying to bundle native sharp binaries on the server build.
      config.externals = config.externals || []
      config.externals.push(({ request }, callback) => {
        if (request && request.startsWith('sharp')) {
          return callback(null, `commonjs ${request}`)
        }
        // Externalize native bindings if ever referenced
        if (request && request.endsWith('.node')) {
          return callback(null, `commonjs ${request}`)
        }
        callback()
      })
    }

    // ========================================================================
    // SKIP PARSING MINIFIED THIRD-PARTY MODULES
    // ========================================================================
    // Prevent webpack from parsing pre-minified vendor files that may contain
    // syntax patterns that cause parse errors (especially in ONNX Runtime Web)
    config.module = config.module || {}
    
    // Initialize noParse array
    config.module.noParse = config.module.noParse || []
    if (!Array.isArray(config.module.noParse)) {
      config.module.noParse = [config.module.noParse]
    }
    // Add patterns to skip parsing minified files
    config.module.noParse.push(
      /onnxruntime-web[\\/]dist[\\/].*\.min\.(js|mjs)$/,
      /onnxruntime-web[\\/]dist[\\/]esm[\\/]/,
      /@huggingface[\\/]transformers[\\/]dist[\\/].*\.min\.js$/
    )

    // Also ignore .node files (native bindings)
    config.module.noParse.push(/\.node$/)

    // Enable async WebAssembly so ORT .wasm files load as assets
    config.experiments = {
      ...(config.experiments || {}),
      asyncWebAssembly: true,
    }

    // Force React into its own chunk to prevent hook sharing through framer-motion
    // This fixes React #311 errors in dynamically imported components
    if (!isServer) {
      config.optimization = config.optimization || {}
      config.optimization.splitChunks = config.optimization.splitChunks || {}
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        // Isolate React from other vendor chunks to prevent hook context issues
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
          name: 'react-vendor',
          chunks: 'all',
          priority: 50, // Higher priority than default vendor chunks
          enforce: true,
        },
        // Keep framer-motion separate from React
        framerMotion: {
          test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
          name: 'framer-motion',
          chunks: 'all',
          priority: 40,
          enforce: true,
        },
      }
    }

    return config
  }
};

export default nextConfig;
