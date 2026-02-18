'use client'

/**
 * Quarry Settings Page - Redirects to main app with settings modal
 *
 * This page now redirects to the main Quarry app with the settings modal open.
 * All settings are consolidated in the QuarrySettingsModal.
 *
 * @module app/quarry/settings/page
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { isQuarryDomain } from '@/lib/utils/deploymentMode'

export default function SettingsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to main Quarry viewer with settings query param
    // On quarry.space: /?settings=true
    // On frame.dev: /quarry?settings=true
    const appPath = isQuarryDomain() ? '/?settings=true' : '/quarry?settings=true'
    router.replace(appPath)
  }, [router])

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500 mx-auto mb-4" />
        <p className="text-zinc-500 dark:text-zinc-400">Opening Quarry settings...</p>
      </div>
    </div>
  )
}
