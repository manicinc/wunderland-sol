'use client'

/**
 * TagsFullView - Full-page Tags Browser with Analysis
 * @module codex/ui/TagsFullView
 *
 * @description
 * Comprehensive tag browser rendered within Quarry's layout.
 * Features:
 * - Grid view of all tags with usage stats
 * - Filter by category, usage level, or search
 * - Tag relationships / connections
 * - Schema management
 * - Analytics and insights
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Tag,
  Hash,
  Search,
  Plus,
  Settings,
  Sparkles,
  X,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  BookOpen,
  GraduationCap,
  FileText,
  Layers,
} from 'lucide-react'
import * as Icons from 'lucide-react'
import { cn } from '@/lib/utils'
import { SupertagSchemaModal } from '../supertags/SupertagSchemaModal'
import {
  getAllSchemas,
  deleteSchema,
  initializeSupertags,
  getBlocksWithSupertag,
  type SupertagSchema,
  BUILT_IN_SCHEMAS,
  type BuiltInSupertag,
} from '@/lib/supertags'
import { useStrandTagsWithSchemas, getTagsWithCounts, getTaxonomyFromDatabase, type TagWithSchema } from '@/lib/planner/useStrandTags'
import { getTagLevelStats, type TagLevelInfo } from '@/lib/blockDatabase'
import type { TagsIndex, TagIndexEntry } from '../../types'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface TagsFullViewProps {
  theme?: string
  tagsIndex?: TagsIndex
  onOpenPreferences?: () => void
  onNavigateToStrand?: (path: string) => void
}

type SectionId = 'supertags' | 'lightweight' | 'blocktags' | 'topics' | 'subjects'

/** Filter for tag level origin */
type TagLevelFilter = 'all' | 'doc' | 'block'

interface SectionState {
  expanded: boolean
  page: number
}

const PAGE_SIZE = 12

const DARK_THEMES = ['dark', 'sepia-dark', 'terminal-dark', 'oceanic-dark']

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

function getIconComponent(iconName?: string): React.ElementType {
  if (!iconName) return Tag
  const IconsRecord = Icons as unknown as Record<string, React.ElementType>
  const Icon = IconsRecord[iconName]
  return Icon || Tag
}

/* ═══════════════════════════════════════════════════════════════════════════
   COLLAPSIBLE TAG SECTION
═══════════════════════════════════════════════════════════════════════════ */

interface CollapsibleTagSectionProps {
  sectionKey: SectionId
  title: string
  subtitle?: string
  icon: React.ElementType
  iconColor: string
  items: Array<{
    name: string
    count: number
    icon?: string
    color?: string
    isSupertag?: boolean
    isBuiltIn?: boolean
    schema?: SupertagSchema
    level?: 'doc' | 'block' | 'both'
    docCount?: number
    blockCount?: number
  }>
  expanded: boolean
  page: number
  pageSize: number
  onToggle: () => void
  onLoadMore: () => void
  onItemClick?: (item: any) => void
  isDark: boolean
  searchQuery?: string
  showLevelBadge?: boolean
}

function CollapsibleTagSection({
  sectionKey,
  title,
  subtitle,
  icon: SectionIcon,
  iconColor,
  items,
  expanded,
  page,
  pageSize,
  onToggle,
  onLoadMore,
  onItemClick,
  isDark,
  searchQuery,
  showLevelBadge = false,
}: CollapsibleTagSectionProps) {
  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items
    const query = searchQuery.toLowerCase()
    return items.filter(item => item.name.toLowerCase().includes(query))
  }, [items, searchQuery])

  // Sort by count descending
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => b.count - a.count)
  }, [filteredItems])

  // Paginated items
  const visibleCount = page * pageSize
  const visibleItems = sortedItems.slice(0, visibleCount)
  const hasMore = sortedItems.length > visibleCount
  const remaining = sortedItems.length - visibleCount

  if (sortedItems.length === 0) return null

  // Use sectionKey for consistent IDs for deep linking
  const sectionId = `tags-section-${sectionKey}`

  return (
    <div
      id={sectionId}
      className={cn(
        'rounded-xl border overflow-hidden scroll-mt-4',
        isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'
      )}
      role="region"
      aria-labelledby={`${sectionId}-heading`}
    >
      {/* Section Header */}
      <button
        id={`${sectionId}-heading`}
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 transition-colors',
          isDark ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-50'
        )}
        aria-expanded={expanded}
        aria-controls={`${sectionId}-content`}
        title={subtitle || `${title} section - ${sortedItems.length} items`}
      >
        <SectionIcon className="w-5 h-5" style={{ color: iconColor }} aria-hidden="true" />
        <div className="flex-1 text-left">
          <span className={cn(
            'font-semibold block',
            isDark ? 'text-white' : 'text-zinc-900'
          )}>
            {title}
          </span>
          {subtitle && (
            <span className={cn(
              'text-xs block mt-0.5',
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            )}>
              {subtitle}
            </span>
          )}
        </div>
        <span
          className={cn(
            'text-sm px-2 py-0.5 rounded-full',
            isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
          )}
          aria-label={`${sortedItems.length} items`}
        >
          {sortedItems.length}
        </span>
        {expanded ? (
          <ChevronDown className="w-5 h-5 text-zinc-400" aria-hidden="true" />
        ) : (
          <ChevronRight className="w-5 h-5 text-zinc-400" aria-hidden="true" />
        )}
      </button>

      {/* Section Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            id={`${sectionId}-content`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="group"
            aria-label={`${title} tags`}
          >
            <div className={cn(
              'px-4 pb-4 pt-2',
              isDark ? 'border-t border-zinc-700' : 'border-t border-zinc-100'
            )}>
              {/* Tag Grid */}
              <div className="flex flex-wrap gap-2">
                {visibleItems.map((item) => {
                  const ItemIcon = getIconComponent(item.icon)
                  const itemColor = item.color || iconColor
                  return (
                    <motion.button
                      key={item.name}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all',
                        isDark
                          ? 'bg-zinc-700/50 border-zinc-600 hover:border-cyan-500/50 hover:bg-zinc-700'
                          : 'bg-zinc-50 border-zinc-200 hover:border-cyan-400 hover:bg-white'
                      )}
                      style={{ borderLeftColor: itemColor, borderLeftWidth: 3 }}
                      onClick={() => onItemClick?.(item)}
                    >
                      <ItemIcon className="w-3.5 h-3.5" style={{ color: itemColor }} />
                      <span className={cn(
                        'text-sm',
                        isDark ? 'text-white' : 'text-zinc-900'
                      )}>
                        #{item.name}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {item.count}
                      </span>
                      {item.isSupertag && (
                        <span className={cn(
                          'text-[9px] px-1 py-0.5 rounded',
                          item.isBuiltIn
                            ? 'bg-amber-500/20 text-amber-500'
                            : 'bg-purple-500/20 text-purple-500'
                        )}>
                          {item.isBuiltIn ? '◆' : '★'}
                        </span>
                      )}
                      {/* Level badge - shows doc/block origin */}
                      {showLevelBadge && item.level && (
                        <span className={cn(
                          'text-[9px] px-1 py-0.5 rounded flex items-center gap-0.5',
                          item.level === 'doc'
                            ? 'bg-blue-500/20 text-blue-500'
                            : item.level === 'block'
                              ? 'bg-teal-500/20 text-teal-500'
                              : 'bg-violet-500/20 text-violet-500'
                        )}
                          title={
                            item.level === 'both'
                              ? `${item.docCount || 0} docs, ${item.blockCount || 0} blocks`
                              : item.level === 'doc'
                                ? 'Document-level tag'
                                : 'Block-level tag'
                          }
                        >
                          {item.level === 'doc' && <FileText className="w-2.5 h-2.5" />}
                          {item.level === 'block' && <Layers className="w-2.5 h-2.5" />}
                          {item.level === 'both' && '⇌'}
                        </span>
                      )}
                    </motion.button>
                  )
                })}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <button
                  onClick={onLoadMore}
                  className={cn(
                    'mt-3 w-full py-2 text-sm rounded-lg transition-colors',
                    isDark
                      ? 'text-cyan-400 hover:bg-zinc-700'
                      : 'text-cyan-600 hover:bg-zinc-100'
                  )}
                >
                  Load more ({remaining} remaining)
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function TagsFullView({
  theme = 'light',
  tagsIndex,
  onOpenPreferences,
  onNavigateToStrand,
}: TagsFullViewProps) {
  const isDark = DARK_THEMES.includes(theme)

  // Data state
  const [schemas, setSchemas] = useState<SupertagSchema[]>([])
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [dbTaxonomy, setDbTaxonomy] = useState<{ topics: TagIndexEntry[]; subjects: TagIndexEntry[] }>({ topics: [], subjects: [] })
  const [tagLevelStats, setTagLevelStats] = useState<TagLevelInfo[]>([])
  const [levelFilter, setLevelFilter] = useState<TagLevelFilter>('all')

  // Section state for pagination
  const [sections, setSections] = useState<Record<SectionId, SectionState>>({
    supertags: { expanded: true, page: 1 },
    lightweight: { expanded: true, page: 1 },
    blocktags: { expanded: true, page: 1 },
    topics: { expanded: false, page: 1 },
    subjects: { expanded: false, page: 1 },
  })

  // UI state
  const [searchQuery, setSearchQuery] = useState('')

  // Modal state for schema editing
  const [showSchemaModal, setShowSchemaModal] = useState(false)
  const [editingSchema, setEditingSchema] = useState<SupertagSchema | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Handle URL hash for deep linking to sections
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleHashChange = () => {
      const hash = window.location.hash.slice(1).toLowerCase() // Remove # and lowercase
      if (hash && ['supertags', 'lightweight', 'blocktags', 'topics', 'subjects'].includes(hash)) {
        const sectionId = hash as SectionId
        setSections(prev => ({
          ...prev,
          [sectionId]: { ...prev[sectionId], expanded: true }
        }))
        // Scroll to section after a short delay for DOM to update
        setTimeout(() => {
          const element = document.getElementById(`tags-section-${sectionId}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 100)
      }
    }

    // Handle initial hash on mount
    handleHashChange()

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Section toggle handler
  const toggleSection = useCallback((sectionId: SectionId) => {
    setSections(prev => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], expanded: !prev[sectionId].expanded }
    }))
  }, [])

  // Load more handler
  const loadMore = useCallback((sectionId: SectionId) => {
    setSections(prev => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], page: prev[sectionId].page + 1 }
    }))
  }, [])

  // Get all tags with schema info
  const { tags: allTagsWithSchemas, isLoading: tagsLoading, refresh: refreshTags } = useStrandTagsWithSchemas()

  // Load schemas
  useEffect(() => {
    loadSchemas()
  }, [])

  // Load taxonomy from database as fallback
  useEffect(() => {
    getTaxonomyFromDatabase().then(setDbTaxonomy)
  }, [])

  // Load tag level stats (doc vs block differentiation)
  useEffect(() => {
    getTagLevelStats().then(setTagLevelStats)
  }, [])

  const loadSchemas = async () => {
    try {
      setLoading(true)
      await initializeSupertags()
      const allSchemas = await getAllSchemas()
      setSchemas(allSchemas)

      // Load usage counts
      const counts: Record<string, number> = {}
      await Promise.all(
        allSchemas.map(async (schema) => {
          try {
            const blocks = await getBlocksWithSupertag(schema.tagName)
            counts[schema.id] = blocks?.length ?? 0
          } catch {
            counts[schema.id] = 0
          }
        })
      )
      setUsageCounts(counts)

      // Reload tag level stats
      const levelStats = await getTagLevelStats()
      setTagLevelStats(levelStats)
    } catch (error) {
      console.error('Failed to load schemas:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get built-in tag names
  const builtInTagNames = Object.keys(BUILT_IN_SCHEMAS) as BuiltInSupertag[]
  const schemaTagNames = new Set(schemas.map(s => s.tagName.toLowerCase()))

  // Process and filter tags
  const processedTags = useMemo(() => {
    // Combine all tags with their metadata
    const tagMap = new Map<string, {
      tagName: string
      displayName: string
      icon: string
      color: string
      usageCount: number
      isSupertag: boolean
      isBuiltIn: boolean
      schema?: SupertagSchema
    }>()

    // Add tags from schemas
    // A tag is a "supertag" only if it's built-in OR has fields defined
    // Auto-created empty schemas are still "lightweight" tags
    schemas.forEach(schema => {
      const isBuiltIn = schema.tagName.startsWith('_') || builtInTagNames.includes(schema.tagName as BuiltInSupertag)
      const hasFields = schema.fields && schema.fields.length > 0
      const isSupertag = isBuiltIn || hasFields

      tagMap.set(schema.tagName.toLowerCase(), {
        tagName: schema.tagName,
        displayName: schema.displayName || schema.tagName,
        icon: schema.icon || 'Tag',
        color: schema.color || '#71717a',
        usageCount: usageCounts[schema.id] || 0,
        isSupertag,
        isBuiltIn,
        schema,
      })
    })

    // Add tags from usage that don't have schemas at all
    allTagsWithSchemas.forEach(tag => {
      if (!tagMap.has(tag.tagName.toLowerCase())) {
        tagMap.set(tag.tagName.toLowerCase(), {
          tagName: tag.tagName,
          displayName: tag.displayName || tag.tagName,
          icon: tag.icon || 'Hash',
          color: tag.color || '#71717a',
          usageCount: tag.usageCount || 0,
          isSupertag: false,
          isBuiltIn: false,
        })
      }
    })

    // Add tags from tagsIndex (from codex-index.json) that aren't already in the map
    // This ensures ALL lightweight tags are shown, not just those with schemas
    if (tagsIndex?.tags) {
      tagsIndex.tags.forEach(indexTag => {
        const normalized = indexTag.name.toLowerCase()
        if (!tagMap.has(normalized)) {
          tagMap.set(normalized, {
            tagName: indexTag.name,
            displayName: indexTag.name,
            icon: 'Hash',
            color: '#71717a',
            usageCount: indexTag.count || 0,
            isSupertag: false,
            isBuiltIn: false,
          })
        } else {
          // Update usage count if we have a better count from the index
          const existing = tagMap.get(normalized)!
          if (indexTag.count > existing.usageCount) {
            existing.usageCount = indexTag.count
          }
        }
      })
    }

    return Array.from(tagMap.values())
  }, [schemas, allTagsWithSchemas, usageCounts, builtInTagNames, tagsIndex])

  // Create a map for quick lookup of tag level info
  const tagLevelMap = useMemo(() => {
    const map = new Map<string, TagLevelInfo>()
    for (const info of tagLevelStats) {
      map.set(info.tag.toLowerCase(), info)
    }
    return map
  }, [tagLevelStats])

  // Split into sections
  const sectionData = useMemo(() => {
    // Helper to get level for a tag
    const getTagLevel = (tagName: string): 'doc' | 'block' | 'both' | undefined => {
      return tagLevelMap.get(tagName.toLowerCase())?.level
    }

    // Filter by level if filter is active
    const passesLevelFilter = (tagName: string): boolean => {
      if (levelFilter === 'all') return true
      const level = getTagLevel(tagName)
      if (!level) return levelFilter === 'doc' // Tags without level info are doc-level by default
      if (levelFilter === 'doc') return level === 'doc' || level === 'both'
      if (levelFilter === 'block') return level === 'block' || level === 'both'
      return true
    }

    // Supertags (schema-based tags)
    const supertags = processedTags
      .filter(t => t.isSupertag && passesLevelFilter(t.tagName))
      .map(t => ({
        name: t.displayName || t.tagName,
        count: t.usageCount,
        icon: t.icon,
        color: t.color,
        isSupertag: true,
        isBuiltIn: t.isBuiltIn,
        schema: t.schema,
        level: getTagLevel(t.tagName),
      }))

    // Lightweight tags (non-schema tags) - now showing doc-level counts
    const lightweight = processedTags
      .filter(t => !t.isSupertag && passesLevelFilter(t.tagName))
      .map(t => {
        const levelInfo = tagLevelMap.get(t.tagName.toLowerCase())
        return {
          name: t.tagName,
          count: levelInfo?.docCount || t.usageCount,
          icon: 'Hash',
          color: '#71717a',
          isSupertag: false,
          isBuiltIn: false,
          level: getTagLevel(t.tagName),
          docCount: levelInfo?.docCount || 0,
          blockCount: levelInfo?.blockCount || 0,
        }
      })

    // Block-level tags section - tags that exist at block level
    const blockTagsRaw = tagLevelStats
      .filter(t => (t.level === 'block' || t.level === 'both') && passesLevelFilter(t.tag))
      .map(t => ({
        name: t.tag,
        count: t.blockCount,
        icon: 'Layers',
        color: '#14b8a6', // teal
        isSupertag: false,
        isBuiltIn: false,
        level: t.level,
        docCount: t.docCount,
        blockCount: t.blockCount,
      }))

    // Topics from tagsIndex, with database fallback
    const tagsIndexTopicNames = new Set((tagsIndex?.topics || []).map(t => t.name.toLowerCase()))
    const topics = [
      ...(tagsIndex?.topics || []).filter(t => passesLevelFilter(t.name)).map(t => ({
        name: t.name,
        count: t.count,
        icon: 'BookOpen',
        color: '#10b981', // emerald
        level: getTagLevel(t.name),
      })),
      // Add topics from database that aren't already in tagsIndex
      ...dbTaxonomy.topics
        .filter(t => !tagsIndexTopicNames.has(t.name.toLowerCase()) && passesLevelFilter(t.name))
        .map(t => ({
          name: t.name,
          count: t.count,
          icon: 'BookOpen',
          color: '#10b981',
          level: getTagLevel(t.name),
        }))
    ]

    // Subjects from tagsIndex, with database fallback
    const tagsIndexSubjectNames = new Set((tagsIndex?.subjects || []).map(s => s.name.toLowerCase()))
    const subjects = [
      ...(tagsIndex?.subjects || []).filter(s => passesLevelFilter(s.name)).map(s => ({
        name: s.name,
        count: s.count,
        icon: 'GraduationCap',
        color: '#8b5cf6', // violet
        level: getTagLevel(s.name),
      })),
      // Add subjects from database that aren't already in tagsIndex
      ...dbTaxonomy.subjects
        .filter(s => !tagsIndexSubjectNames.has(s.name.toLowerCase()) && passesLevelFilter(s.name))
        .map(s => ({
          name: s.name,
          count: s.count,
          icon: 'GraduationCap',
          color: '#8b5cf6',
          level: getTagLevel(s.name),
        }))
    ]

    return { supertags, lightweight, blocktags: blockTagsRaw, topics, subjects }
  }, [processedTags, tagsIndex, dbTaxonomy, tagLevelMap, levelFilter, tagLevelStats])

  // Stats
  const stats = useMemo(() => {
    const supertags = sectionData.supertags.length
    const lightweight = sectionData.lightweight.length
    const blocktags = sectionData.blocktags.length
    const topics = sectionData.topics.length
    const subjects = sectionData.subjects.length
    const total = supertags + lightweight + blocktags + topics + subjects
    const totalUsage = processedTags.reduce((sum, t) => sum + t.usageCount, 0)
    return { total, supertags, lightweight, blocktags, topics, subjects, totalUsage }
  }, [sectionData, processedTags])

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await deleteSchema(id)
      await loadSchemas()
      setConfirmDelete(null)
    } catch (error) {
      console.error('Failed to delete schema:', error)
    }
  }

  // Open schema modal for creating new supertag
  const handleCreateSupertag = useCallback(() => {
    setEditingSchema(null)
    setShowSchemaModal(true)
  }, [])

  // Open schema modal for editing existing supertag
  const handleEditSupertag = useCallback((schema: SupertagSchema) => {
    setEditingSchema(schema)
    setShowSchemaModal(true)
  }, [])

  // Handle modal save
  const handleSchemaModalSave = useCallback(async () => {
    await loadSchemas()
    refreshTags()
  }, [loadSchemas, refreshTags])

  return (
    <>
    <SupertagSchemaModal
      isOpen={showSchemaModal}
      onClose={() => setShowSchemaModal(false)}
      schema={editingSchema}
      onSave={handleSchemaModalSave}
      theme={theme}
    />
    <div className={cn(
      'flex flex-col h-full overflow-hidden',
      isDark ? 'bg-zinc-900' : 'bg-white'
    )}>
      {/* Header */}
      <div className={cn(
        'flex flex-col gap-4 px-6 py-4 border-b',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <div className="flex items-center gap-3">
          <Tag className="w-6 h-6 text-cyan-500" />
          <h1 className={cn(
            'text-xl font-bold',
            isDark ? 'text-white' : 'text-zinc-900'
          )}>
            Tags
          </h1>
          <div className="flex-1" />
          <button
            onClick={handleCreateSupertag}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Supertag
          </button>
          {onOpenPreferences && (
            <button
              onClick={onOpenPreferences}
              className={cn(
                'p-2 rounded-lg',
                isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'
              )}
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Stats Row - responsive grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <div className={cn(
            'flex flex-col items-center justify-center p-2 rounded-lg',
            isDark ? 'bg-zinc-800' : 'bg-zinc-100'
          )}>
            <div className="flex items-center gap-1 mb-0.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span className={cn('text-xl font-bold', isDark ? 'text-purple-400' : 'text-purple-600')}>
                {stats.supertags}
              </span>
            </div>
            <span className="text-[10px] text-zinc-500">Supertags</span>
          </div>
          <div className={cn(
            'flex flex-col items-center justify-center p-2 rounded-lg',
            isDark ? 'bg-zinc-800' : 'bg-zinc-100'
          )}>
            <div className="flex items-center gap-1 mb-0.5">
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              <span className={cn('text-xl font-bold', isDark ? 'text-blue-400' : 'text-blue-600')}>
                {stats.lightweight}
              </span>
            </div>
            <span className="text-[10px] text-zinc-500">Doc Tags</span>
          </div>
          <div className={cn(
            'flex flex-col items-center justify-center p-2 rounded-lg',
            isDark ? 'bg-zinc-800' : 'bg-zinc-100'
          )}>
            <div className="flex items-center gap-1 mb-0.5">
              <Layers className="w-3.5 h-3.5 text-teal-500" />
              <span className={cn('text-xl font-bold', isDark ? 'text-teal-400' : 'text-teal-600')}>
                {stats.blocktags}
              </span>
            </div>
            <span className="text-[10px] text-zinc-500">Block Tags</span>
          </div>
          <div className={cn(
            'flex flex-col items-center justify-center p-2 rounded-lg',
            isDark ? 'bg-zinc-800' : 'bg-zinc-100'
          )}>
            <div className="flex items-center gap-1 mb-0.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
              <span className={cn('text-xl font-bold', isDark ? 'text-emerald-400' : 'text-emerald-600')}>
                {stats.topics}
              </span>
            </div>
            <span className="text-[10px] text-zinc-500">Topics</span>
          </div>
          <div className={cn(
            'flex flex-col items-center justify-center p-2 rounded-lg',
            isDark ? 'bg-zinc-800' : 'bg-zinc-100'
          )}>
            <div className="flex items-center gap-1 mb-0.5">
              <GraduationCap className="w-3.5 h-3.5 text-violet-500" />
              <span className={cn('text-xl font-bold', isDark ? 'text-violet-400' : 'text-violet-600')}>
                {stats.subjects}
              </span>
            </div>
            <span className="text-[10px] text-zinc-500">Subjects</span>
          </div>
        </div>

        {/* Search, Filter & Refresh */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tags..."
              className={cn(
                'w-full pl-10 pr-10 py-2 rounded-lg text-sm outline-none',
                isDark
                  ? 'bg-zinc-800 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-cyan-500/50'
                  : 'bg-zinc-100 text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:ring-cyan-500/50'
              )}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Level Filter Toggle */}
          <div
            className={cn(
              'flex items-center rounded-lg overflow-hidden border flex-shrink-0',
              isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-200 bg-zinc-100'
            )}
            role="group"
            aria-label="Filter tags by level"
          >
            {(['all', 'doc', 'block'] as TagLevelFilter[]).map((filter) => {
              const tooltips = {
                all: 'Show all tags regardless of level',
                doc: 'Show tags from document frontmatter',
                block: 'Show tags applied to individual blocks',
              }
              return (
                <button
                  key={filter}
                  onClick={() => setLevelFilter(filter)}
                  title={tooltips[filter]}
                  aria-pressed={levelFilter === filter}
                  className={cn(
                    'flex items-center justify-center gap-1 px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs font-medium transition-colors touch-manipulation min-w-[40px] sm:min-w-0',
                    levelFilter === filter
                      ? 'bg-cyan-500 text-white'
                      : isDark
                        ? 'text-zinc-400 hover:bg-zinc-700 active:bg-zinc-600'
                        : 'text-zinc-600 hover:bg-zinc-200 active:bg-zinc-300'
                  )}
                >
                  {filter === 'all' && <Tag className="w-3.5 h-3.5 sm:w-3 sm:h-3" aria-hidden="true" />}
                  {filter === 'doc' && <FileText className="w-3.5 h-3.5 sm:w-3 sm:h-3" aria-hidden="true" />}
                  {filter === 'block' && <Layers className="w-3.5 h-3.5 sm:w-3 sm:h-3" aria-hidden="true" />}
                  <span className="hidden sm:inline">
                    {filter === 'all' ? 'All' : filter === 'doc' ? 'Docs' : 'Blocks'}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Refresh */}
          <button
            onClick={() => {
              loadSchemas()
              refreshTags()
            }}
            className={cn(
              'p-2 rounded-lg',
              isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'
            )}
            title="Refresh tags"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content - Sectioned Layout */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading || tagsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className={cn('w-8 h-8 animate-spin', isDark ? 'text-cyan-500' : 'text-cyan-600')} />
              <span className="text-sm text-zinc-500">Loading tags...</span>
            </div>
          </div>
        ) : stats.total === 0 && !searchQuery ? (
          <div className="flex flex-col items-center justify-center py-16">
            {levelFilter === 'block' ? (
              <>
                <Layers className={cn('w-12 h-12 mb-4', isDark ? 'text-zinc-700' : 'text-zinc-300')} />
                <p className={cn('mb-2', isDark ? 'text-zinc-400' : 'text-zinc-600')}>No block-level tags yet</p>
                <p className="text-sm text-zinc-500 mb-6 max-w-md text-center">
                  Block tags are applied to individual paragraphs, headings, or code blocks.
                  Select a block in your document and add tags to see them here.
                </p>
                <button
                  onClick={() => setLevelFilter('all')}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium"
                >
                  <Tag className="w-4 h-4" />
                  View All Tags
                </button>
              </>
            ) : levelFilter === 'doc' ? (
              <>
                <FileText className={cn('w-12 h-12 mb-4', isDark ? 'text-zinc-700' : 'text-zinc-300')} />
                <p className={cn('mb-2', isDark ? 'text-zinc-400' : 'text-zinc-600')}>No document-level tags yet</p>
                <p className="text-sm text-zinc-500 mb-6 max-w-md text-center">
                  Document tags are defined in frontmatter metadata.
                  Add tags to your strand documents to see them here.
                </p>
                <button
                  onClick={() => setLevelFilter('all')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium"
                >
                  <Tag className="w-4 h-4" />
                  View All Tags
                </button>
              </>
            ) : (
              <>
                <Tag className={cn('w-12 h-12 mb-4', isDark ? 'text-zinc-700' : 'text-zinc-300')} />
                <p className={cn('mb-2', isDark ? 'text-zinc-400' : 'text-zinc-600')}>No tags yet</p>
                <p className="text-sm text-zinc-500 mb-6">Add tags to your content or create a supertag schema</p>
                <button
                  onClick={handleCreateSupertag}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Create Supertag
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Supertags Section */}
            <CollapsibleTagSection
              sectionKey="supertags"
              title="Supertags"
              subtitle="Structured tags with custom fields — click to view or edit schema"
              icon={Sparkles}
              iconColor="#a855f7"
              items={sectionData.supertags}
              expanded={sections.supertags.expanded}
              page={sections.supertags.page}
              pageSize={PAGE_SIZE}
              onToggle={() => toggleSection('supertags')}
              onLoadMore={() => loadMore('supertags')}
              onItemClick={(item) => item.schema && handleEditSupertag(item.schema)}
              isDark={isDark}
              searchQuery={searchQuery}
            />

            {/* Lightweight Tags Section (Document-level) */}
            <CollapsibleTagSection
              sectionKey="lightweight"
              title="Document Tags"
              subtitle="Tags applied at document level in frontmatter metadata"
              icon={FileText}
              iconColor="#3b82f6"
              items={sectionData.lightweight}
              expanded={sections.lightweight.expanded}
              page={sections.lightweight.page}
              pageSize={PAGE_SIZE}
              onToggle={() => toggleSection('lightweight')}
              onLoadMore={() => loadMore('lightweight')}
              isDark={isDark}
              searchQuery={searchQuery}
              showLevelBadge={true}
            />

            {/* Block Tags Section */}
            <CollapsibleTagSection
              sectionKey="blocktags"
              title="Block Tags"
              subtitle="Tags applied to individual content blocks (paragraphs, headings, code)"
              icon={Layers}
              iconColor="#14b8a6"
              items={sectionData.blocktags}
              expanded={sections.blocktags.expanded}
              page={sections.blocktags.page}
              pageSize={PAGE_SIZE}
              onToggle={() => toggleSection('blocktags')}
              onLoadMore={() => loadMore('blocktags')}
              isDark={isDark}
              searchQuery={searchQuery}
              showLevelBadge={true}
            />

            {/* Topics Section */}
            <CollapsibleTagSection
              sectionKey="topics"
              title="Topics"
              subtitle="Broad subject areas extracted from strand metadata"
              icon={BookOpen}
              iconColor="#10b981"
              items={sectionData.topics}
              expanded={sections.topics.expanded}
              page={sections.topics.page}
              pageSize={PAGE_SIZE}
              onToggle={() => toggleSection('topics')}
              onLoadMore={() => loadMore('topics')}
              isDark={isDark}
              searchQuery={searchQuery}
            />

            {/* Subjects Section */}
            <CollapsibleTagSection
              sectionKey="subjects"
              title="Subjects"
              subtitle="Specific disciplines within topics"
              icon={GraduationCap}
              iconColor="#8b5cf6"
              items={sectionData.subjects}
              expanded={sections.subjects.expanded}
              page={sections.subjects.page}
              pageSize={PAGE_SIZE}
              onToggle={() => toggleSection('subjects')}
              onLoadMore={() => loadMore('subjects')}
              isDark={isDark}
              searchQuery={searchQuery}
            />

            {/* No results message */}
            {searchQuery &&
              sectionData.supertags.length === 0 &&
              sectionData.lightweight.length === 0 &&
              sectionData.blocktags.length === 0 &&
              sectionData.topics.length === 0 &&
              sectionData.subjects.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Search className={cn('w-12 h-12 mb-4', isDark ? 'text-zinc-700' : 'text-zinc-300')} />
                  <p className="text-zinc-500 mb-2">No tags match "{searchQuery}"</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-cyan-500 text-sm hover:underline"
                  >
                    Clear search
                  </button>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
    </>
  )
}
