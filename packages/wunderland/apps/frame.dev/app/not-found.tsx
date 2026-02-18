/**
 * Custom 404 page with SPA fallback for Quarry deep links
 * 
 * Handles:
 * - /codex/* → redirects to /quarry/*
 * - /quarry/weaves/* (deep links) → loads Quarry SPA which handles client-side
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, ArrowLeft, Search } from 'lucide-react'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'
import QuarryQuarryViewer from '@/components/quarry-codex-viewer'
import { OpenTabsProvider } from '@/components/quarry/contexts/OpenTabsContext'
import { AuthProvider } from '@/lib/auth'

/**
 * Check if a path is a valid Quarry content path
 * 
 * Handles both:
 * - frame.dev paths: /quarry/weaves/..., /quarry/docs/..., etc.
 * - quarry.space paths: /weaves/..., /docs/..., etc. (middleware rewrites but pathname shows original)
 */
function isQuarryContentPath(path: string): boolean {
  const quarryContentPrefixes = [
    // frame.dev paths (with /quarry/ prefix)
    '/quarry/weaves/',
    '/quarry/docs/',
    '/quarry/wiki/',
    '/quarry/schema/',
    // quarry.space paths (no /quarry/ prefix - middleware handles rewrite but pathname shows original)
    '/weaves/',
    '/docs/',
    '/wiki/',
    '/schema/',
  ]
  return quarryContentPrefixes.some(prefix => path.startsWith(prefix))
}

/**
 * Parse Quarry path into viewer props
 * 
 * @remarks
 * - Paths with file extensions (e.g., /weaves/wiki/intro.md) → open that file
 * - Paths without extensions (e.g., /weaves/wiki/tutorials) → browse that folder
 *   DO NOT auto-add .md extension - let the viewer show the folder contents
 * - Handles both /quarry/weaves/... (frame.dev) and /weaves/... (quarry.space)
 */
function parseQuarryPath(pathname: string): { directoryPath: string; filePath: string | null } {
  // Remove /quarry/ prefix if present, and leading slash + trailing slash
  const cleaned = pathname
    .replace(/^\/quarry\/?/, '')  // Remove /quarry/ prefix (frame.dev)
    .replace(/^\//, '')           // Remove leading slash (quarry.space: /weaves/... → weaves/...)
    .replace(/\/$/, '')           // Remove trailing slash
  
  if (!cleaned) {
    return { directoryPath: '', filePath: null }
  }
  
  const segments = cleaned.split('/')
  const lastSegment = segments[segments.length - 1]
  const hasExtension = /\.[a-zA-Z0-9]+$/.test(lastSegment)
  
  if (hasExtension) {
    // Explicit file path (e.g., /weaves/wiki/intro.md)
    return {
      directoryPath: segments.slice(0, -1).join('/'),
      filePath: cleaned,
    }
  }
  
  // No extension = folder path (e.g., /weaves/wiki/tutorials)
  // Don't assume it's a file - let the viewer browse the folder
  return {
    directoryPath: cleaned,
    filePath: null,
  }
}

export default function NotFound() {
  const router = useRouter()
  const pathname = usePathname()
  const resolvePath = useQuarryPath()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [isQuarrySPA, setIsQuarrySPA] = useState(false)
  const [quarryPath, setQuarryPath] = useState<{ directoryPath: string; filePath: string | null } | null>(null)

  useEffect(() => {
    if (!pathname) return

    // Check if this is a /codex URL that should redirect to /quarry
    if (pathname.startsWith('/codex')) {
      setIsRedirecting(true)
      const newPath = pathname.replace(/^\/codex/, '/quarry')
      router.replace(newPath)
      return
    }

    // Check if this is a Quarry content path that should load the SPA
    // This handles deep links that weren't pre-rendered
    if (isQuarryContentPath(pathname)) {
      const parsed = parseQuarryPath(pathname)
      setQuarryPath(parsed)
      setIsQuarrySPA(true)
    }
  }, [pathname, router])

  // Show loading state while redirecting
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-500 dark:text-zinc-400">Redirecting to Quarry...</p>
        </div>
      </div>
    )
  }

  // Load Quarry SPA for valid content paths that weren't pre-rendered
  // Wrap in providers since we're outside the /quarry/* layout
  if (isQuarrySPA && quarryPath) {
    return (
      <AuthProvider>
        <OpenTabsProvider>
          <QuarryQuarryViewer
            isOpen
            mode="page"
            initialPath={quarryPath.directoryPath}
            initialFile={quarryPath.filePath}
          />
        </OpenTabsProvider>
      </AuthProvider>
    )
  }

  // Standard 404 page
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-zinc-200 dark:text-zinc-800 mb-4">404</div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          Page Not Found
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/quarry"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 text-white hover:bg-cyan-600 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go to Quarry
          </Link>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            Looking for something specific?
          </p>
          <Link
            href={resolvePath('/quarry/search')}
            className="inline-flex items-center gap-1.5 text-sm text-cyan-600 dark:text-cyan-400 hover:underline mt-2"
          >
            <Search className="w-3.5 h-3.5" />
            Search Quarry
          </Link>
        </div>
      </div>
    </div>
  )
}
