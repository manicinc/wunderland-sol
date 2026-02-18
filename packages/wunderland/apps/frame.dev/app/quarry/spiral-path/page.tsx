/**
 * Spiral Path - Learning Pathway Visualization
 * @module codex/spiral-path
 *
 * @description
 * Interactive learning path visualization with prerequisite chains,
 * skill level inputs, and multiple view modes (tree/graph).
 *
 * Based on Jerome Bruner's Spiral Curriculum principle:
 * "Any subject can be taught effectively in some intellectually honest form
 * to any child at any stage of development."
 *
 * @features
 * - Tree View: Hierarchical outline of learning paths
 * - Graph View: Force-directed visualization of prerequisites
 * - Skill Input: User's current knowledge for personalized paths
 * - Path Planner: Shortest path between any two strands
 * - Filters: By weave, tags, difficulty level
 * - Interactive: Hover legends, click navigation, zoom/pan
 *
 * @see https://openstrand.ai/architecture
 */

import { Metadata } from 'next'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import QuarryPageLayout from '@/components/quarry/QuarryPageLayout'
import SpiralPathClient from './SpiralPathClient'

export const metadata: Metadata = {
  title: 'Spiral Path – Learning Pathway Visualization | Quarry',
  description: 'Visualize learning paths with prerequisite chains. Enter your skills, select a goal, and discover the optimal learning journey through the knowledge graph.',
  openGraph: {
    title: 'Spiral Path – Learning Pathway Visualization',
    description: 'Discover optimal learning paths through the Quarry Codex knowledge graph.',
    images: ['/og/spiral-path.png'],
  },
}

export default function SpiralPathPage() {
  return (
    <Suspense fallback={
      <QuarryPageLayout title="Spiral Path">
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      </QuarryPageLayout>
    }>
      <QuarryPageLayout
        title="Spiral Path"
        description="Learning pathway visualization with prerequisite chains"
        forceSidebarSmall={true}
      >
        <div className="h-[calc(100vh-120px)]">
          <SpiralPathClient />
        </div>
      </QuarryPageLayout>
    </Suspense>
  )
}







