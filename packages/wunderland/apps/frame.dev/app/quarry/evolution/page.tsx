/**
 * Evolution Page - Historical timeline of PKM growth
 * Shows full chronological evolution with collapsible timeframes
 * @module quarry/evolution/page
 */

'use client'

import { Suspense } from 'react'
import EvolutionPage from './EvolutionPage'

export default function EvolutionRoute() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-zinc-50 dark:bg-zinc-900">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading evolution timeline...</p>
        </div>
      </div>
    }>
      <EvolutionPage />
    </Suspense>
  )
}

