/**
 * Plan Page - Full-featured task and calendar management
 * Uses QuarryPageLayout with sidebar for consistent navigation
 * @module quarry/plan/page
 */

'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'

// Dynamic import to avoid SSR issues with localStorage
const PlannerMode = dynamic(
  () => import('@/components/quarry/ui/planner/PlannerMode'),
  { ssr: false }
)

export default function PlanPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full" />
      </div>
    }>
      <PlannerMode />
    </Suspense>
  )
}
