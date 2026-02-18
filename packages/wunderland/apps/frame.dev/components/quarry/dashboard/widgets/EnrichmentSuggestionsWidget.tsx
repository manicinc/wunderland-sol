/**
 * Enrichment Suggestions Widget
 *
 * Dashboard widget showing AI/NLP-powered enrichment suggestions
 * across recent documents. Implements Embark-style proactive suggestions.
 *
 * @module components/quarry/dashboard/widgets/EnrichmentSuggestionsWidget
 */

'use client'

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
  ChevronRight,
  Loader2,
  FileText,
  ArrowRight,
  Lightbulb,
  Map,
  Calendar,
  Table,
  BarChart3,
  List,
  Zap,
} from 'lucide-react'
import { getRecentlyRead, type ReadingProgressRecord } from '@/lib/codexDatabase'
import type { WidgetProps } from '../types'
import { cn } from '@/lib/utils'

interface DocumentSuggestion {
  path: string
  title: string
  suggestions: {
    tags: string[]
    hasViewSuggestions: boolean
    hasCategorySuggestion: boolean
  }
  lastAnalyzed?: Date
}

const VIEW_ICONS: Record<string, React.ElementType> = {
  map: Map,
  calendar: Calendar,
  table: Table,
  chart: BarChart3,
  list: List,
}

export function EnrichmentSuggestionsWidget({
  theme,
  size,
  onNavigate,
  compact = false,
}: WidgetProps) {
  const isDark = theme.includes('dark')
  const [documentSuggestions, setDocumentSuggestions] = useState<DocumentSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'tags' | 'views'>('all')

  // Simulated enrichment analysis for recent documents
  const analyzeRecentDocuments = useCallback(async () => {
    setIsLoading(true)
    try {
      const recent = await getRecentlyRead(compact ? 3 : 5)

      // Simulate enrichment analysis for each document
      const suggestions: DocumentSuggestion[] = await Promise.all(
        recent.map(async (record): Promise<DocumentSuggestion> => {
          const parts = record.path.split('/')
          const fileName = parts[parts.length - 1]
          const title = fileName.replace(/\.mdx?$/, '').replace(/-/g, ' ')

          // Simulated suggestions based on path/title patterns
          // In a real implementation, this would use the NLP module
          const suggestedTags: string[] = []
          const lowerTitle = title.toLowerCase()

          if (lowerTitle.includes('typescript') || lowerTitle.includes('javascript')) {
            suggestedTags.push('programming')
          }
          if (lowerTitle.includes('react') || lowerTitle.includes('vue') || lowerTitle.includes('angular')) {
            suggestedTags.push('frontend')
          }
          if (lowerTitle.includes('api') || lowerTitle.includes('rest') || lowerTitle.includes('graphql')) {
            suggestedTags.push('api')
          }
          if (lowerTitle.includes('database') || lowerTitle.includes('sql')) {
            suggestedTags.push('database')
          }
          if (lowerTitle.includes('test') || lowerTitle.includes('testing')) {
            suggestedTags.push('testing')
          }
          if (lowerTitle.includes('design') || lowerTitle.includes('ui') || lowerTitle.includes('ux')) {
            suggestedTags.push('design')
          }

          // Add some randomized suggestions for demo
          const possibleTags = ['documentation', 'tutorial', 'reference', 'guide', 'notes']
          if (Math.random() > 0.5 && suggestedTags.length < 3) {
            suggestedTags.push(possibleTags[Math.floor(Math.random() * possibleTags.length)])
          }

          return {
            path: record.path,
            title: title.charAt(0).toUpperCase() + title.slice(1),
            suggestions: {
              tags: suggestedTags.slice(0, 3),
              hasViewSuggestions: Math.random() > 0.6,
              hasCategorySuggestion: Math.random() > 0.7,
            },
            lastAnalyzed: new Date(),
          }
        })
      )

      // Filter to only show documents with suggestions
      const withSuggestions = suggestions.filter(
        s => s.suggestions.tags.length > 0 ||
            s.suggestions.hasViewSuggestions ||
            s.suggestions.hasCategorySuggestion
      )

      setDocumentSuggestions(withSuggestions)
    } catch (error) {
      console.error('[EnrichmentSuggestionsWidget] Error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [compact])

  useEffect(() => {
    analyzeRecentDocuments()
  }, [analyzeRecentDocuments])

  // Statistics
  const stats = useMemo(() => ({
    totalDocs: documentSuggestions.length,
    totalTags: documentSuggestions.reduce((sum, doc) => sum + doc.suggestions.tags.length, 0),
    docsWithViews: documentSuggestions.filter(d => d.suggestions.hasViewSuggestions).length,
    docsWithCategory: documentSuggestions.filter(d => d.suggestions.hasCategorySuggestion).length,
  }), [documentSuggestions])

  if (isLoading) {
    return (
      <div className={cn(
        'flex items-center justify-center gap-2 py-8',
        isDark ? 'text-zinc-500' : 'text-zinc-400'
      )}>
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Analyzing documents...</span>
      </div>
    )
  }

  if (documentSuggestions.length === 0) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center py-8 text-center',
        isDark ? 'text-zinc-500' : 'text-zinc-400'
      )}>
        <Lightbulb className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm mb-3">No enrichment suggestions</p>
        <button
          onClick={analyzeRecentDocuments}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors',
            isDark
              ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
          )}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {documentSuggestions.slice(0, 3).map((doc, index) => (
          <motion.button
            key={doc.path}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onNavigate(doc.path)}
            className={cn(
              'w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors group',
              isDark
                ? 'bg-zinc-800/50 hover:bg-zinc-800'
                : 'bg-zinc-50 hover:bg-zinc-100'
            )}
          >
            <Sparkles className={cn(
              'w-4 h-4 flex-shrink-0',
              isDark ? 'text-purple-400' : 'text-purple-500'
            )} />
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-sm font-medium truncate',
                isDark ? 'text-zinc-200' : 'text-zinc-800'
              )}>
                {doc.title}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {doc.suggestions.tags.length > 0 && (
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full',
                    isDark ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'
                  )}>
                    {doc.suggestions.tags.length} tags
                  </span>
                )}
                {doc.suggestions.hasViewSuggestions && (
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full',
                    isDark ? 'bg-cyan-900/50 text-cyan-300' : 'bg-cyan-100 text-cyan-700'
                  )}>
                    views
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className={cn(
              'w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity',
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            )} />
          </motion.button>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-2">
        <div className={cn(
          'p-2 rounded-lg text-center',
          isDark ? 'bg-purple-950/30' : 'bg-purple-50'
        )}>
          <p className={cn(
            'text-lg font-bold',
            isDark ? 'text-purple-300' : 'text-purple-700'
          )}>
            {stats.totalDocs}
          </p>
          <p className={cn(
            'text-[10px]',
            isDark ? 'text-purple-400' : 'text-purple-600'
          )}>
            Docs
          </p>
        </div>
        <div className={cn(
          'p-2 rounded-lg text-center',
          isDark ? 'bg-purple-950/30' : 'bg-purple-50'
        )}>
          <p className={cn(
            'text-lg font-bold',
            isDark ? 'text-purple-300' : 'text-purple-700'
          )}>
            {stats.totalTags}
          </p>
          <p className={cn(
            'text-[10px]',
            isDark ? 'text-purple-400' : 'text-purple-600'
          )}>
            Tags
          </p>
        </div>
        <div className={cn(
          'p-2 rounded-lg text-center',
          isDark ? 'bg-cyan-950/30' : 'bg-cyan-50'
        )}>
          <p className={cn(
            'text-lg font-bold',
            isDark ? 'text-cyan-300' : 'text-cyan-700'
          )}>
            {stats.docsWithViews}
          </p>
          <p className={cn(
            'text-[10px]',
            isDark ? 'text-cyan-400' : 'text-cyan-600'
          )}>
            Views
          </p>
        </div>
        <div className={cn(
          'p-2 rounded-lg text-center',
          isDark ? 'bg-amber-950/30' : 'bg-amber-50'
        )}>
          <p className={cn(
            'text-lg font-bold',
            isDark ? 'text-amber-300' : 'text-amber-700'
          )}>
            {stats.docsWithCategory}
          </p>
          <p className={cn(
            'text-[10px]',
            isDark ? 'text-amber-400' : 'text-amber-600'
          )}>
            Move
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className={cn(
        'flex gap-1 p-1 rounded-lg',
        isDark ? 'bg-zinc-800' : 'bg-zinc-100'
      )}>
        {(['all', 'tags', 'views'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors',
              activeTab === tab
                ? isDark
                  ? 'bg-zinc-700 text-white'
                  : 'bg-white text-zinc-900 shadow-sm'
                : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-zinc-600 hover:text-zinc-800'
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Document List */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {documentSuggestions
            .filter(doc => {
              if (activeTab === 'all') return true
              if (activeTab === 'tags') return doc.suggestions.tags.length > 0
              if (activeTab === 'views') return doc.suggestions.hasViewSuggestions
              return true
            })
            .map((doc, index) => (
              <motion.div
                key={doc.path}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.03 }}
                className={cn(
                  'p-3 rounded-lg border transition-colors',
                  isDark
                    ? 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'
                    : 'bg-white border-zinc-200 hover:bg-zinc-50'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => onNavigate(doc.path)}
                      className={cn(
                        'text-sm font-medium truncate hover:underline text-left',
                        isDark ? 'text-zinc-200' : 'text-zinc-800'
                      )}
                    >
                      {doc.title}
                    </button>

                    {/* Tag Suggestions */}
                    {doc.suggestions.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {doc.suggestions.tags.map(tag => (
                          <span
                            key={tag}
                            className={cn(
                              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px]',
                              isDark
                                ? 'bg-purple-900/50 text-purple-300'
                                : 'bg-purple-100 text-purple-700'
                            )}
                          >
                            <Tag className="w-2.5 h-2.5" />
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* View & Category indicators */}
                    <div className="flex items-center gap-2 mt-2">
                      {doc.suggestions.hasViewSuggestions && (
                        <span className={cn(
                          'inline-flex items-center gap-1 text-[10px]',
                          isDark ? 'text-cyan-400' : 'text-cyan-600'
                        )}>
                          <LayoutGrid className="w-3 h-3" />
                          View available
                        </span>
                      )}
                      {doc.suggestions.hasCategorySuggestion && (
                        <span className={cn(
                          'inline-flex items-center gap-1 text-[10px]',
                          isDark ? 'text-amber-400' : 'text-amber-600'
                        )}>
                          <FolderTree className="w-3 h-3" />
                          Move suggested
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigate(doc.path)}
                    className={cn(
                      'p-1.5 rounded-md transition-colors flex-shrink-0',
                      isDark
                        ? 'hover:bg-zinc-700 text-zinc-400'
                        : 'hover:bg-zinc-200 text-zinc-500'
                    )}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
        </AnimatePresence>
      </div>

      {/* Refresh */}
      <div className="flex justify-between items-center pt-2 border-t border-zinc-200 dark:border-zinc-700">
        <span className={cn(
          'text-[10px]',
          isDark ? 'text-zinc-500' : 'text-zinc-400'
        )}>
          Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <button
          onClick={analyzeRecentDocuments}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors',
            isDark
              ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
          )}
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>
    </div>
  )
}

export default EnrichmentSuggestionsWidget

