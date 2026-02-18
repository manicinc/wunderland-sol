/**
 * Dynamic browse page for tags, subjects, and topics
 * Renders strands filtered by tag/category from URL params
 * Uses QuarryPageLayout for consistent navigation with sidebar
 * @module codex/browse
 */

'use client'

import React, { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Tag,
  Hash,
  Folder,
  FileText,
  ChevronLeft,
  ArrowRight,
  Loader2,
  Search,
  X,
  Filter,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import QuarryPageLayout from '@/components/quarry/QuarryPageLayout'
import { AmbienceSection } from '@/components/quarry/ui/sidebar/AmbienceRightSidebar'
import { TreeBucketPanel } from '@/components/quarry/ui/browse'
import { useGithubTree } from '@/components/quarry/hooks/useGithubTree'
import { API_ENDPOINTS, REPO_CONFIG } from '@/components/quarry/constants'
import { useTheme } from 'next-themes'
import { BrowseViewToggle, BrowseViewMode } from '@/components/quarry/ui/browse/BrowseViewToggle'
import { useCanvasDragSource, CANVAS_DROP_MIME, encodeStrandDragData, StrandDropData } from '@/components/quarry/ui/canvas/useCanvasDrop'
import type { LayoutPreset } from '@/components/quarry/ui/misc/KnowledgeCanvas'
import { parseTags as parseTagsUtil } from '@/lib/utils'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'

// Lazy load KnowledgeCanvas (~500KB tldraw library) - only loaded when canvas view is active
const KnowledgeCanvas = dynamic(
  () => import('@/components/quarry/ui/misc/KnowledgeCanvas').then(mod => ({ default: mod.KnowledgeCanvas })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-zinc-900/50 rounded-lg">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <span className="text-sm text-zinc-400">Loading canvas...</span>
        </div>
      </div>
    ),
  }
)

interface StrandEntry {
  path: string
  title?: string
  summary?: string
  tags?: string | string[]
  taxonomy?: {
    subject?: string[]
    subjects?: string[]
    topic?: string[]
    topics?: string[]
    subtopic?: string[]
  }
}

/**
 * Parse tags from various formats (uses centralized utility with min length filter)
 */
function parseTagsFromEntry(tags: string | string[] | undefined): string[] {
  return parseTagsUtil(tags)
}

/**
 * Transform StrandEntry to canvas-compatible format
 */
function toCanvasStrand(strand: StrandEntry, index: number) {
  const tags = parseTagsFromEntry(strand.tags)
  const subjects = strand.taxonomy?.subjects || strand.taxonomy?.subject || []
  const topics = strand.taxonomy?.topics || strand.taxonomy?.topic || []

  return {
    id: `strand-${index}`,
    path: strand.path,
    title: strand.title || strand.path.split('/').pop()?.replace('.md', '') || 'Untitled',
    summary: strand.summary,
    tags: [...tags, ...subjects.map(s => s.toLowerCase()), ...topics.map(t => t.toLowerCase())],
    weaveSlug: subjects[0]?.toLowerCase(),
    loomSlug: topics[0]?.toLowerCase(),
    createdAt: new Date().toISOString(),
  }
}

/**
 * DraggableStrandCard - Strand card that can be dragged to canvas
 */
function DraggableStrandCard({
  strand,
  isDark,
  showDragHint = false,
}: {
  strand: StrandEntry
  isDark?: boolean
  showDragHint?: boolean
}) {
  const tags = parseTagsFromEntry(strand.tags)
  const subjects = strand.taxonomy?.subjects || strand.taxonomy?.subject || []
  const topics = strand.taxonomy?.topics || strand.taxonomy?.topic || []

  // Prepare drag data
  const dragData: StrandDropData = {
    type: 'strand',
    id: strand.path,
    path: strand.path,
    title: strand.title || strand.path.split('/').pop()?.replace('.md', '') || 'Untitled',
    summary: strand.summary,
    tags: [...tags, ...subjects.map(s => s.toLowerCase()), ...topics.map(t => t.toLowerCase())],
    weaveSlug: subjects[0]?.toLowerCase(),
    loomSlug: topics[0]?.toLowerCase(),
    level: 'strand',
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(CANVAS_DROP_MIME, encodeStrandDragData(dragData))
    e.dataTransfer.effectAllowed = 'copy'

    // Create a nice drag preview
    const preview = document.createElement('div')
    preview.className = 'px-3 py-2 bg-emerald-500 text-white rounded-lg shadow-lg text-sm font-medium max-w-[200px] truncate'
    preview.textContent = dragData.title
    preview.style.position = 'absolute'
    preview.style.top = '-1000px'
    document.body.appendChild(preview)
    e.dataTransfer.setDragImage(preview, 0, 0)
    setTimeout(() => document.body.removeChild(preview), 0)
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart as any}
    >
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="group"
      >
      <Link
        href={`/quarry/${strand.path.replace(/\.md$/, '')}`}
        className={`
          block p-4 rounded-xl border transition-all cursor-grab active:cursor-grabbing
          ${isDark
            ? 'border-zinc-800 bg-zinc-900/50 hover:border-cyan-600 hover:bg-zinc-800/50'
            : 'border-zinc-200 bg-white hover:border-cyan-400 hover:shadow-lg'
          }
        `}
        onClick={(e) => {
          // Don't navigate if we're dragging
          if ((e.target as HTMLElement).closest('[draggable="true"]')?.classList.contains('dragging')) {
            e.preventDefault()
          }
        }}
      >
        <div className="flex items-start gap-3">
          <div className={`
            p-2 rounded-lg transition-colors
            ${isDark
              ? 'bg-zinc-800 text-zinc-400 group-hover:bg-cyan-900/30 group-hover:text-cyan-400'
              : 'bg-zinc-100 text-zinc-600 group-hover:bg-cyan-100 group-hover:text-cyan-600'
            }
          `}>
            <FileText className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`
              font-semibold truncate transition-colors
              ${isDark
                ? 'text-white group-hover:text-cyan-400'
                : 'text-zinc-900 group-hover:text-cyan-600'
              }
            `}>
              {strand.title}
            </h3>
            <p className={`text-xs truncate mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {strand.path}
            </p>
            {strand.summary && (
              <p className={`text-sm mt-2 line-clamp-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {strand.summary}
              </p>
            )}
            {/* Drag hint */}
            {showDragHint && (
              <p className={`text-xs mt-2 italic ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                Drag to canvas to visualize
              </p>
            )}
          </div>
          <ArrowRight className={`
            w-4 h-4 flex-shrink-0 mt-1 transition-all
            ${isDark ? 'text-zinc-600 group-hover:text-cyan-400' : 'text-zinc-400 group-hover:text-cyan-500'}
            group-hover:translate-x-1
          `} />
        </div>
      </Link>
    </motion.div>
    </div>
  )
}

function BrowseContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const resolvePath = useQuarryPath()
  const { theme: systemTheme } = useTheme()
  const isDark = systemTheme?.includes('dark')

  const tag = searchParams.get('tag')
  const subject = searchParams.get('subject')
  const topic = searchParams.get('topic')

  // Knowledge Tree for Sidebar
  const { tree, loading: treeLoading } = useGithubTree()

  const [strands, setStrands] = useState<StrandEntry[]>([])
  const [allStrands, setAllStrands] = useState<StrandEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // View mode state (list, canvas, or split)
  const [viewMode, setViewMode] = useState<BrowseViewMode>('list')
  const [canvasLayout, setCanvasLayout] = useState<LayoutPreset>('grid')

  // Sidebar expansion state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['subjects', 'topics', 'tags']))

  // Determine filter type and value
  const filterType = tag ? 'tag' : subject ? 'subject' : topic ? 'topic' : null
  const filterValue = tag || subject || topic || ''

  // Fetch index and filter strands
  useEffect(() => {
    const fetchIndex = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(API_ENDPOINTS.raw('codex-index.json', REPO_CONFIG.BRANCH))
        if (!response.ok) {
          throw new Error('Failed to load codex index')
        }

        const data = await response.json()
        if (!Array.isArray(data)) {
          throw new Error('Invalid index format')
        }

        const entries: StrandEntry[] = data.map((item: any) => ({
          path: item.path,
          title: item.metadata?.title || item.path.split('/').pop()?.replace('.md', ''),
          summary: item.metadata?.summary || item.metadata?.autoGenerated?.summary,
          tags: item.metadata?.tags || item.metadata?.taxonomy?.subtopic,
          taxonomy: item.metadata?.taxonomy,
        }))

        setAllStrands(entries)

        // Filter based on URL params
        if (filterType && filterValue) {
          const normalizedValue = filterValue.toLowerCase()
          const filtered = entries.filter((strand) => {
            if (filterType === 'tag') {
              const tags = parseTagsFromEntry(strand.tags)
              const subtopics = strand.taxonomy?.subtopic?.map(s => s.toLowerCase()) || []
              return tags.some((t) => t === normalizedValue) || subtopics.includes(normalizedValue)
            }
            if (filterType === 'subject') {
              const subjects = strand.taxonomy?.subjects || strand.taxonomy?.subject || []
              return subjects.some((s) => s.toLowerCase() === normalizedValue)
            }
            if (filterType === 'topic') {
              const topics = strand.taxonomy?.topics || strand.taxonomy?.topic || []
              return topics.some((t) => t.toLowerCase() === normalizedValue)
            }
            return false
          })
          setStrands(filtered)
        } else {
          setStrands(entries)
        }
      } catch (err) {
        console.error('Failed to fetch index:', err)
        setError(err instanceof Error ? err.message : 'Failed to load strands')
      } finally {
        setLoading(false)
      }
    }

    fetchIndex()
  }, [filterType, filterValue])

  // Filter by search query
  const displayedStrands = useMemo(() => {
    if (!searchQuery.trim()) return strands
    const q = searchQuery.toLowerCase()
    return strands.filter(
      (s) =>
        s.title?.toLowerCase().includes(q) ||
        s.summary?.toLowerCase().includes(q) ||
        s.path.toLowerCase().includes(q)
    )
  }, [strands, searchQuery])

  // Transform strands for canvas display
  const canvasStrands = useMemo(() => {
    return displayedStrands.map((strand, i) => toCanvasStrand(strand, i))
  }, [displayedStrands])

  // Get all unique tags/subjects/topics for sidebar navigation
  const allTags = useMemo(() => {
    const tagMap = new Map<string, number>()
    allStrands.forEach((s) => {
      parseTagsFromEntry(s.tags).forEach((t) => {
        tagMap.set(t, (tagMap.get(t) || 0) + 1)
      })
      // Also include subtopics as tags
      s.taxonomy?.subtopic?.forEach(st => {
        const normalized = st.toLowerCase()
        tagMap.set(normalized, (tagMap.get(normalized) || 0) + 1)
      })
    })
    return Array.from(tagMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [allStrands])

  const allSubjects = useMemo(() => {
    const map = new Map<string, number>()
    allStrands.forEach((s) => {
      const subjects = s.taxonomy?.subjects || s.taxonomy?.subject || []
      subjects.forEach((sub) => {
        const normalized = sub.toLowerCase()
        map.set(normalized, (map.get(normalized) || 0) + 1)
      })
    })
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [allStrands])

  const allTopics = useMemo(() => {
    const map = new Map<string, number>()
    allStrands.forEach((s) => {
      const topics = s.taxonomy?.topics || s.taxonomy?.topic || []
      topics.forEach((t) => {
        const normalized = t.toLowerCase()
        map.set(normalized, (map.get(normalized) || 0) + 1)
      })
    })
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [allStrands])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const getFilterIcon = () => {
    if (filterType === 'tag') return <Tag className="w-5 h-5" />
    if (filterType === 'subject') return <Folder className="w-5 h-5" />
    if (filterType === 'topic') return <Hash className="w-5 h-5" />
    return <Filter className="w-5 h-5" />
  }

  // Right Sidebar: Filter Controls
  const sidebarContent = (
    <div className={`h-full overflow-y-auto p-3 space-y-4 ${isDark ? 'bg-zinc-900/50' : 'bg-zinc-50/50'}`}>
      {/* Ambience */}
      <AmbienceSection />

      {/* Current Filter */}
      {filterValue && (
        <div className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Active Filter
            </span>
            <button
              onClick={() => router.push(resolvePath('/quarry/browse'))}
              className={`text-xs ${isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              Clear
            </button>
          </div>
          <div className={`
            inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
            ${filterType === 'tag' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : ''}
            ${filterType === 'subject' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' : ''}
            ${filterType === 'topic' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : ''}
          `}>
            {getFilterIcon()}
            <span className="capitalize">{filterValue}</span>
          </div>
        </div>
      )}

      {/* Subjects Section */}
      {allSubjects.length > 0 && (
        <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <button
            onClick={() => toggleSection('subjects')}
            className={`
              w-full flex items-center justify-between px-3 py-2.5
              ${isDark ? 'bg-zinc-800/50 hover:bg-zinc-800' : 'bg-zinc-100/50 hover:bg-zinc-100'}
            `}
          >
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-amber-500" />
              <span className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                Subjects
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-500'}`}>
                {allSubjects.length}
              </span>
            </div>
            {expandedSections.has('subjects') ? (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            )}
          </button>
          <AnimatePresence>
            {expandedSections.has('subjects') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className={`p-2 space-y-1 ${isDark ? 'bg-zinc-900/30' : 'bg-white'}`}>
                  {allSubjects.map(({ name, count }) => (
                    <button
                      key={name}
                      onClick={() => router.push(`/quarry/browse?subject=${encodeURIComponent(name)}`)}
                      className={`
                        w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm
                        transition-colors
                        ${subject === name
                          ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium'
                          : isDark
                            ? 'hover:bg-zinc-800 text-zinc-300'
                            : 'hover:bg-zinc-100 text-zinc-600'
                        }
                      `}
                    >
                      <span className="truncate capitalize">{name}</span>
                      <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{count}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Topics Section */}
      {allTopics.length > 0 && (
        <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <button
            onClick={() => toggleSection('topics')}
            className={`
              w-full flex items-center justify-between px-3 py-2.5
              ${isDark ? 'bg-zinc-800/50 hover:bg-zinc-800' : 'bg-zinc-100/50 hover:bg-zinc-100'}
            `}
          >
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-blue-500" />
              <span className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                Topics
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-500'}`}>
                {allTopics.length}
              </span>
            </div>
            {expandedSections.has('topics') ? (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            )}
          </button>
          <AnimatePresence>
            {expandedSections.has('topics') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className={`p-2 space-y-1 ${isDark ? 'bg-zinc-900/30' : 'bg-white'}`}>
                  {allTopics.map(({ name, count }) => (
                    <button
                      key={name}
                      onClick={() => router.push(`/quarry/browse?topic=${encodeURIComponent(name)}`)}
                      className={`
                        w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm
                        transition-colors
                        ${topic === name
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium'
                          : isDark
                            ? 'hover:bg-zinc-800 text-zinc-300'
                            : 'hover:bg-zinc-100 text-zinc-600'
                        }
                      `}
                    >
                      <span className="truncate capitalize">{name}</span>
                      <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{count}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Tags Section */}
      {allTags.length > 0 && (
        <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <button
            onClick={() => toggleSection('tags')}
            className={`
              w-full flex items-center justify-between px-3 py-2.5
              ${isDark ? 'bg-zinc-800/50 hover:bg-zinc-800' : 'bg-zinc-100/50 hover:bg-zinc-100'}
            `}
          >
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-500" />
              <span className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                Tags
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-500'}`}>
                {allTags.length}
              </span>
            </div>
            {expandedSections.has('tags') ? (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            )}
          </button>
          <AnimatePresence>
            {expandedSections.has('tags') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className={`p-2 ${isDark ? 'bg-zinc-900/30' : 'bg-white'}`}>
                  <div className="flex flex-wrap gap-1.5">
                    {allTags.slice(0, 30).map(({ name, count }) => (
                      <button
                        key={name}
                        onClick={() => router.push(`/quarry/browse?tag=${encodeURIComponent(name)}`)}
                        className={`
                          inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                          transition-colors
                          ${tag === name
                            ? 'bg-emerald-500 text-white'
                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800/50'
                          }
                        `}
                        title={`${count} strands`}
                      >
                        {name}
                      </button>
                    ))}
                    {allTags.length > 30 && (
                      <span className={`text-xs py-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        +{allTags.length - 30} more
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )

  return (
    <QuarryPageLayout
      title={filterValue ? `${filterType}: ${filterValue}` : 'Browse'}
      description="Explore strands by subject, topic, or tag"
      showRightPanel={viewMode === 'list'}
      rightPanelContent={viewMode === 'list' ? sidebarContent : undefined}
      leftPanelContent={
        <TreeBucketPanel
          tree={tree}
          loading={treeLoading}
          onNavigate={(path) => router.push(`/quarry/${path.replace(/\.md$/, '')}`)}
          isDark={isDark}
          enableDragDrop={false}
        />
      }
    >
      <div className={`min-h-full ${isDark ? 'bg-zinc-950' : 'bg-zinc-50'}`}>
        <div className="p-4 md:p-6 max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Link
              href="/quarry"
              className={`inline-flex items-center gap-2 text-sm mb-4 ${
                isDark ? 'text-zinc-400 hover:text-cyan-400' : 'text-zinc-600 hover:text-cyan-600'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Codex
            </Link>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div
                className={`
                  p-3 rounded-xl
                  ${filterType === 'tag' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : ''}
                  ${filterType === 'subject' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : ''}
                  ${filterType === 'topic' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''}
                  ${!filterType ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400' : ''}
                `}
              >
                {getFilterIcon()}
              </div>
              <div>
                <h1 className={`text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {filterValue ? (
                    <>
                      <span className="capitalize">{filterType}</span>:{' '}
                      <span className={`
                        ${filterType === 'tag' ? 'text-emerald-600 dark:text-emerald-400' : ''}
                        ${filterType === 'subject' ? 'text-amber-600 dark:text-amber-400' : ''}
                        ${filterType === 'topic' ? 'text-blue-600 dark:text-blue-400' : ''}
                      `}>
                        {filterValue}
                      </span>
                    </>
                  ) : (
                    'Browse All Strands'
                  )}
                </h1>
                <p className={`mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {loading ? 'Loading...' : `${displayedStrands.length} strands found`}
                </p>
              </div>

              {/* View mode toggle */}
              <div className="sm:ml-auto mt-2 sm:mt-0">
                <BrowseViewToggle
                  value={viewMode}
                  onChange={setViewMode}
                  isDark={isDark}
                />
              </div>
            </div>
          </div>

          {/* Search - only show in list mode */}
          {viewMode === 'list' && (
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search strands..."
                className={`
                  w-full pl-10 pr-10 py-3 rounded-xl border
                  ${isDark
                    ? 'border-zinc-700 bg-zinc-800 text-white placeholder-zinc-500 focus:border-cyan-500'
                    : 'border-zinc-200 bg-white text-zinc-900 placeholder-zinc-400 focus:border-cyan-500'
                  }
                  focus:outline-none focus:ring-2 focus:ring-cyan-500/20
                `}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                    isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-400 hover:text-zinc-600'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          )}

          {/* Content - Canvas or List */}
          {viewMode === 'canvas' ? (
            <div className="h-[calc(100vh-200px)] min-h-[500px] rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
              <KnowledgeCanvas
                strands={canvasStrands}
                onStrandClick={(path) => router.push(`/quarry/${path.replace(/\.md$/, '')}`)}
                layout={canvasLayout}
                onLayoutChange={setCanvasLayout}
                isDark={isDark}
                canvasId={`browse-canvas-${filterValue || 'all'}`}
              />
            </div>
          ) : viewMode === 'split' ? (
            <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[500px]">
              {/* List panel in split view - draggable cards */}
              <div className="w-1/3 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-2">
                {displayedStrands.map((strand) => (
                  <DraggableStrandCard
                    key={strand.path}
                    strand={strand}
                    isDark={isDark}
                    showDragHint={true}
                  />
                ))}
              </div>
              {/* Canvas panel in split view */}
              <div className="flex-1 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                <KnowledgeCanvas
                  strands={[]} // Start empty - user drags strands
                  onStrandClick={(path) => router.push(`/quarry/${path.replace(/\.md$/, '')}`)}
                  layout={canvasLayout}
                  onLayoutChange={setCanvasLayout}
                  isDark={isDark}
                  canvasId={`browse-canvas-split-${filterValue || 'all'}`}
                />
              </div>
            </div>
          ) : (
            /* List view */
            loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500"
              >
                Retry
              </button>
            </div>
          ) : displayedStrands.length === 0 ? (
            <div className="text-center py-20">
              <FileText className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
              <p className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>No strands found</p>
              {filterValue && (
                <button
                  onClick={() => router.push(resolvePath('/quarry/browse'))}
                  className="mt-4 text-cyan-600 hover:underline"
                >
                  Clear filter
                </button>
              )}
            </div>
          ) : (
            <motion.div
              className="grid gap-4 sm:grid-cols-2"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.05 } },
              }}
            >
              <AnimatePresence mode="popLayout">
                {displayedStrands.map((strand) => (
                  <DraggableStrandCard
                    key={strand.path}
                    strand={strand}
                    isDark={isDark}
                    showDragHint={false}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )
          )}
        </div>
      </div>
    </QuarryPageLayout>
  )
}

export default function BrowsePage() {
  return (
    <Suspense
      fallback={
        <QuarryPageLayout title="Browse">
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
          </div>
        </QuarryPageLayout>
      }
    >
      <BrowseContent />
    </Suspense>
  )
}
