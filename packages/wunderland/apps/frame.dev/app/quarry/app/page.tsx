'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import QuarryQuarryViewer from '@/components/quarry-codex-viewer'

const DASHBOARD_CONFIG_KEY = 'codex-dashboard-config'
const INTERNAL_PATH_KEY = 'quarry-internal-path'

/**
 * Quarry App Entry Point
 *
 * The main Quarry application viewer.
 * Handles SPA redirect from 404.html for deep content links.
 * If user has set Dashboard as homepage, redirects there.
 */
export default function QuarryAppPage() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [initialPath, setInitialPath] = useState<string | undefined>(undefined)
  const [initialFile, setInitialFile] = useState<string | null>(null)

  // Check for SPA redirect path and dashboard homepage setting
  useEffect(() => {
    try {
      // Check for SPA redirect path (set by 404.html for deep links)
      const redirectPath = sessionStorage.getItem(INTERNAL_PATH_KEY)
      if (redirectPath) {
        sessionStorage.removeItem(INTERNAL_PATH_KEY)
        
        // Clean the path (strip leading/trailing slashes)
        const cleanPath = redirectPath.replace(/^\/|\/$/g, '')
        
        // Determine if this is a file (.md extension) or directory
        const hasExtension = /\.[a-zA-Z0-9]+$/.test(cleanPath.split('/').pop() || '')
        
        if (hasExtension) {
          // It's a file with explicit extension
          setInitialFile(cleanPath)
          const lastSlash = cleanPath.lastIndexOf('/')
          if (lastSlash > 0) {
            setInitialPath(cleanPath.substring(0, lastSlash))
          }
        } else {
          // No extension - treat as strand file (append .md)
          // This matches the SEO-friendly URL pattern: /weaves/topic/strand-name
          // The actual file is strand-name.md
          const filePath = `${cleanPath}.md`
          setInitialFile(filePath)
          const lastSlash = cleanPath.lastIndexOf('/')
          if (lastSlash > 0) {
            setInitialPath(cleanPath.substring(0, lastSlash))
          } else {
            setInitialPath('')
          }
        }
        
        setIsChecking(false)
        return
      }

      // Check if dashboard should be homepage
      const stored = localStorage.getItem(DASHBOARD_CONFIG_KEY)
      if (stored) {
        const config = JSON.parse(stored)
        if (config.replaceHomepage) {
          router.replace('/quarry/dashboard')
          return
        }
      }
    } catch (e) {
      // Ignore errors, show normal codex
    }
    setIsChecking(false)
  }, [router])

  // Show loading while checking redirect
  if (isChecking) {
    return (
      <div className="py-20 text-center text-zinc-400 dark:text-zinc-500">Loading...</div>
    )
  }

  return (
    <Suspense fallback={<div className="py-20 text-center text-zinc-400 dark:text-zinc-500">Loading Quarry...</div>}>
      <QuarryQuarryViewer 
        isOpen 
        mode="page" 
        initialPath={initialPath}
        initialFile={initialFile} 
      />
    </Suspense>
  )
}
