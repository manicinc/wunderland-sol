/**
 * Deployment Mode Detection Utilities
 * @module lib/utils/deploymentMode
 *
 * Provides utilities for detecting the deployment environment
 * and determining feature availability (e.g., API routes).
 */

/**
 * Check if the application is running in static export mode
 * (deployed to GitHub Pages, Vercel static, etc.)
 */
export function isStaticExport(): boolean {
  if (typeof window === 'undefined') return false

  // Check for known static hosting patterns
  const hostname = window.location.hostname
  return (
    hostname.includes('github.io') ||
    hostname.includes('frame.dev') ||
    hostname.includes('vercel.app') ||
    process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === 'static'
  )
}

/**
 * Check if the application is running in local development mode
 */
export function isLocalDev(): boolean {
  if (typeof window === 'undefined') return true
  return (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  )
}

/**
 * Check if API routes are available
 * API routes are only available in:
 * - Local development
 * - Electron builds (standalone mode)
 * - Server deployments (offline mode)
 */
export function hasApiRoutes(): boolean {
  // In SSR context, assume API routes are available
  if (typeof window === 'undefined') return true

  // Local development always has API routes
  if (isLocalDev()) return true

  // Offline/premium mode has API routes (Electron, self-hosted)
  if (process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === 'offline') return true

  // Static export mode does not have API routes
  return false
}

/**
 * Get the current deployment mode
 */
export function getDeploymentMode(): 'static' | 'offline' | 'development' {
  if (isLocalDev()) return 'development'
  if (process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === 'offline') return 'offline'
  return 'static'
}

/**
 * Check if the application is running on the Quarry standalone domain
 * (quarry.space or similar dedicated Quarry domains)
 */
export function isQuarryDomain(): boolean {
  if (typeof window === 'undefined') return false
  const hostname = window.location.hostname
  return (
    hostname === 'quarry.space' ||
    hostname.endsWith('.quarry.space') ||
    hostname === 'quarry.dev' ||
    hostname.endsWith('.quarry.dev')
  )
}

/**
 * Get the appropriate URL for the Quarry app
 * Used for "Try Quarry" / "Open App" links
 *
 * Route structure:
 * - quarry.space/ → landing page
 * - quarry.space/write, /reflect, /plan → feature pages
 * - frame.dev/quarry → landing page
 * - frame.dev/quarry/write, /quarry/reflect, /quarry/plan → feature pages
 */
export function getQuarryAppUrl(): string {
  if (typeof window === 'undefined') return '/quarry'

  // On quarry.space domain, use root path
  if (isQuarryDomain()) return '/'

  // On frame.dev or other, use /quarry path
  return '/quarry'
}

/**
 * Marketing/info pages that stay at root on quarry.space (no /app/ prefix)
 */
const MARKETING_PAGES = [
  'landing',
  'about',
  'faq',
  'privacy',
  'waitlist',
  'api',
  'api-docs',
  'api-playground',
  'architecture',
  'self-host',
  'changelog',
  'costs',
  'canvas-showcase',
]

/**
 * App/feature pages that go under /app/ on quarry.space
 */
const APP_PAGES = [
  'write',
  'reflect',
  'plan',
  'dashboard',
  'browse',
  'search',
  'graph',
  'new',
  'learn',
  'spiral-path',
  'research',
  'suggestions',
  'collections',
  'tags',
  'supertags',
  'templates',
  'analytics',
  'activity',
  'evolution',
  'settings',
  'batch-generate',
  'explore',
]

/**
 * Check if a path is a marketing/info page (stays at root on quarry.space)
 */
function isMarketingPage(path: string): boolean {
  // Extract the first path segment after /quarry/
  const match = path.match(/^\/quarry\/([^/]+)/)
  if (!match) return false
  return MARKETING_PAGES.includes(match[1])
}

/**
 * Check if a path is an app/feature page (goes under /app/ on quarry.space)
 */
function isAppPage(path: string): boolean {
  // Extract the first path segment after /quarry/
  const match = path.match(/^\/quarry\/([^/]+)/)
  if (!match) return false
  return APP_PAGES.includes(match[1])
}

/**
 * Get the correct path for Quarry routes based on the current domain.
 *
 * On quarry.space:
 * - App pages: /quarry/new → /app/new (goes under /app/)
 * - Marketing pages: /quarry/about → /about (stays at root)
 * - Root: /quarry → /
 *
 * On frame.dev: paths remain unchanged with /quarry prefix
 *
 * @param path - The path with /quarry prefix (e.g., '/quarry/about', '/quarry#features')
 * @returns The adjusted path for the current domain
 */
export function getQuarryPath(path: string): string {
  if (!isQuarryDomain()) return path

  // Root path
  if (path === '/quarry') return '/'
  if (path.startsWith('/quarry#')) return path.replace('/quarry#', '/#')

  // Check if this is an app/feature page
  if (path.startsWith('/quarry/')) {
    if (isAppPage(path)) {
      // App pages go to /app/* on quarry.space
      return '/app' + path.replace('/quarry', '')
    }
    // Marketing pages stay at root
    return path.replace('/quarry', '')
  }

  return path
}

/**
 * Pure function version that takes isOnQuarryDomain as parameter
 * (for use with React state after hydration)
 */
export function resolveQuarryPath(path: string, isOnQuarryDomain: boolean): string {
  if (!isOnQuarryDomain) return path

  // Root path
  if (path === '/quarry') return '/'
  if (path.startsWith('/quarry#')) return path.replace('/quarry#', '/#')

  // Check if this is an app/feature page
  if (path.startsWith('/quarry/')) {
    // Extract the first path segment
    const match = path.match(/^\/quarry\/([^/]+)/)
    if (match && APP_PAGES.includes(match[1])) {
      // App pages go to /app/* on quarry.space
      return '/app' + path.replace('/quarry', '')
    }
    // Marketing pages stay at root
    return path.replace('/quarry', '')
  }

  return path
}
