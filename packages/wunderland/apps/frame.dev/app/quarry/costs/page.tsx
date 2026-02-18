/**
 * API Costs Page
 * @module app/quarry/costs/page
 *
 * LLM API cost tracking and analytics dashboard.
 * All data is stored locally - nothing is sent to external servers.
 */

'use client'

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Loader2 } from 'lucide-react'
import QuarryPageLayout from '@/components/quarry/QuarryPageLayout'
import { CostAnalyticsPage } from '@/components/quarry/analytics/CostAnalyticsPage'
import { CodexTreeView } from '@/components/quarry/tree'
import { useGithubTree } from '@/components/quarry/hooks/useGithubTree'

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
    </div>
  )
}

function CostsContent() {
  const router = useRouter()
  const { theme } = useTheme()
  const isDark = theme?.includes('dark')
  const { tree, loading: treeLoading } = useGithubTree()

  return (
    <QuarryPageLayout
      title="API Costs"
      description="Track your LLM API usage and costs"
      leftPanelContent={
        <CodexTreeView
          data={tree}
          loading={treeLoading}
          onNavigate={(path) => router.push(`/quarry/${path.replace(/\.md$/, '')}`)}
          isDark={isDark}
          enableDragDrop={false}
        />
      }
    >
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <Suspense fallback={<LoadingState />}>
          <CostAnalyticsPage />
        </Suspense>
      </div>
    </QuarryPageLayout>
  )
}

export default function CostsRoute() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CostsContent />
    </Suspense>
  )
}
