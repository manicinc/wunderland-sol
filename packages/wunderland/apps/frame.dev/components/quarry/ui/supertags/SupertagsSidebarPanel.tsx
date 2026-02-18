/**
 * Tags Sidebar Panel
 * @module codex/ui/SupertagsSidebarPanel
 *
 * @description
 * Sidebar panel for browsing all tags and managing supertags.
 * Shows all lightweight tags from the codebase plus supertag schemas.
 * Lightweight tags can be promoted to supertags to add custom fields.
 *
 * @features
 * - Browse all tags (lightweight and supertags)
 * - Convert lightweight tags to supertags
 * - Quick-apply supertags to selected content
 * - Create and edit supertag schemas
 * - Search and filter tags
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Icons from 'lucide-react'
import {
  Sparkles,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  Tag,
  Edit,
  Trash2,
  Check,
  X,
  Layers,
  Settings,
  Hash,
  ArrowUpCircle,
  Palette,
  Type,
  Eye,
  GripVertical,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getAllSchemas,
  deleteSchema,
  initializeSupertags,
  getBlocksWithSupertag,
  type SupertagSchema,
  BUILT_IN_SCHEMAS,
  type BuiltInSupertag,
} from '@/lib/supertags'
import { useStrandTags, useStrandTagsWithSchemas, getTagsWithCounts, getTaxonomyFromDatabase, type TagWithSchema } from '@/lib/planner/useStrandTags'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

/** Tags index with topics, subjects and regular tags */
export interface TagsIndex {
  tags: Array<{ name: string; count: number; paths: string[] }>
  topics: Array<{ name: string; count: number; paths: string[] }>
  subjects: Array<{ name: string; count: number; paths: string[] }>
  skills?: Array<{ name: string; count: number; paths: string[] }>
}

export interface SupertagsSidebarPanelProps {
  /** Theme for styling */
  theme?: 'light' | 'dark'
  /** Currently selected block ID (for applying supertags) */
  selectedBlockId?: string
  /** Currently selected strand path */
  selectedStrandPath?: string
  /** Currently selected tag name (when clicked from content) */
  selectedTagName?: string
  /** Callback when a supertag is selected to apply */
  onApplySupertag?: (schema: SupertagSchema) => void
  /** Callback to open supertag schema designer */
  onOpenDesigner?: (schema?: SupertagSchema) => void
  /** Callback to promote a lightweight tag to supertag */
  onPromoteTag?: (tagName: string) => void
  /** Callback when viewing items with a supertag */
  onViewItems?: (schema: SupertagSchema) => void
  /** Enable drag-drop of tags to editor */
  enableTagDrag?: boolean
  /** Callback to open full tags page */
  onViewAllTags?: () => void
  /** Tags index from QuarryViewer for topics/subjects/tags */
  tagsIndex?: TagsIndex
  /** Additional class names */
  className?: string
}

// Drag data type for tag drops
export const TAG_DRAG_TYPE = 'application/x-supertag'

/**
 * Get tag data from drag event
 */
export function getTagFromDragEvent(e: DragEvent): { tagName: string; isSupertag: boolean } | null {
  const data = e.dataTransfer?.getData(TAG_DRAG_TYPE)
  if (!data) return null
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

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
   SUPERTAG CARD
═══════════════════════════════════════════════════════════════════════════ */

interface SupertagCardProps {
  schema: SupertagSchema
  theme: 'light' | 'dark'
  onApply?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onViewItems?: () => void
  canDelete?: boolean
  usageCount?: number
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
}

function SupertagCard({
  schema,
  theme,
  onApply,
  onEdit,
  onDelete,
  onViewItems,
  canDelete = true,
  usageCount,
  draggable = false,
  onDragStart,
}: SupertagCardProps) {
  const isDark = theme === 'dark'
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const Icon = getIconComponent(schema.icon)
  const color = schema.color || '#71717a'

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
    >
      <motion.div
        layout
        className={cn(
          'rounded-lg border overflow-hidden',
          draggable && 'cursor-grab active:cursor-grabbing',
          isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-white'
        )}
      >
      {/* Header */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 cursor-pointer',
          'hover:bg-black/5 dark:hover:bg-white/5 transition-colors'
        )}
        style={{ borderLeftColor: color, borderLeftWidth: '3px' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div
          className="p-1.5 rounded-md"
          style={{ backgroundColor: color + '20' }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn(
            'text-xs font-medium truncate',
            isDark ? 'text-zinc-200' : 'text-zinc-800'
          )}>
            #{schema.displayName || schema.tagName}
          </div>
          <div className="text-[10px] text-zinc-500 truncate flex items-center gap-2">
            <span>{schema.fields.length} field{schema.fields.length !== 1 ? 's' : ''}</span>
            {usageCount !== undefined && usageCount > 0 && (
              <span className="text-cyan-500">· {usageCount} item{usageCount !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
        )}
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {/* Description */}
            {schema.description && (
              <div className={cn(
                'px-3 py-2 text-[10px] border-t',
                isDark ? 'border-zinc-800 text-zinc-400' : 'border-zinc-100 text-zinc-600'
              )}>
                {schema.description}
              </div>
            )}

            {/* Fields Preview */}
            <div className={cn(
              'px-3 py-2 border-t',
              isDark ? 'border-zinc-800' : 'border-zinc-100'
            )}>
              <div className="text-[9px] text-zinc-500 uppercase tracking-wider mb-2">
                Fields
              </div>
              <div className="space-y-1">
                {schema.fields.slice(0, 5).map(field => {
                  const FieldIcon = getIconComponent(
                    field.type === 'text' ? 'Type' :
                    field.type === 'number' ? 'Hash' :
                    field.type === 'date' ? 'Calendar' :
                    field.type === 'checkbox' ? 'CheckSquare' :
                    field.type === 'select' ? 'List' :
                    field.type === 'rating' ? 'Star' :
                    field.type === 'progress' ? 'Percent' :
                    field.type === 'url' ? 'Link' :
                    'Type'
                  )
                  return (
                    <div
                      key={field.name}
                      className="flex items-center gap-2"
                    >
                      <FieldIcon className="w-3 h-3 text-zinc-500" />
                      <span className={cn(
                        'text-[10px] flex-1',
                        isDark ? 'text-zinc-300' : 'text-zinc-700'
                      )}>
                        {field.label}
                      </span>
                      {field.required && (
                        <span className="text-[8px] text-amber-500 font-medium">
                          REQ
                        </span>
                      )}
                    </div>
                  )
                })}
                {schema.fields.length > 5 && (
                  <div className="text-[9px] text-zinc-500">
                    +{schema.fields.length - 5} more
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className={cn(
              'flex items-center gap-1 px-2 py-2 border-t',
              isDark ? 'border-zinc-800' : 'border-zinc-100'
            )}>
              {onApply && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onApply()
                  }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] font-medium',
                    'transition-colors',
                    isDark
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                  )}
                >
                  <Plus className="w-3 h-3" />
                  Apply
                </button>
              )}
              {onViewItems && usageCount !== undefined && usageCount > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onViewItems()
                  }}
                  className={cn(
                    'p-1.5 rounded transition-colors',
                    isDark
                      ? 'hover:bg-cyan-500/20 text-zinc-400 hover:text-cyan-400'
                      : 'hover:bg-cyan-50 text-zinc-500 hover:text-cyan-600'
                  )}
                  title={`View ${usageCount} item${usageCount !== 1 ? 's' : ''}`}
                >
                  <Eye className="w-3 h-3" />
                </button>
              )}
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit()
                  }}
                  className={cn(
                    'p-1.5 rounded transition-colors',
                    isDark
                      ? 'hover:bg-zinc-800 text-zinc-400'
                      : 'hover:bg-zinc-100 text-zinc-500'
                  )}
                  title="Edit schema"
                >
                  <Edit className="w-3 h-3" />
                </button>
              )}
              {canDelete && onDelete && (
                confirmDelete ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete()
                        setConfirmDelete(false)
                      }}
                      className="p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      title="Confirm delete"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setConfirmDelete(false)
                      }}
                      className={cn(
                        'p-1.5 rounded',
                        isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                      )}
                      title="Cancel"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setConfirmDelete(true)
                    }}
                    className={cn(
                      'p-1.5 rounded transition-colors',
                      isDark
                        ? 'hover:bg-red-500/20 text-zinc-400 hover:text-red-400'
                        : 'hover:bg-red-50 text-zinc-500 hover:text-red-500'
                    )}
                    title="Delete schema"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function SupertagsSidebarPanel({
  theme = 'dark',
  selectedBlockId,
  selectedStrandPath,
  selectedTagName,
  onApplySupertag,
  onOpenDesigner,
  onPromoteTag,
  onViewItems,
  enableTagDrag = true,
  onViewAllTags,
  tagsIndex,
  className,
}: SupertagsSidebarPanelProps) {
  const resolvePath = useQuarryPath()
  const isDark = theme === 'dark'

  // State
  const [schemas, setSchemas] = useState<SupertagSchema[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAllTags, setShowAllTags] = useState(true)
  const [showBuiltIn, setShowBuiltIn] = useState(true)
  const [showCustom, setShowCustom] = useState(true)
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({})
  const [tagUsageCounts, setTagUsageCounts] = useState<Map<string, number>>(new Map())

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const TAGS_PER_PAGE = 24

  // Topics and Subjects state
  const [topics, setTopics] = useState<Array<{ name: string; count: number; paths: string[] }>>([])
  const [subjects, setSubjects] = useState<Array<{ name: string; count: number; paths: string[] }>>([])
  const [showTopics, setShowTopics] = useState(true)
  const [showSubjects, setShowSubjects] = useState(true)
  const [showMoreTopics, setShowMoreTopics] = useState(false)
  const [showMoreSubjects, setShowMoreSubjects] = useState(false)

  // Search autocomplete state
  const [searchFocused, setSearchFocused] = useState(false)

  // Get all tags with schema info
  const { tags: allTagsWithSchemas, isLoading: tagsLoading, error: tagsError, refresh: refreshTags } = useStrandTagsWithSchemas()

  // Simple tag names for backwards compat
  const allTags = allTagsWithSchemas.map(t => t.tagName)

  // Filtered suggestions for autocomplete
  const filteredSuggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 1) return []
    const query = searchQuery.toLowerCase()
    const allItems = [
      ...allTags.map(t => ({ name: t, type: 'tag' as const })),
      ...topics.map(t => ({ name: t.name, type: 'topic' as const })),
      ...subjects.map(s => ({ name: s.name, type: 'subject' as const })),
    ]
    return allItems
      .filter(item => item.name.toLowerCase().includes(query))
      .slice(0, 10)
  }, [searchQuery, allTags, topics, subjects])

  // Check if selected tag is a supertag or lightweight
  const selectedTagSchema = selectedTagName
    ? schemas.find(s => s.tagName.toLowerCase() === selectedTagName.toLowerCase())
    : null
  const isLightweightTag = selectedTagName && !selectedTagSchema

  // Load schemas and tag counts
  useEffect(() => {
    loadSchemas()
    loadTagCounts()
  }, [])

  const loadSchemas = async () => {
    try {
      setLoading(true)
      await initializeSupertags()
      const allSchemas = await getAllSchemas()
      setSchemas(allSchemas)

      // Load usage counts for each schema
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
    } catch (error) {
      console.error('Failed to load supertag schemas:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTagCounts = async () => {
    try {
      const counts = await getTagsWithCounts()
      setTagUsageCounts(counts)
    } catch (error) {
      console.error('Failed to load tag counts:', error)
    }
  }

  // Load topics and subjects from tagsIndex prop (preferred) or database fallback
  useEffect(() => {
    if (tagsIndex) {
      // Use tagsIndex from QuarryViewer - same data source as Full Tags Browser
      setTopics([...tagsIndex.topics].sort((a, b) => b.count - a.count))
      setSubjects([...tagsIndex.subjects].sort((a, b) => b.count - a.count))
    } else {
      // Fallback to database query
      getTaxonomyFromDatabase().then(({ topics: fetchedTopics, subjects: fetchedSubjects }) => {
        setTopics(fetchedTopics.sort((a, b) => b.count - a.count))
        setSubjects(fetchedSubjects.sort((a, b) => b.count - a.count))
      }).catch(error => {
        console.error('Failed to load taxonomy:', error)
      })
    }
  }, [tagsIndex])

  // Filter schemas
  const filteredSchemas = schemas.filter(schema => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!schema.tagName.toLowerCase().includes(query) &&
          !schema.displayName?.toLowerCase().includes(query) &&
          !schema.description?.toLowerCase().includes(query)) {
        return false
      }
    }
    return true
  })

  // Get list of built-in supertag names from the BUILT_IN_SCHEMAS definition
  const builtInTagNames = Object.keys(BUILT_IN_SCHEMAS) as BuiltInSupertag[]

  // Separate built-in vs custom
  const builtInSchemas = filteredSchemas.filter(s =>
    s.tagName.startsWith('_') || builtInTagNames.includes(s.tagName as BuiltInSupertag)
  )
  const customSchemas = filteredSchemas.filter(s => !builtInSchemas.includes(s))

  // Get all tag names that have schemas
  const schemaTagNames = new Set(schemas.map(s => s.tagName.toLowerCase()))

  // Combined tags from tagsIndex (preferred) or database hook
  // tagsIndex.tags contains regular doc tags with counts
  const combinedTags = useMemo(() => {
    if (tagsIndex?.tags && tagsIndex.tags.length > 0) {
      return tagsIndex.tags.map(t => t.name)
    }
    return allTags
  }, [tagsIndex, allTags])

  // Combined tag counts from tagsIndex or database
  const combinedTagCounts = useMemo(() => {
    if (tagsIndex?.tags && tagsIndex.tags.length > 0) {
      const counts = new Map<string, number>()
      tagsIndex.tags.forEach(t => counts.set(t.name.toLowerCase(), t.count))
      return counts
    }
    return tagUsageCounts
  }, [tagsIndex, tagUsageCounts])

  // Filter and categorize all tags
  const filteredAllTags = combinedTags.filter(tag => {
    if (searchQuery) {
      return tag.toLowerCase().includes(searchQuery.toLowerCase())
    }
    return true
  })

  // Lightweight tags (no schema) - sorted by usage
  const lightweightTags = filteredAllTags
    .filter(tag => !schemaTagNames.has(tag.toLowerCase()))
    .sort((a, b) => (combinedTagCounts.get(b.toLowerCase()) || 0) - (combinedTagCounts.get(a.toLowerCase()) || 0))

  // Paginated lightweight tags
  const totalPages = Math.ceil(lightweightTags.length / TAGS_PER_PAGE)
  const paginatedTags = lightweightTags.slice(
    (currentPage - 1) * TAGS_PER_PAGE,
    currentPage * TAGS_PER_PAGE
  )

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  // Stats computations
  const totalTagUsage = Array.from(combinedTagCounts.values()).reduce((sum, count) => sum + count, 0)
  const trendingTags = useMemo(() => {
    // Use tagsIndex for trending when available (more accurate counts)
    if (tagsIndex?.tags && tagsIndex.tags.length > 0) {
      return tagsIndex.tags
        .slice(0, 5)
        .map(t => ({
          tagName: t.name,
          displayName: t.name,
          icon: '#',
          color: '#71717a',
          hasFields: false,
          usageCount: t.count,
        }))
    }
    return [...allTagsWithSchemas]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5)
  }, [tagsIndex, allTagsWithSchemas])

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await deleteSchema(id)
      await loadSchemas()
    } catch (error) {
      console.error('Failed to delete schema:', error)
    }
  }

  // Handle tag drag start
  const handleTagDragStart = useCallback((e: React.DragEvent, tagName: string, isSupertag: boolean) => {
    if (!enableTagDrag) return

    const data = JSON.stringify({ tagName, isSupertag })
    e.dataTransfer.setData(TAG_DRAG_TYPE, data)
    e.dataTransfer.setData('text/plain', `#${tagName}`)
    e.dataTransfer.effectAllowed = 'copy'

    // Create custom drag image
    const dragImage = document.createElement('div')
    dragImage.className = 'fixed pointer-events-none px-2 py-1 rounded-md text-xs font-medium bg-cyan-500 text-white shadow-lg'
    dragImage.textContent = `#${tagName}`
    dragImage.style.position = 'absolute'
    dragImage.style.left = '-9999px'
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 0, 0)

    // Clean up
    setTimeout(() => document.body.removeChild(dragImage), 0)
  }, [enableTagDrag])

  return (
    <div className={cn(
      'flex flex-col h-full min-h-0 overflow-hidden',
      isDark ? 'bg-zinc-900' : 'bg-white',
      className
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 border-b shrink-0',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <Tag className="w-4 h-4 text-cyan-500" />
        <h2 className={cn(
          'text-xs font-semibold flex-1',
          isDark ? 'text-zinc-200' : 'text-zinc-800'
        )}>
          Tags
        </h2>
        <a
          href={resolvePath('/quarry/tags')}
          onClick={(e) => {
            if (onViewAllTags) {
              e.preventDefault()
              onViewAllTags()
            }
          }}
          className={cn(
            'p-1 rounded-md transition-colors text-cyan-500',
            isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
          )}
          title="Open full tags page"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <button
          onClick={() => onOpenDesigner?.()}
          className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium',
            isDark
              ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
          )}
        >
          <Plus className="w-3 h-3" />
          New
        </button>
      </div>

      {/* Search */}
      <div className={cn(
        'px-3 py-2 border-b',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => {
              // Delay to allow clicking on suggestions
              setTimeout(() => setSearchFocused(false), 150)
            }}
            placeholder="Search tags..."
            className={cn(
              'w-full pl-8 pr-8 py-1.5 rounded-md text-xs outline-none',
              isDark
                ? 'bg-zinc-800 text-zinc-200 placeholder:text-zinc-500'
                : 'bg-zinc-100 text-zinc-800 placeholder:text-zinc-400'
            )}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Autocomplete Dropdown */}
          {searchFocused && filteredSuggestions.length > 0 && (
            <div className={cn(
              'absolute top-full left-0 right-0 mt-1 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto',
              isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'
            )}>
              {filteredSuggestions.map((suggestion) => (
                <button
                  key={`${suggestion.type}-${suggestion.name}`}
                  onClick={() => {
                    setSearchQuery(suggestion.name)
                    setSearchFocused(false)
                  }}
                  className={cn(
                    'w-full px-3 py-2 text-left text-xs flex items-center gap-2',
                    isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'
                  )}
                >
                  <span className={cn(
                    'text-[10px] font-medium uppercase px-1 rounded',
                    suggestion.type === 'tag' && 'bg-sky-500/20 text-sky-400',
                    suggestion.type === 'topic' && 'bg-emerald-500/20 text-emerald-400',
                    suggestion.type === 'subject' && 'bg-violet-500/20 text-violet-400'
                  )}>
                    {suggestion.type === 'tag' ? '#' : suggestion.type === 'topic' ? '📚' : '🎯'}
                  </span>
                  <span className={isDark ? 'text-zinc-200' : 'text-zinc-700'}>
                    {suggestion.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Search results count */}
        {searchQuery && (
          <div className="mt-1.5 text-[10px] text-zinc-500">
            Found {lightweightTags.length + filteredSchemas.length} tags matching &ldquo;{searchQuery}&rdquo;
          </div>
        )}
      </div>

      {/* Stats Widget */}
      {!searchQuery && !loading && (
        <div className={cn(
          'px-3 py-3 border-b space-y-3',
          isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50/50'
        )}>
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2">
            <div
              className={cn(
                'flex flex-col items-center justify-center p-2 rounded-lg cursor-default',
                isDark ? 'bg-zinc-800' : 'bg-white border border-zinc-200'
              )}
              title={`${combinedTags.length} unique tags in your knowledge base\nIncludes both lightweight tags and supertags`}
            >
              <span className={cn(
                'text-lg font-bold',
                isDark ? 'text-cyan-400' : 'text-cyan-600'
              )}>
                {combinedTags.length}
              </span>
              <span className="text-[9px] text-zinc-500 uppercase tracking-wide">Tags</span>
            </div>
            <div
              className={cn(
                'flex flex-col items-center justify-center p-2 rounded-lg cursor-default',
                isDark ? 'bg-zinc-800' : 'bg-white border border-zinc-200'
              )}
              title={`${schemas.length} supertag schemas defined\nSupertags have custom fields and structure`}
            >
              <span className={cn(
                'text-lg font-bold',
                isDark ? 'text-purple-400' : 'text-purple-600'
              )}>
                {schemas.length}
              </span>
              <span className="text-[9px] text-zinc-500 uppercase tracking-wide">Schemas</span>
            </div>
            <div
              className={cn(
                'flex flex-col items-center justify-center p-2 rounded-lg cursor-default',
                isDark ? 'bg-zinc-800' : 'bg-white border border-zinc-200'
              )}
              title={`${totalTagUsage} total tag usages\nSum of all tag occurrences across strands`}
            >
              <span className={cn(
                'text-lg font-bold',
                isDark ? 'text-emerald-400' : 'text-emerald-600'
              )}>
                {totalTagUsage}
              </span>
              <span className="text-[9px] text-zinc-500 uppercase tracking-wide">Uses</span>
            </div>
          </div>

          {/* Trending Tags */}
          {trendingTags.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
                  Trending
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {trendingTags.map(tag => (
                  <button
                    key={tag.tagName}
                    onClick={() => setSearchQuery(tag.tagName)}
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium transition-colors',
                      isDark
                        ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                    )}
                    style={{ borderLeftColor: tag.color, borderLeftWidth: 2 }}
                    title={`#${tag.tagName}\n${tag.usageCount} uses across your strands\n${tag.hasFields ? 'Supertag with custom fields' : 'Lightweight tag'}\nClick to search`}
                  >
                    #{tag.tagName}
                    <span className="text-zinc-400">({tag.usageCount})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Related Tags Info */}
          {selectedTagName && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Layers className="w-3 h-3 text-cyan-500" />
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
                  Related
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {allTagsWithSchemas
                  .filter(t => t.tagName.toLowerCase() !== selectedTagName.toLowerCase())
                  .slice(0, 4)
                  .map(tag => (
                    <button
                      key={tag.tagName}
                      onClick={() => setSearchQuery(tag.tagName)}
                      className={cn(
                        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] transition-colors',
                        isDark
                          ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-cyan-400'
                          : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-cyan-50 hover:text-cyan-600'
                      )}
                      title={`View #${tag.tagName} • ${tag.usageCount} uses`}
                    >
                      <Hash className="w-2.5 h-2.5" />
                      {tag.tagName}
                    </button>
                  ))}
                {allTagsWithSchemas.length > 5 && (
                  <span className="text-[9px] text-zinc-400 px-1">
                    +{allTagsWithSchemas.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Error state with retry */}
          {tagsError && (
            <div className={cn(
              'flex items-center justify-between p-2 rounded-lg',
              isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
            )}>
              <span className="text-[10px] text-red-500">Failed to load tags</span>
              <button
                onClick={refreshTags}
                className="text-[10px] text-red-500 hover:underline"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}

      {/* Selection Info */}
      {selectedBlockId && !selectedTagName && (
        <div className={cn(
          'flex items-center gap-2 px-3 py-2 border-b',
          isDark ? 'border-zinc-800 bg-blue-500/10' : 'border-zinc-200 bg-blue-50'
        )}>
          <Layers className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-[10px] text-blue-600 dark:text-blue-400">
            Select a supertag to apply to current block
          </span>
        </div>
      )}

      {/* Lightweight Tag - Convert to Supertag */}
      {isLightweightTag && (
        <div className={cn(
          'px-3 py-3 border-b max-h-56 overflow-y-auto shrink-0',
          isDark ? 'border-zinc-800 bg-amber-500/5' : 'border-zinc-200 bg-amber-50'
        )}>
          {/* Tag Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className={cn(
              'p-1.5 rounded-md',
              isDark ? 'bg-zinc-800' : 'bg-zinc-100'
            )}>
              <Hash className="w-4 h-4 text-zinc-500" />
            </div>
            <div>
              <div className={cn(
                'text-sm font-medium',
                isDark ? 'text-zinc-200' : 'text-zinc-800'
              )}>
                #{selectedTagName}
              </div>
              <div className="text-[10px] text-zinc-500">
                Lightweight tag
              </div>
            </div>
          </div>

          {/* Promotion Info */}
          <div className={cn(
            'text-[11px] mb-3 p-2 rounded-md',
            isDark ? 'bg-zinc-800/50 text-zinc-400' : 'bg-white text-zinc-600'
          )}>
            <p className="mb-2">
              This is a simple tag. Convert it to a supertag to add:
            </p>
            <ul className="space-y-1">
              <li className="flex items-center gap-1.5">
                <Palette className="w-3 h-3 text-purple-400" />
                Custom icon & color
              </li>
              <li className="flex items-center gap-1.5">
                <Type className="w-3 h-3 text-cyan-400" />
                Structured fields (text, date, select, etc.)
              </li>
              <li className="flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-emerald-400" />
                Templates & inheritance
              </li>
            </ul>
          </div>

          {/* Convert Button */}
          <button
            onClick={() => onPromoteTag?.(selectedTagName!)}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg',
              'text-xs font-medium transition-colors',
              'bg-amber-500 hover:bg-amber-600 text-white'
            )}
          >
            <ArrowUpCircle className="w-4 h-4" />
            Convert to Supertag
          </button>
        </div>
      )}

      {/* Supertag Details (when a supertag is selected) */}
      {selectedTagSchema && (
        <div className={cn(
          'px-3 py-3 border-b max-h-56 overflow-y-auto shrink-0',
          isDark ? 'border-zinc-800 bg-emerald-500/5' : 'border-zinc-200 bg-emerald-50'
        )}>
          {/* Schema Header */}
          <div className="flex items-center gap-2 mb-2">
            <div
              className="p-1.5 rounded-md"
              style={{ backgroundColor: (selectedTagSchema.color || '#71717a') + '20' }}
            >
              {(() => {
                const Icon = getIconComponent(selectedTagSchema.icon)
                return <Icon className="w-4 h-4" style={{ color: selectedTagSchema.color || '#71717a' }} />
              })()}
            </div>
            <div>
              <div className={cn(
                'text-sm font-medium',
                isDark ? 'text-zinc-200' : 'text-zinc-800'
              )}>
                #{selectedTagSchema.displayName || selectedTagSchema.tagName}
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                Supertag · {selectedTagSchema.fields.length} fields
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            {selectedBlockId && (
              <button
                onClick={() => onApplySupertag?.(selectedTagSchema)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-medium',
                  isDark
                    ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400'
                    : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'
                )}
              >
                <Plus className="w-3 h-3" />
                Apply to Block
              </button>
            )}
            {onViewItems && usageCounts[selectedTagSchema.id] > 0 && (
              <button
                onClick={() => onViewItems(selectedTagSchema)}
                className={cn(
                  'flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-medium',
                  isDark
                    ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400'
                    : 'bg-cyan-100 hover:bg-cyan-200 text-cyan-700'
                )}
              >
                <Eye className="w-3 h-3" />
                View {usageCounts[selectedTagSchema.id]} Items
              </button>
            )}
            <button
              onClick={() => onOpenDesigner?.(selectedTagSchema)}
              className={cn(
                'flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-medium',
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
              )}
            >
              <Edit className="w-3 h-3" />
              Edit Schema
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {loading || tagsLoading ? (
          // Loading skeleton with better feedback
          <div className="space-y-3">
            <div className="flex items-center justify-center py-4">
              <div className="flex flex-col items-center gap-2">
                <div className={cn(
                  'w-6 h-6 border-2 border-t-transparent rounded-full animate-spin',
                  isDark ? 'border-cyan-500' : 'border-cyan-600'
                )} />
                <span className="text-[10px] text-zinc-500">Loading tags...</span>
              </div>
            </div>
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className={cn(
                  'h-12 rounded-lg animate-pulse',
                  isDark ? 'bg-zinc-800' : 'bg-zinc-100'
                )}
              />
            ))}
          </div>
        ) : (
          <>
            {/* All Tags (Lightweight) */}
            {lightweightTags.length > 0 && (
              <div>
                <button
                  onClick={() => setShowAllTags(!showAllTags)}
                  className={cn(
                    'flex items-center gap-1.5 w-full px-1.5 py-0.5 rounded text-left',
                    isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
                  )}
                >
                  {showAllTags ? (
                    <ChevronDown className="w-3 h-3 text-zinc-500" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-zinc-500" />
                  )}
                  <Hash className="w-3 h-3 text-zinc-400" />
                  <span className={cn(
                    'text-[10px] font-medium flex-1',
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  )}>
                    Tags
                  </span>
                  <span className="text-[9px] text-zinc-500">
                    {lightweightTags.length}
                  </span>
                </button>

                <AnimatePresence>
                  {showAllTags && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-1"
                    >
                      {/* Tag Grid */}
                      <div className="flex flex-wrap gap-1.5 px-1.5 py-2">
                        {paginatedTags.map(tag => {
                          const count = combinedTagCounts.get(tag.toLowerCase()) || 0
                          return (
                            <div
                              key={tag}
                              draggable={enableTagDrag}
                              onDragStart={(e) => handleTagDragStart(e, tag, false)}
                              onClick={() => onPromoteTag?.(tag)}
                              className={cn(
                                'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium',
                                'transition-colors cursor-pointer select-none',
                                enableTagDrag && 'cursor-grab active:cursor-grabbing',
                                selectedTagName?.toLowerCase() === tag.toLowerCase()
                                  ? isDark
                                    ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40'
                                    : 'bg-amber-100 text-amber-700 ring-1 ring-amber-300'
                                  : isDark
                                    ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                              )}
                              title={`#${tag} • ${count} use${count !== 1 ? 's' : ''}\n${enableTagDrag ? 'Drag to editor • ' : ''}Click to convert to supertag`}
                            >
                              {enableTagDrag && (
                                <GripVertical className="w-2.5 h-2.5 opacity-50" />
                              )}
                              <Hash className="w-2.5 h-2.5 opacity-70" />
                              <span>{tag}</span>
                              {count > 0 && (
                                <span className="text-[9px] text-zinc-400 ml-0.5">({count})</span>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className={cn(
                          'flex items-center justify-between px-2 py-2 mt-1 border-t',
                          isDark ? 'border-zinc-800' : 'border-zinc-200'
                        )}>
                          <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className={cn(
                              'px-2 py-1 text-[10px] rounded transition-colors',
                              currentPage === 1
                                ? 'text-zinc-400 cursor-not-allowed'
                                : isDark
                                  ? 'text-zinc-300 hover:bg-zinc-800'
                                  : 'text-zinc-600 hover:bg-zinc-100'
                            )}
                          >
                            ← Prev
                          </button>
                          <span className="text-[10px] text-zinc-500">
                            Page {currentPage} of {totalPages} ({lightweightTags.length} tags)
                          </span>
                          <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className={cn(
                              'px-2 py-1 text-[10px] rounded transition-colors',
                              currentPage === totalPages
                                ? 'text-zinc-400 cursor-not-allowed'
                                : isDark
                                  ? 'text-zinc-300 hover:bg-zinc-800'
                                  : 'text-zinc-600 hover:bg-zinc-100'
                            )}
                          >
                            Next →
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Topics Section */}
            {topics.length > 0 && (
              <div>
                <button
                  onClick={() => setShowTopics(!showTopics)}
                  className={cn(
                    'flex items-center gap-1.5 w-full px-1.5 py-0.5 rounded text-left',
                    isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
                  )}
                >
                  {showTopics ? (
                    <ChevronDown className="w-3 h-3 text-zinc-500" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-zinc-500" />
                  )}
                  <Icons.BookOpen className="w-3 h-3 text-emerald-500" />
                  <span className={cn(
                    'text-[10px] font-medium flex-1',
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  )}>
                    Topics
                  </span>
                  <span className="text-[9px] text-zinc-500">
                    {topics.length}
                  </span>
                </button>

                <AnimatePresence>
                  {showTopics && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-1"
                    >
                      <div className="flex flex-wrap gap-1 px-1">
                        {topics.slice(0, showMoreTopics ? undefined : 8).map(topic => (
                          <button
                            key={topic.name}
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors',
                              isDark
                                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            )}
                            title={`${topic.count} documents`}
                          >
                            {topic.name}
                            <span className="text-[9px] opacity-60">({topic.count})</span>
                          </button>
                        ))}
                      </div>
                      {topics.length > 8 && (
                        <button
                          onClick={() => setShowMoreTopics(!showMoreTopics)}
                          className={cn(
                            'text-[10px] px-2 py-1 mt-1',
                            isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-700'
                          )}
                        >
                          {showMoreTopics ? '← Show less' : `Show ${topics.length - 8} more →`}
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Built-in Supertags */}
            {builtInSchemas.length > 0 && (
              <div>
                <button
                  onClick={() => setShowBuiltIn(!showBuiltIn)}
                  className={cn(
                    'flex items-center gap-1.5 w-full px-1.5 py-0.5 rounded text-left',
                    isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
                  )}
                >
                  {showBuiltIn ? (
                    <ChevronDown className="w-3 h-3 text-zinc-500" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-zinc-500" />
                  )}
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span className={cn(
                    'text-[10px] font-medium flex-1',
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  )}>
                    Built-in
                  </span>
                  <span className="text-[9px] text-zinc-500">
                    {builtInSchemas.length}
                  </span>
                </button>

                <AnimatePresence>
                  {showBuiltIn && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-0.5"
                    >
                      <div className="space-y-0.5 max-h-48 overflow-y-auto">
                      {builtInSchemas.map(schema => (
                        <SupertagCard
                          key={schema.id}
                          schema={schema}
                          theme={theme}
                          onApply={selectedBlockId ? () => onApplySupertag?.(schema) : undefined}
                          onEdit={() => onOpenDesigner?.(schema)}
                          onViewItems={onViewItems ? () => onViewItems(schema) : undefined}
                          usageCount={usageCounts[schema.id] || 0}
                          canDelete={false}
                          draggable={enableTagDrag}
                          onDragStart={(e) => handleTagDragStart(e, schema.tagName, true)}
                        />
                      ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Custom Supertags */}
            {customSchemas.length > 0 && (
              <div>
                <button
                  onClick={() => setShowCustom(!showCustom)}
                  className={cn(
                    'flex items-center gap-1.5 w-full px-1.5 py-0.5 rounded text-left',
                    isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
                  )}
                >
                  {showCustom ? (
                    <ChevronDown className="w-3 h-3 text-zinc-500" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-zinc-500" />
                  )}
                  <Sparkles className="w-3 h-3 text-purple-500" />
                  <span className={cn(
                    'text-[10px] font-medium flex-1',
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  )}>
                    Custom
                  </span>
                  <span className="text-[9px] text-zinc-500">
                    {customSchemas.length}
                  </span>
                </button>

                <AnimatePresence>
                  {showCustom && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-0.5"
                    >
                      <div className="space-y-0.5 max-h-48 overflow-y-auto">
                      {customSchemas.map(schema => (
                        <SupertagCard
                          key={schema.id}
                          schema={schema}
                          theme={theme}
                          onApply={selectedBlockId ? () => onApplySupertag?.(schema) : undefined}
                          onEdit={() => onOpenDesigner?.(schema)}
                          onViewItems={onViewItems ? () => onViewItems(schema) : undefined}
                          usageCount={usageCounts[schema.id] || 0}
                          onDelete={() => handleDelete(schema.id)}
                          draggable={enableTagDrag}
                          onDragStart={(e) => handleTagDragStart(e, schema.tagName, true)}
                        />
                      ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Subjects Section (last, hierarchical) */}
            {subjects.length > 0 && (
              <div>
                <button
                  onClick={() => setShowSubjects(!showSubjects)}
                  className={cn(
                    'flex items-center gap-1.5 w-full px-1.5 py-0.5 rounded text-left',
                    isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
                  )}
                >
                  {showSubjects ? (
                    <ChevronDown className="w-3 h-3 text-zinc-500" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-zinc-500" />
                  )}
                  <Icons.Target className="w-3 h-3 text-violet-500" />
                  <span className={cn(
                    'text-[10px] font-medium flex-1',
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  )}>
                    Subjects
                  </span>
                  <span className="text-[9px] text-zinc-500">
                    {subjects.length}
                  </span>
                </button>

                <AnimatePresence>
                  {showSubjects && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-1"
                    >
                      <div className="space-y-0.5 px-1">
                        {subjects.slice(0, showMoreSubjects ? undefined : 6).map(subject => (
                          <button
                            key={subject.name}
                            className={cn(
                              'flex items-center gap-2 w-full px-2 py-1 rounded text-left transition-colors',
                              isDark
                                ? 'hover:bg-zinc-800 text-zinc-300'
                                : 'hover:bg-zinc-100 text-zinc-700'
                            )}
                            title={`${subject.count} documents`}
                          >
                            <span className="text-violet-500 text-[10px]">└─</span>
                            <span className="text-[10px] font-medium flex-1">{subject.name}</span>
                            <span className={cn(
                              'text-[9px] px-1.5 py-0.5 rounded-full',
                              isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-600'
                            )}>
                              {subject.count}
                            </span>
                          </button>
                        ))}
                      </div>
                      {subjects.length > 6 && (
                        <button
                          onClick={() => setShowMoreSubjects(!showMoreSubjects)}
                          className={cn(
                            'text-[10px] px-2 py-1 mt-1',
                            isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-700'
                          )}
                        >
                          {showMoreSubjects ? '← Show less' : `Show ${subjects.length - 6} more →`}
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Empty State */}
            {filteredSchemas.length === 0 && lightweightTags.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 px-4">
                {searchQuery ? (
                  <>
                    <Search className={cn(
                      'w-8 h-8 mb-2',
                      isDark ? 'text-zinc-700' : 'text-zinc-300'
                    )} />
                    <p className="text-xs text-zinc-500 text-center">
                      No tags match "{searchQuery}"
                    </p>
                  </>
                ) : (
                  <>
                    <Tag className={cn(
                      'w-10 h-10 mb-3',
                      isDark ? 'text-zinc-700' : 'text-zinc-300'
                    )} />
                    <p className={cn(
                      'text-xs text-center mb-1',
                      isDark ? 'text-zinc-400' : 'text-zinc-600'
                    )}>
                      No tags yet
                    </p>
                    <p className="text-[10px] text-zinc-500 text-center mb-4">
                      Add tags to your content or create a supertag schema
                    </p>
                    <button
                      onClick={() => onOpenDesigner?.()}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                        'bg-amber-500 hover:bg-amber-600 text-white'
                      )}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Create Supertag
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className={cn(
        'px-3 py-3 border-t mt-auto space-y-2',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        {/* Open Full Page Button - Prominent */}
        <a
          href={resolvePath('/quarry/tags')}
          onClick={(e) => {
            if (onViewAllTags) {
              e.preventDefault()
              onViewAllTags()
            }
          }}
          className={cn(
            'flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg text-xs font-medium',
            'transition-colors',
            'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-sm'
          )}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open Full Tags Browser
        </a>
        <button
          onClick={() => onOpenDesigner?.()}
          className={cn(
            'flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg text-xs font-medium',
            'transition-colors',
            isDark
              ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
          )}
        >
          <Settings className="w-3.5 h-3.5" />
          Manage Schemas
        </button>
      </div>
    </div>
  )
}

export default SupertagsSidebarPanel
