/**
 * Redirect /codex to /quarry
 * Client-side redirect for static export compatibility
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CodexRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/quarry')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-zinc-500 dark:text-zinc-400">Redirecting to Quarry...</p>
      </div>
    </div>
  )
}
