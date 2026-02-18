/**
 * /app route - Quarry App Entry Point for quarry.space
 * Shows the main Quarry Codex Viewer
 */
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
export default function AppHomePage() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [initialPath, setInitialPath] = useState<string | null>(null)

  // Check for SPA redirect path and dashboard homepage setting
  useEffect(() => {
    try {
      // Check for SPA redirect path (set by 404.html for deep links)
      const redirectPath = sessionStorage.getItem(INTERNAL_PATH_KEY)
      if (redirectPath) {
        sessionStorage.removeItem(INTERNAL_PATH_KEY)
        // Navigate to the content path within the SPA
        setInitialPath(redirectPath)
        setIsChecking(false)
        return
      }

      // Check if dashboard should be homepage
      const stored = localStorage.getItem(DASHBOARD_CONFIG_KEY)
      if (stored) {
        const config = JSON.parse(stored)
        if (config.replaceHomepage) {
          router.replace('/app/dashboard')
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
      <QuarryQuarryViewer isOpen mode="page" initialFile={initialPath} />
    </Suspense>
  )
}
