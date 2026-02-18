/**
 * Reflect Mode Page
 * @module app/quarry/reflect/page
 *
 * Personal journaling with calendar-based navigation.
 * Uses QuarryPageLayout for consistent navigation with other Quarry pages.
 */

'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { ToastProvider } from '@/components/quarry/ui/common/Toast'
import { InstanceConfigProvider } from '@/lib/config'

// Dynamically import the ReflectModePage component to avoid SSR issues with IndexedDB
const ReflectModePage = dynamic(
  () => import('./ReflectModePage'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Loading Reflect...</span>
        </div>
      </div>
    ),
  }
)

export default function ReflectPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Loading Reflect...</span>
        </div>
      </div>
    }>
      <InstanceConfigProvider>
        <ToastProvider>
          <ReflectModePage />
        </ToastProvider>
      </InstanceConfigProvider>
    </Suspense>
  )
}
