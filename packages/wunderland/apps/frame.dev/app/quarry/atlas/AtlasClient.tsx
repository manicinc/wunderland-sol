/**
 * Atlas Client Component
 *
 * Client-side wrapper for the Atlas infinite canvas.
 * Handles data loading and navigation.
 *
 * @module quarry/atlas/AtlasClient
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import dynamic from 'next/dynamic'
import { Loader2, Map, RefreshCw, AlertCircle } from 'lucide-react'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'
import type { KnowledgeTreeNode } from '@/components/quarry/types'

// Dynamically import AtlasCanvas to avoid SSR issues with React Flow
const AtlasCanvas = dynamic(
  () => import('@/components/quarry/atlas/AtlasCanvas'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[70vh] flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 rounded-xl">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    ),
  }
)

interface AtlasClientProps {
  /** Initial tree data from server (optional) */
  initialTree?: KnowledgeTreeNode[]
}

export default function AtlasClient({ initialTree }: AtlasClientProps) {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const resolvePath = useQuarryPath()
  const [tree, setTree] = useState<KnowledgeTreeNode[]>(initialTree || [])
  const [loading, setLoading] = useState(!initialTree)
  const [error, setError] = useState<string | null>(null)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)

  // Fetch tree data if not provided
  useEffect(() => {
    if (initialTree) return

    async function fetchTree() {
      setLoading(true)
      setError(null)

      try {
        // Try to fetch from the API or use cached data
        const response = await fetch('/api/knowledge-tree')
        if (response.ok) {
          const data = await response.json()
          setTree(data.tree || [])
        } else {
          // Fallback to mock data for demo
          setTree(generateMockTree())
        }
      } catch (err) {
        console.error('[AtlasClient] Failed to fetch tree:', err)
        // Use mock data as fallback
        setTree(generateMockTree())
      } finally {
        setLoading(false)
      }
    }

    fetchTree()
  }, [initialTree])

  // Navigate to a strand
  const handleNavigate = useCallback((path: string) => {
    setSelectedPath(path)
    // Navigate to the strand viewer
    const resolvedPath = resolvePath(`/quarry/${path}`)
    router.push(resolvedPath)
  }, [router, resolvePath])

  // Refresh tree data
  const handleRefresh = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/knowledge-tree?refresh=true')
      if (response.ok) {
        const data = await response.json()
        setTree(data.tree || [])
      }
    } catch (err) {
      console.error('[AtlasClient] Failed to refresh tree:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  if (error) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900 rounded-xl p-6">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">
          Failed to load Atlas
        </h3>
        <p className="text-zinc-600 dark:text-zinc-400 text-center mb-4">
          {error}
        </p>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 text-white font-medium text-sm hover:bg-cyan-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    )
  }

  if (tree.length === 0 && !loading) {
    return (
      <div className="w-full h-[70vh] flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900 rounded-xl p-6">
        <Map className="w-12 h-12 text-zinc-400 mb-4" />
        <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">
          No Strands Found
        </h3>
        <p className="text-zinc-600 dark:text-zinc-400 text-center">
          Create some strands to see them visualized in the Atlas.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Canvas Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 via-amber-500/20 to-yellow-500/20 flex items-center justify-center border border-orange-500/30">
            <Map className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Knowledge Atlas
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {tree.length} top-level nodes • Pan, zoom, and explore
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className={`
            p-2 rounded-lg transition-colors
            ${loading
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }
            text-zinc-500 dark:text-zinc-400
          `}
          title="Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Canvas */}
      <div className="w-full h-[70vh] rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
        <AtlasCanvas
          tree={tree}
          selectedPath={selectedPath}
          onNavigate={handleNavigate}
          theme={resolvedTheme}
          loading={loading}
        />
      </div>

      {/* Instructions */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">Scroll</kbd>
          Zoom
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">Drag</kbd>
          Pan
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">Click</kbd>
          Open strand
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">Pinch</kbd>
          Zoom (touch)
        </span>
      </div>
    </div>
  )
}

// ============================================================================
// MOCK DATA GENERATOR
// ============================================================================

function generateMockTree(): KnowledgeTreeNode[] {
  // Generate some mock data for demonstration
  const weaves = [
    {
      name: 'Technology',
      description: 'Technical knowledge and programming',
      emoji: '💻',
      topics: ['programming', 'software', 'web'],
    },
    {
      name: 'Science',
      description: 'Scientific discoveries and research',
      emoji: '🔬',
      topics: ['physics', 'biology', 'chemistry'],
    },
    {
      name: 'Philosophy',
      description: 'Ideas and philosophical concepts',
      emoji: '🤔',
      topics: ['ethics', 'logic', 'metaphysics'],
    },
    {
      name: 'Projects',
      description: 'Active projects and work',
      emoji: '🚀',
      topics: ['startup', 'research', 'development'],
    },
  ]

  return weaves.map((weave, wi) => ({
    name: weave.name,
    path: weave.name.toLowerCase(),
    type: 'directory' as const,
    description: weave.description,
    topics: weave.topics,
    style: { emoji: weave.emoji },
    children: Array.from({ length: 3 + Math.floor(Math.random() * 4) }, (_, li) => ({
      name: `${weave.name} Loom ${li + 1}`,
      path: `${weave.name.toLowerCase()}/loom-${li + 1}`,
      type: 'directory' as const,
      description: `A collection of ${weave.name.toLowerCase()} strands`,
      tags: weave.topics.slice(0, 2),
      children: Array.from({ length: 2 + Math.floor(Math.random() * 5) }, (_, si) => ({
        name: `Strand ${si + 1}`,
        path: `${weave.name.toLowerCase()}/loom-${li + 1}/strand-${si + 1}.md`,
        type: 'file' as const,
        description: `A strand about ${weave.topics[si % weave.topics.length]}`,
        tags: [weave.topics[si % weave.topics.length]],
      })),
    })),
  }))
}
