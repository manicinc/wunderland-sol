/**
 * /app/new route for quarry.space
 * Renders the same content as /quarry/new
 */
'use client'

import { Suspense } from 'react'
import QuarryQuarryViewer from '@/components/quarry-codex-viewer'

export default function NewStrandPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    }>
      <QuarryQuarryViewer isOpen mode="page" initialView="new" />
    </Suspense>
  )
}
