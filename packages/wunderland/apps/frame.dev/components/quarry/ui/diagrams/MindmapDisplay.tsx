/**
 * Mindmap Display Component
 * @module components/quarry/ui/MindmapDisplay
 *
 * Conditional rendering of mindmap viewers based on type
 * Handles loading, error, and empty states
 */

'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { AlertCircle, GitBranch, Network as NetworkIcon, Brain, Loader2 } from 'lucide-react'

import { useResponsive } from '../../hooks/useMediaQuery'
import type {
  MindmapType,
  HierarchyData,
  GraphData,
  ConceptData,
} from '@/hooks/useMindmapGeneration'

// Lazy load heavy visualization components to reduce initial bundle size
const MarkmapViewer = dynamic(() => import('./MarkmapViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
    </div>
  ),
})

const GraphViewer = dynamic(() => import('../graphs/GraphViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
    </div>
  ),
})

const ConceptMapViewer = dynamic(() => import('./ConceptMapViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
    </div>
  ),
})

/* ═══════════════════════════════════════════════════════════════════════════
   TYPE DEFINITIONS
═══════════════════════════════════════════════════════════════════════════ */

export interface MindmapDisplayProps {
  mindmapType: MindmapType
  hierarchyData: HierarchyData | null
  graphData: GraphData | null
  conceptData: ConceptData | null
  loading: boolean
  progress: number
  error: string | null
  isDark?: boolean
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOADING STATE
═══════════════════════════════════════════════════════════════════════════ */

function LoadingState({
  mindmapType,
  progress,
  isDark,
}: {
  mindmapType: MindmapType
  progress: number
  isDark: boolean
}) {
  const icon = useMemo(() => {
    switch (mindmapType) {
      case 'hierarchy':
        return GitBranch
      case 'graph':
        return NetworkIcon
      case 'concept':
        return Brain
    }
  }, [mindmapType])

  const Icon = icon

  const label = useMemo(() => {
    switch (mindmapType) {
      case 'hierarchy':
        return 'Generating Hierarchy Mindmap'
      case 'graph':
        return 'Building Knowledge Graph'
      case 'concept':
        return 'Extracting Concepts'
    }
  }, [mindmapType])

  return (
    <div
      className={`flex flex-col items-center justify-center p-12 rounded-xl ${
        isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'
      }`}
      style={{ minHeight: '400px' }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      >
        <Icon
          className={`w-12 h-12 mb-4 ${
            isDark ? 'text-cyan-400' : 'text-cyan-600'
          }`}
        />
      </motion.div>

      <p
        className={`text-sm font-medium mb-2 ${
          isDark ? 'text-zinc-200' : 'text-zinc-700'
        }`}
      >
        {label}
      </p>

      <div className="w-64 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-cyan-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <p
        className={`text-xs mt-2 ${
          isDark ? 'text-zinc-400' : 'text-zinc-500'
        }`}
      >
        {progress}%
      </p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   ERROR STATE
═══════════════════════════════════════════════════════════════════════════ */

function ErrorState({
  error,
  isDark,
}: {
  error: string
  isDark: boolean
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 rounded-xl ${
        isDark ? 'bg-red-900/10 border border-red-800/30' : 'bg-red-50 border border-red-200'
      }`}
      style={{ minHeight: '400px' }}
    >
      <AlertCircle
        className={`w-12 h-12 mb-4 ${
          isDark ? 'text-red-400' : 'text-red-600'
        }`}
      />

      <p
        className={`text-sm font-medium mb-2 ${
          isDark ? 'text-red-200' : 'text-red-700'
        }`}
      >
        Generation Failed
      </p>

      <p
        className={`text-xs max-w-md text-center ${
          isDark ? 'text-red-300' : 'text-red-600'
        }`}
      >
        {error}
      </p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   EMPTY STATE
═══════════════════════════════════════════════════════════════════════════ */

function EmptyState({
  mindmapType,
  isDark,
}: {
  mindmapType: MindmapType
  isDark: boolean
}) {
  const message = useMemo(() => {
    switch (mindmapType) {
      case 'hierarchy':
        return {
          title: 'No Headings Found',
          description: 'Add H1-H6 headings to generate a hierarchy mindmap.',
          tips: [
            'Use # for H1, ## for H2, etc.',
            'Structure your content with clear sections',
            'Example: # Main Topic → ## Section → ### Details'
          ]
        }
      case 'graph':
        return {
          title: 'No Relationships Found',
          description: 'Add links or metadata to generate a knowledge graph.',
          tips: [
            'Add [[wiki-style]] links to related strands',
            'Include prerequisites in frontmatter',
            'Reference other documents with [text](path)'
          ]
        }
      case 'concept':
        return {
          title: 'No Concepts Extracted',
          description: 'The content may be too short or lack identifiable concepts.',
          tips: [
            'Add more detailed explanations',
            'Include definitions and key terms',
            'Use technical vocabulary and domain terms'
          ]
        }
    }
  }, [mindmapType])

  const icon = useMemo(() => {
    switch (mindmapType) {
      case 'hierarchy':
        return GitBranch
      case 'graph':
        return NetworkIcon
      case 'concept':
        return Brain
    }
  }, [mindmapType])

  const Icon = icon

  return (
    <div
      className={`flex flex-col items-center justify-center p-12 rounded-xl ${
        isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'
      }`}
      style={{ minHeight: '400px' }}
    >
      <Icon
        className={`w-12 h-12 mb-4 ${
          isDark ? 'text-zinc-600' : 'text-zinc-400'
        }`}
      />

      <p
        className={`text-base font-medium mb-2 ${
          isDark ? 'text-zinc-300' : 'text-zinc-600'
        }`}
      >
        {message.title}
      </p>

      <p
        className={`text-sm mb-4 max-w-md text-center ${
          isDark ? 'text-zinc-400' : 'text-zinc-500'
        }`}
      >
        {message.description}
      </p>

      {/* Tips section */}
      <div className={`mt-4 p-4 rounded-lg max-w-md ${isDark ? 'bg-zinc-900/50' : 'bg-white border border-zinc-200'}`}>
        <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          How to fix this
        </p>
        <ul className="space-y-2">
          {message.tips.map((tip, i) => (
            <li key={i} className={`text-sm flex items-start gap-2 ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
              <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
                {i + 1}
              </span>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function MindmapDisplay({
  mindmapType,
  hierarchyData,
  graphData,
  conceptData,
  loading,
  progress,
  error,
  isDark = false,
  className = '',
}: MindmapDisplayProps) {
  // Responsive height based on device
  const { isMobile, isTablet } = useResponsive()
  const responsiveHeight = isMobile ? 350 : isTablet ? 450 : 600

  // Show loading state
  if (loading) {
    return <LoadingState mindmapType={mindmapType} progress={progress} isDark={isDark} />
  }

  // Show error state
  if (error) {
    return <ErrorState error={error} isDark={isDark} />
  }

  // Render based on mindmap type
  switch (mindmapType) {
    case 'hierarchy': {
      if (!hierarchyData || hierarchyData.headingCount === 0) {
        return <EmptyState mindmapType="hierarchy" isDark={isDark} />
      }

      return (
        <div className={`w-full ${className}`}>
          <MarkmapViewer
            markdown={hierarchyData.markdown}
            theme={isDark ? 'dark' : 'light'}
            height={responsiveHeight}
          />
        </div>
      )
    }

    case 'graph': {
      if (!graphData || graphData.nodes.length === 0) {
        return <EmptyState mindmapType="graph" isDark={isDark} />
      }

      return (
        <div className={`w-full ${className}`}>
          <GraphViewer
            graphData={graphData}
            isDark={isDark}
            height={responsiveHeight}
          />
        </div>
      )
    }

    case 'concept': {
      if (!conceptData || conceptData.nodes.length === 0) {
        return <EmptyState mindmapType="concept" isDark={isDark} />
      }

      return (
        <div className={`w-full ${className}`}>
          <ConceptMapViewer
            conceptData={conceptData}
            isDark={isDark}
            height={responsiveHeight}
          />
        </div>
      )
    }
  }
}
