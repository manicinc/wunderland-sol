'use client'

/**
 * EnrichmentSuggestions Component
 * @module quarry/ui/enrichment
 *
 * Displays AI/NLP-powered enrichment suggestions for a document:
 * - Suggested tags based on content analysis
 * - Category recommendation with confidence
 * - Related documents
 * - Suggested embeddable views
 *
 * This component integrates with the Embark-style document enrichment system.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Tag,
  FolderTree,
  Link2,
  LayoutGrid,
  RefreshCw,
  Check,
  X,
  ChevronRight,
  Loader2,
  AlertCircle,
  Map,
  Calendar,
  Table,
  BarChart3,
  List,
  Lightbulb,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  showEnrichmentApplied,
  showEnrichmentDismissed,
  showEnrichmentSuggestions as showToastSuggestions,
  showAnalysisComplete,
  showViewRendered,
} from '@/lib/enrichment/toasts'

// Types for enrichment suggestions
export interface TagSuggestion {
  tag: string
  confidence: number
  source: 'nlp' | 'ai' | 'existing'
}

export interface CategorySuggestion {
  category: string
  confidence: number
  reasoning: string
  alternatives?: Array<{ category: string; confidence: number }>
}

export interface RelatedDocument {
  path: string
  title: string
  reason: string
  type: 'prerequisite' | 'reference' | 'similar'
}

export interface ViewSuggestion {
  type: 'map' | 'calendar' | 'table' | 'chart' | 'list'
  reason: string
  dataCount: number
}

export interface EnrichmentData {
  suggestedTags: TagSuggestion[]
  categorySuggestion?: CategorySuggestion
  relatedDocuments: RelatedDocument[]
  suggestedViews: ViewSuggestion[]
  lastAnalyzed?: Date
  isLoading?: boolean
  error?: string
}

interface EnrichmentSuggestionsProps {
  strandPath: string
  content: string
  existingTags?: string[]
  onApplyTag?: (tag: string) => void
  onApplyCategory?: (category: string) => void
  onNavigateToDocument?: (path: string) => void
  onInsertView?: (viewType: string) => void
  theme?: 'light' | 'dark' | 'system'
  compact?: boolean
  panelSize?: 's' | 'm' | 'l'
}

const VIEW_ICONS: Record<string, React.ElementType> = {
  map: Map,
  calendar: Calendar,
  table: Table,
  chart: BarChart3,
  list: List,
}

const VIEW_LABELS: Record<string, string> = {
  map: 'Map View',
  calendar: 'Calendar View',
  table: 'Table View',
  chart: 'Chart View',
  list: 'List View',
}

export function EnrichmentSuggestions({
  strandPath,
  content,
  existingTags = [],
  onApplyTag,
  onApplyCategory,
  onNavigateToDocument,
  onInsertView,
  theme = 'system',
  compact = false,
  panelSize = 'm',
}: EnrichmentSuggestionsProps) {
  const [enrichmentData, setEnrichmentData] = useState<EnrichmentData>({
    suggestedTags: [],
    relatedDocuments: [],
    suggestedViews: [],
    isLoading: false,
  })
  const [appliedTags, setAppliedTags] = useState<Set<string>>(new Set())
  const [dismissedTags, setDismissedTags] = useState<Set<string>>(new Set())
  const [categoryApplied, setCategoryApplied] = useState(false)

  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  const textSizeClasses = useMemo(() => ({
    base: panelSize === 'l' ? 'text-sm' : panelSize === 'm' ? 'text-xs' : 'text-[10px]',
    sm: panelSize === 'l' ? 'text-xs' : panelSize === 'm' ? 'text-[10px]' : 'text-[9px]',
    xs: panelSize === 'l' ? 'text-[10px]' : panelSize === 'm' ? 'text-[9px]' : 'text-[8px]',
  }), [panelSize])

  // Fetch enrichment suggestions
  const fetchSuggestions = useCallback(async () => {
    if (!content || content.length < 50) return

    setEnrichmentData(prev => ({ ...prev, isLoading: true, error: undefined }))

    try {
      // Import NLP functions dynamically to avoid SSR issues
      const { suggestTags, classifyContentType, extractKeywords } = await import('@/lib/nlp')

      // Get tag suggestions
      const rawTags = suggestTags(content, existingTags)
      const suggestedTags: TagSuggestion[] = rawTags
        .filter(tag => !existingTags.includes(tag))
        .slice(0, 5)
        .map((tag, idx) => ({
          tag,
          confidence: Math.max(0.5, 1 - idx * 0.1),
          source: 'nlp' as const,
        }))

      // Analyze content type for view suggestions
      const contentType = classifyContentType(content)
      const suggestedViews: ViewSuggestion[] = []

      // Check for place data (coordinates, locations)
      const hasPlaceData = /\b(latitude|longitude|lat|lng|coordinates?|location|address|map)\b/i.test(content)
      if (hasPlaceData) {
        suggestedViews.push({
          type: 'map',
          reason: 'Contains location/coordinate data',
          dataCount: (content.match(/\b(lat|lng|location)\b/gi) || []).length,
        })
      }

      // Check for date/event data
      const hasDateData = /\b(date|event|schedule|deadline|due|meeting|appointment)\b/i.test(content)
      if (hasDateData) {
        suggestedViews.push({
          type: 'calendar',
          reason: 'Contains date/event data',
          dataCount: (content.match(/\d{4}-\d{2}-\d{2}|\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi) || []).length,
        })
      }

      // Check for structured data (lists, tables)
      const listMatches = content.match(/^[\s]*[-*+]\s/gm) || []
      const tableMatches = content.match(/\|.*\|/g) || []
      if (listMatches.length > 3 || tableMatches.length > 2) {
        suggestedViews.push({
          type: 'table',
          reason: 'Contains structured list/table data',
          dataCount: listMatches.length + tableMatches.length,
        })
      }

      // Check for numerical data (potential charts)
      const numberMatches = content.match(/\b\d+(\.\d+)?%?|\$\d+/g) || []
      if (numberMatches.length > 5) {
        suggestedViews.push({
          type: 'chart',
          reason: 'Contains numerical data suitable for visualization',
          dataCount: numberMatches.length,
        })
      }

      // Simple category suggestion based on content type
      const categorySuggestion: CategorySuggestion | undefined = contentType ? {
        category: `weaves/${contentType.primary.toLowerCase()}/`,
        confidence: contentType.confidence,
        reasoning: `Content classified as ${contentType.primary}`,
        alternatives: [],
      } : undefined

      setEnrichmentData({
        suggestedTags,
        categorySuggestion,
        relatedDocuments: [], // Would be populated by actual search
        suggestedViews,
        lastAnalyzed: new Date(),
        isLoading: false,
      })

      // Show toast notification for new suggestions
      const totalSuggestions = suggestedTags.length + suggestedViews.length + (categorySuggestion ? 1 : 0)
      if (totalSuggestions > 0) {
        const categories: Array<'tags' | 'categories' | 'views' | 'related'> = []
        if (suggestedTags.length > 0) categories.push('tags')
        if (categorySuggestion) categories.push('categories')
        if (suggestedViews.length > 0) categories.push('views')
        
        showToastSuggestions({
          strandPath,
          count: totalSuggestions,
          categories,
        })
      }
    } catch (error) {
      console.error('[EnrichmentSuggestions] Error fetching suggestions:', error)
      setEnrichmentData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to analyze document',
      }))
    }
  }, [content, existingTags])

  // Fetch on mount and content change
  useEffect(() => {
    const timer = setTimeout(fetchSuggestions, 500) // Debounce
    return () => clearTimeout(timer)
  }, [fetchSuggestions])

  const handleApplyTag = (tag: string) => {
    setAppliedTags(prev => new Set([...prev, tag]))
    onApplyTag?.(tag)
    showEnrichmentApplied('tag', tag)
  }

  const handleDismissTag = (tag: string) => {
    setDismissedTags(prev => new Set([...prev, tag]))
    showEnrichmentDismissed(1)
  }

  const handleApplyCategory = () => {
    if (enrichmentData.categorySuggestion) {
      setCategoryApplied(true)
      onApplyCategory?.(enrichmentData.categorySuggestion.category)
      showEnrichmentApplied('category', enrichmentData.categorySuggestion.category)
    }
  }

  const handleInsertView = (viewType: string) => {
    onInsertView?.(viewType)
    showViewRendered(VIEW_LABELS[viewType] || viewType, 0)
  }

  const visibleTags = enrichmentData.suggestedTags.filter(
    t => !appliedTags.has(t.tag) && !dismissedTags.has(t.tag)
  )

  const hasAnySuggestions = visibleTags.length > 0 ||
    (enrichmentData.categorySuggestion && !categoryApplied) ||
    enrichmentData.suggestedViews.length > 0 ||
    enrichmentData.relatedDocuments.length > 0

  if (enrichmentData.isLoading) {
    return (
      <div className={cn(
        'flex items-center justify-center gap-2 py-4',
        textSizeClasses.base,
        isDark ? 'text-zinc-400' : 'text-zinc-500'
      )}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Analyzing document...</span>
      </div>
    )
  }

  if (enrichmentData.error) {
    return (
      <div className={cn(
        'flex items-center gap-2 py-2 px-3 rounded-md',
        textSizeClasses.sm,
        isDark ? 'bg-red-950/30 text-red-400' : 'bg-red-50 text-red-600'
      )}>
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{enrichmentData.error}</span>
        <button
          onClick={fetchSuggestions}
          className="ml-auto p-1 hover:bg-red-500/20 rounded"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
    )
  }

  if (!hasAnySuggestions) {
    return (
      <div className={cn(
        'flex items-center gap-2 py-3',
        textSizeClasses.sm,
        isDark ? 'text-zinc-500' : 'text-zinc-400'
      )}>
        <Lightbulb className="w-4 h-4" />
        <span>No suggestions at this time</span>
        <button
          onClick={fetchSuggestions}
          className={cn(
            'ml-auto p-1 rounded transition-colors',
            isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
          )}
          title="Refresh suggestions"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Tag Suggestions */}
      {visibleTags.length > 0 && (
        <div className="space-y-1.5">
          <div className={cn(
            'flex items-center gap-1.5',
            textSizeClasses.sm,
            isDark ? 'text-zinc-400' : 'text-zinc-600'
          )}>
            <Tag className="w-3 h-3" />
            <span className="font-medium">Suggested Tags</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <AnimatePresence mode="popLayout">
              {visibleTags.map((tagSugg) => (
                <motion.div
                  key={tagSugg.tag}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={cn(
                    'group flex items-center gap-1 px-2 py-0.5 rounded-full border transition-colors',
                    textSizeClasses.xs,
                    isDark
                      ? 'bg-purple-950/30 border-purple-800/50 text-purple-300 hover:bg-purple-900/40'
                      : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                  )}
                >
                  <span>#{tagSugg.tag}</span>
                  {onApplyTag && (
                    <button
                      onClick={() => handleApplyTag(tagSugg.tag)}
                      className={cn(
                        'p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity',
                        isDark ? 'hover:bg-purple-800' : 'hover:bg-purple-200'
                      )}
                      title="Apply tag"
                    >
                      <Check className="w-2.5 h-2.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDismissTag(tagSugg.tag)}
                    className={cn(
                      'p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity',
                      isDark ? 'hover:bg-purple-800' : 'hover:bg-purple-200'
                    )}
                    title="Dismiss"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Category Suggestion */}
      {enrichmentData.categorySuggestion && !categoryApplied && (
        <div className="space-y-1.5">
          <div className={cn(
            'flex items-center gap-1.5',
            textSizeClasses.sm,
            isDark ? 'text-zinc-400' : 'text-zinc-600'
          )}>
            <FolderTree className="w-3 h-3" />
            <span className="font-medium">Category Suggestion</span>
          </div>
          <div className={cn(
            'flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border',
            isDark
              ? 'bg-amber-950/30 border-amber-800/50'
              : 'bg-amber-50 border-amber-200'
          )}>
            <div className="flex-1 min-w-0">
              <p className={cn(
                'font-mono truncate',
                textSizeClasses.sm,
                isDark ? 'text-amber-300' : 'text-amber-700'
              )}>
                {enrichmentData.categorySuggestion.category}
              </p>
              <p className={cn(
                'truncate',
                textSizeClasses.xs,
                isDark ? 'text-amber-400/70' : 'text-amber-600/70'
              )}>
                {enrichmentData.categorySuggestion.reasoning}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <span className={cn(
                'px-1.5 py-0.5 rounded text-[10px] font-medium',
                isDark ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-700'
              )}>
                {Math.round(enrichmentData.categorySuggestion.confidence * 100)}%
              </span>
              {onApplyCategory && (
                <button
                  onClick={handleApplyCategory}
                  className={cn(
                    'p-1 rounded transition-colors',
                    isDark ? 'hover:bg-amber-800/50' : 'hover:bg-amber-200'
                  )}
                  title="Move to category"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Suggestions */}
      {enrichmentData.suggestedViews.length > 0 && (
        <div className="space-y-1.5">
          <div className={cn(
            'flex items-center gap-1.5',
            textSizeClasses.sm,
            isDark ? 'text-zinc-400' : 'text-zinc-600'
          )}>
            <LayoutGrid className="w-3 h-3" />
            <span className="font-medium">Suggested Views</span>
          </div>
          <div className="space-y-1">
            {enrichmentData.suggestedViews.map((view) => {
              const Icon = VIEW_ICONS[view.type] || LayoutGrid
              return (
                <button
                  key={view.type}
                  onClick={() => handleInsertView(view.type)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md border transition-colors text-left',
                    textSizeClasses.sm,
                    isDark
                      ? 'bg-cyan-950/30 border-cyan-800/50 hover:bg-cyan-900/40 text-cyan-300'
                      : 'bg-cyan-50 border-cyan-200 hover:bg-cyan-100 text-cyan-700'
                  )}
                  disabled={!onInsertView}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{VIEW_LABELS[view.type]}</p>
                    <p className={cn(
                      'truncate',
                      textSizeClasses.xs,
                      isDark ? 'text-cyan-400/70' : 'text-cyan-600/70'
                    )}>
                      {view.reason}
                    </p>
                  </div>
                  {view.dataCount > 0 && (
                    <span className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-medium',
                      isDark ? 'bg-cyan-900/50 text-cyan-300' : 'bg-cyan-100 text-cyan-700'
                    )}>
                      {view.dataCount} items
                    </span>
                  )}
                  <ChevronRight className="w-3 h-3 opacity-50" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Related Documents */}
      {enrichmentData.relatedDocuments.length > 0 && (
        <div className="space-y-1.5">
          <div className={cn(
            'flex items-center gap-1.5',
            textSizeClasses.sm,
            isDark ? 'text-zinc-400' : 'text-zinc-600'
          )}>
            <Link2 className="w-3 h-3" />
            <span className="font-medium">Related Documents</span>
          </div>
          <div className="space-y-1">
            {enrichmentData.relatedDocuments.slice(0, 3).map((doc) => (
              <button
                key={doc.path}
                onClick={() => onNavigateToDocument?.(doc.path)}
                className={cn(
                  'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md border transition-colors text-left',
                  textSizeClasses.sm,
                  isDark
                    ? 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 text-zinc-300'
                    : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-700'
                )}
                disabled={!onNavigateToDocument}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{doc.title}</p>
                  <p className={cn(
                    'truncate',
                    textSizeClasses.xs,
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}>
                    {doc.reason}
                  </p>
                </div>
                <ChevronRight className="w-3 h-3 opacity-50" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Refresh button */}
      <div className="flex justify-end pt-1 border-t border-zinc-200 dark:border-zinc-800">
        <button
          onClick={fetchSuggestions}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded transition-colors',
            textSizeClasses.xs,
            isDark
              ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
              : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
          )}
        >
          <RefreshCw className="w-3 h-3" />
          <span>Refresh</span>
          {enrichmentData.lastAnalyzed && (
            <span className="opacity-50">
              · {new Date(enrichmentData.lastAnalyzed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}

export default EnrichmentSuggestions

