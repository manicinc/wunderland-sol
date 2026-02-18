'use client'

/**
 * Client component for Quarry Codex path handling
 * @module app/quarry/[...path]/CodexPathClient
 * 
 * Handles both pre-rendered and dynamically navigated paths.
 * For static export, this ensures deep links work via client-side hydration.
 */

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import QuarryQuarryViewer from '@/components/quarry-codex-viewer'

interface CodexPathClientProps {
  /** Initial directory path from server */
  initialPath: string
  /** Initial file path from server */
  initialFile: string | null
  /** Path segments from server params */
  pathSegments: string[]
}

/**
 * Parse URL pathname into codex path components
 */
function parsePathnameToCodexPath(pathname: string): {
  directoryPath: string
  filePath: string | null
  isValid: boolean
} {
  // Remove /quarry/ prefix and trailing slash
  const cleaned = pathname
    .replace(/^\/quarry\/?/, '')
    .replace(/\/$/, '')
  
  if (!cleaned) {
    return { directoryPath: '', filePath: null, isValid: false }
  }
  
  const segments = cleaned.split('/')

  // In local/offline mode, paths can start directly with weave names (e.g., frame/...)
  // rather than requiring weaves/frame/... prefix
  // Only reject completely empty segments, not "unknown" root directories
  if (segments.length === 0 || !segments[0]) {
    return { directoryPath: '', filePath: null, isValid: false }
  }
  
  const lastSegment = segments[segments.length - 1]
  const hasExtension = /\.[a-zA-Z0-9]+$/.test(lastSegment)
  
  if (hasExtension) {
    return {
      directoryPath: segments.slice(0, -1).join('/'),
      filePath: cleaned,
      isValid: true,
    }
  }
  
  return {
    directoryPath: cleaned,
    filePath: `${cleaned}.md`,
    isValid: true,
  }
}

export default function CodexPathClient({
  initialPath,
  initialFile,
  pathSegments: _pathSegments, // Unused - always empty for non-pre-rendered static export routes
}: CodexPathClientProps) {
  const pathname = usePathname()
  const [currentPath, setCurrentPath] = useState(initialPath)
  const [currentFile, setCurrentFile] = useState(initialFile)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // On mount, check if we need to parse the URL (for non-pre-rendered routes)
    // This handles the case where the page shell loads but the specific path
    // wasn't pre-rendered
    const { directoryPath, filePath, isValid } = parsePathnameToCodexPath(pathname)
    
    if (isValid) {
      // If server-provided path is empty but URL has a valid path,
      // use the URL path (happens for non-pre-rendered routes)
      if (!initialPath && directoryPath) {
        setCurrentPath(directoryPath)
        setCurrentFile(filePath)
      }
    }
    
    setIsReady(true)
  }, [pathname, initialPath])

  // Show loading state until client-side path resolution is complete
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-500 dark:text-zinc-400">Loading Codex…</p>
        </div>
      </div>
    )
  }

  // If no valid path, show a friendly message with navigation
  // Note: Don't check pathSegments.length - it's always 0 for non-pre-rendered routes in static export
  if (!currentPath) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            Welcome to Quarry
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mb-6">
            Navigate to a weave or strand to get started.
          </p>
          <a
            href="/quarry/weaves"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
          >
            Browse Weaves
          </a>
        </div>
      </div>
    )
  }

  return (
    <QuarryQuarryViewer
      isOpen
      mode="page"
      initialPath={currentPath}
      initialFile={currentFile}
    />
  )
}



