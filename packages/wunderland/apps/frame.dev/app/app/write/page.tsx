/**
 * Write Mode Page - Prompt Explorer (/app/write on quarry.space)
 */
'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { ToastProvider } from '@/components/quarry/ui/common/Toast'
import { InstanceConfigProvider } from '@/lib/config'

const PromptExplorerMode = dynamic(
  () => import('@/components/quarry/ui/prompts/PromptExplorerMode'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Loading prompts...</span>
        </div>
      </div>
    ),
  }
)

export default function WritePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Loading Write...</span>
        </div>
      </div>
    }>
      <InstanceConfigProvider>
        <ToastProvider>
          <PromptExplorerMode />
        </ToastProvider>
      </InstanceConfigProvider>
    </Suspense>
  )
}
