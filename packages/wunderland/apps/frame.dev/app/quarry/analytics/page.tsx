/**
 * Analytics Page - Content growth and tag evolution analytics
 * Uses the integrated Codex viewer with analytics as the initial view
 * @module codex/analytics/page
 */

'use client'

import { Suspense } from 'react'
import QuarryQuarryViewer from '@/components/quarry-codex-viewer'

export default function AnalyticsRoute() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    }>
      <QuarryQuarryViewer isOpen mode="page" initialView="analytics" />
    </Suspense>
  )
}
