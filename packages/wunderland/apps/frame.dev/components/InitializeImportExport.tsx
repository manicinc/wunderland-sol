/**
 * Initialize Import/Export System
 * @module components/InitializeImportExport
 *
 * Client component to initialize the import/export system on app startup.
 * Also handles SPA redirect for GitHub Pages (restores deep links after 404).
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initializeImportExport } from '@/lib/import-export'

export function InitializeImportExport() {
  const router = useRouter()

  useEffect(() => {
    // Initialize import/export system on mount
    try {
      initializeImportExport()
    } catch (error) {
      console.error('[InitializeImportExport] Failed to initialize:', error)
    }

    // GitHub Pages SPA redirect handler
    // When a 404.html redirects here, restore navigation to the original path
    try {
      const redirectPath = sessionStorage.getItem('spa-redirect-path')
      if (redirectPath) {
        // Clear the stored path immediately to prevent loops
        sessionStorage.removeItem('spa-redirect-path')

        // Navigate to the original path using Next.js router
        // Use replace to avoid adding the redirect to history
        console.log('[SPA Redirect] Restoring path:', redirectPath)
        router.replace(redirectPath)
      }

      // Quarry.space internal path handler
      // When redirected from /app/weaves/... to /quarry/app, restore internal path
      const internalPath = sessionStorage.getItem('quarry-internal-path')
      if (internalPath) {
        sessionStorage.removeItem('quarry-internal-path')
        // Dispatch custom event for QuarryViewer to handle
        window.dispatchEvent(new CustomEvent('quarry-navigate', { 
          detail: { path: internalPath } 
        }))
        console.log('[SPA Redirect] Restoring Quarry internal path:', internalPath)
      }
    } catch (error) {
      // sessionStorage might not be available in some contexts
      console.error('[SPA Redirect] Failed to restore path:', error)
    }
  }, [router])

  // This component renders nothing
  return null
}
