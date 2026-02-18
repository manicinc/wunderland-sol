/**
 * Search Page - Knowledge search, visualization, and schema exploration
 * Uses the integrated Codex viewer with search as the initial view
 * @module codex/search/page
 */

'use client'

import { Suspense } from 'react'
import QuarryQuarryViewer from '@/components/quarry-codex-viewer'

export default function CodexSearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    }>
      <QuarryQuarryViewer isOpen mode="page" initialView="search" />
    </Suspense>
  )
}
