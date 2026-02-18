/**
 * Canvas Showcase Page
 * @module quarry/canvas-showcase
 *
 * Demonstrates the infinite canvas capabilities with pre-populated demo content.
 * Features sticky notes, frames, link previews, strands, and collections.
 */

import type { Metadata } from 'next'
import dynamic from 'next/dynamic'

export const metadata: Metadata = {
  title: 'Canvas Showcase | Quarry Codex',
  description:
    'Interactive demonstration of infinite canvas features with sticky notes, frames, link previews, and knowledge strands.',
}

// Dynamic import with SSR disabled (tldraw requires client-side rendering)
const CanvasShowcaseClient = dynamic(
  () => import('./CanvasShowcaseClient').then((mod) => mod.CanvasShowcaseClient),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading canvas...</p>
        </div>
      </div>
    ),
  }
)

export default function CanvasShowcasePage() {
  return (
    <main className="min-h-screen">
      <CanvasShowcaseClient />
    </main>
  )
}

