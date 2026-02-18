/**
 * Tags Page - Full-featured tags browser and management
 * Uses the integrated Codex viewer with tags as the initial view
 * @module codex/tags/page
 */

'use client'

import { Suspense } from 'react'
import QuarryQuarryViewer from '@/components/quarry-codex-viewer'

export default function TagsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-zinc-50 dark:bg-zinc-900">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Loading tags...</span>
        </div>
      </div>
    }>
      <QuarryQuarryViewer isOpen mode="page" initialView="tags" />
    </Suspense>
  )
}
