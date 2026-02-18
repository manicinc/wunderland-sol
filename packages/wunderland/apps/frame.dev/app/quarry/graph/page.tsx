'use client'

/**
 * Full Fabric Knowledge Graph - Interactive visualization
 * @route /quarry/graph
 *
 * Full-screen interactive graph starting from the Fabric level,
 * allowing exploration of the entire knowledge base hierarchy.
 */

import { Suspense, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { useTheme } from 'next-themes'
import QuarryPageLayout from '@/components/quarry/QuarryPageLayout'
import AmbienceRightSidebar from '@/components/quarry/ui/sidebar/AmbienceRightSidebar'
import GraphLeftSidebar from '@/components/quarry/ui/sidebar/GraphLeftSidebar'

// Dynamic import to avoid SSR issues with D3
const FullFabricGraph = dynamic(
  () => import('@/components/quarry/ui/graphs/FullFabricGraph'),
  { ssr: false }
)

// Metadata moved to layout.tsx for client component compatibility

function GraphPageContent() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isDark = mounted ? resolvedTheme === 'dark' : false

  return (
    <QuarryPageLayout
      title="Knowledge Graph"
      description="Interactive visualization of the knowledge base"
      forceSidebarSmall={true}
      showRightPanel={true}
      rightPanelContent={<AmbienceRightSidebar />}
      rightPanelWidth={260}
      leftPanelContent={
        <GraphLeftSidebar
          isDark={isDark}
          nodeCount={0}
          edgeCount={0}
        />
      }
    >
      <div className="h-[calc(100vh-120px)]">
        <FullFabricGraph />
      </div>
    </QuarryPageLayout>
  )
}

export default function CodexGraphPage() {
  return (
    <Suspense fallback={
      <QuarryPageLayout title="Knowledge Graph">
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      </QuarryPageLayout>
    }>
      <GraphPageContent />
    </Suspense>
  )
}











