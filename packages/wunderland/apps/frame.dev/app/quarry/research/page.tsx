/**
 * Research Page - Web research, citations, and session management
 * Uses the integrated Codex viewer with research as the initial view
 * @module codex/research/page
 */

'use client'

import { Suspense } from 'react'
import QuarryQuarryViewer from '@/components/quarry-codex-viewer'

export default function ResearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full" />
      </div>
    }>
      <QuarryQuarryViewer isOpen mode="page" initialView="research" />
    </Suspense>
  )
}
