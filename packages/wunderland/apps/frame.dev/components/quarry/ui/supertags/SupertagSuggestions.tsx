/**
 * Supertag Suggestions Component
 * @module codex/ui/SupertagSuggestions
 *
 * @description
 * Displays vocabulary-based supertag suggestions for content.
 * Uses the vocabulary classification system to suggest relevant supertags
 * based on subjects, topics, skills, and difficulty detected in content.
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Icons from 'lucide-react'
import {
  suggestSupertags,
  suggestSupertagsFromClassification,
  type SupertagSuggestion,
} from '@/lib/supertags/vocabularyIntegration'
import { getSchemaByTagName, type SupertagSchema } from '@/lib/supertags'
import { getVocabularyService, type ClassificationResult } from '@/lib/indexer/vocabularyService'
import { cn } from '@/lib/utils'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface SupertagSuggestionsProps {
  /** Content to analyze for suggestions */
  content: string
  /** Pre-computed classification result (optional, skips classification) */
  classification?: ClassificationResult
  /** Called when a supertag is selected */
  onSelect?: (tagName: string, schema: SupertagSchema | null) => void
  /** Called when suggestions are ready */
  onSuggestionsReady?: (suggestions: SupertagSuggestion[]) => void
  /** Maximum number of suggestions to show */
  maxSuggestions?: number
  /** Minimum confidence threshold (0-1) */
  minConfidence?: number
  /** Display mode */
  mode?: 'inline' | 'panel' | 'dropdown'
  /** Theme for styling */
  theme?: 'light' | 'dark'
  /** Show loading state */
  showLoading?: boolean
  /** Additional class names */
  className?: string
}

interface EnrichedSuggestion extends SupertagSuggestion {
  schema: SupertagSchema | null
  icon: React.ElementType
  color: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

function getIconComponent(iconName?: string): React.ElementType {
  if (!iconName) return Icons.Tag
  const IconsRecord = Icons as unknown as Record<string, React.ElementType>
  const Icon = IconsRecord[iconName]
  return Icon || Icons.Tag
}

function formatConfidence(confidence: number): string {
  return Math.round(confidence * 100) + '%'
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-emerald-400'
  if (confidence >= 0.6) return 'text-amber-400'
  return 'text-zinc-400'
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function SupertagSuggestions({
  content,
  classification: providedClassification,
  onSelect,
  onSuggestionsReady,
  maxSuggestions = 5,
  minConfidence = 0.3,
  mode = 'inline',
  theme = 'dark',
  showLoading = true,
  className,
}: SupertagSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<EnrichedSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const isDark = theme === 'dark'

  // Load suggestions
  useEffect(() => {
    let cancelled = false

    async function loadSuggestions() {
      if (!content.trim()) {
        setSuggestions([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Get raw suggestions
        let rawSuggestions: SupertagSuggestion[]

        if (providedClassification) {
          // Use provided classification
          rawSuggestions = suggestSupertagsFromClassification(providedClassification)
        } else {
          // Classify content first
          rawSuggestions = await suggestSupertags(content)
        }

        if (cancelled) return

        // Filter by confidence and limit
        const filteredSuggestions = rawSuggestions
          .filter(s => s.confidence >= minConfidence)
          .slice(0, maxSuggestions)

        // Enrich with schema data
        const enrichedSuggestions = await Promise.all(
          filteredSuggestions.map(async (suggestion) => {
            const schema = await getSchemaByTagName(suggestion.tagName)
            return {
              ...suggestion,
              schema,
              icon: getIconComponent(schema?.icon),
              color: schema?.color || '#71717a',
            }
          })
        )

        if (cancelled) return

        setSuggestions(enrichedSuggestions)
        onSuggestionsReady?.(filteredSuggestions)
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load supertag suggestions:', err)
          setError('Failed to analyze content')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadSuggestions()

    return () => { cancelled = true }
  }, [content, providedClassification, maxSuggestions, minConfidence, onSuggestionsReady])

  // Handle selection
  const handleSelect = useCallback((suggestion: EnrichedSuggestion, index: number) => {
    setSelectedIndex(index)
    onSelect?.(suggestion.tagName, suggestion.schema)
  }, [onSelect])

  // Loading state
  if (loading && showLoading) {
    return (
      <div className={cn(
        'flex items-center gap-2 text-sm',
        isDark ? 'text-zinc-500' : 'text-zinc-400',
        className
      )}>
        <Icons.Loader2 className="w-4 h-4 animate-spin" />
        <span>Analyzing content...</span>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn(
        'flex items-center gap-2 text-sm text-red-400',
        className
      )}>
        <Icons.AlertCircle className="w-4 h-4" />
        <span>{error}</span>
      </div>
    )
  }

  // No suggestions
  if (suggestions.length === 0) {
    if (!showLoading) return null
    return (
      <div className={cn(
        'flex items-center gap-2 text-sm',
        isDark ? 'text-zinc-600' : 'text-zinc-400',
        className
      )}>
        <Icons.Tag className="w-4 h-4" />
        <span>No supertag suggestions</span>
      </div>
    )
  }

  // Inline mode
  if (mode === 'inline') {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        <AnimatePresence mode="popLayout">
          {suggestions.map((suggestion, index) => {
            const Icon = suggestion.icon
            const isSelected = selectedIndex === index

            return (
              <motion.button
                key={suggestion.tagName}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs',
                  'border transition-all',
                  isSelected
                    ? 'ring-2 ring-offset-2'
                    : 'hover:ring-1 hover:ring-white/20',
                  isDark
                    ? 'ring-offset-zinc-900'
                    : 'ring-offset-white'
                )}
                style={{
                  backgroundColor: suggestion.color + '15',
                  borderColor: suggestion.color + '40',
                  color: suggestion.color,
                  ...(isSelected && { ringColor: suggestion.color })
                }}
                onClick={() => handleSelect(suggestion, index)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                title={suggestion.reason}
              >
                <Icon className="w-3 h-3" />
                <span className="font-medium">#{suggestion.tagName}</span>
                <span className={cn('text-[10px] opacity-70', getConfidenceColor(suggestion.confidence))}>
                  {formatConfidence(suggestion.confidence)}
                </span>
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>
    )
  }

  // Panel mode
  if (mode === 'panel') {
    return (
      <div className={cn(
        'rounded-lg border overflow-hidden',
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200',
        className
      )}>
        {/* Header */}
        <div className={cn(
          'flex items-center gap-2 px-3 py-2 border-b',
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        )}>
          <Icons.Sparkles className={cn(
            'w-4 h-4',
            isDark ? 'text-violet-400' : 'text-violet-500'
          )} />
          <span className={cn(
            'text-sm font-medium',
            isDark ? 'text-zinc-300' : 'text-zinc-700'
          )}>
            Suggested Supertags
          </span>
          <span className={cn(
            'text-xs',
            isDark ? 'text-zinc-600' : 'text-zinc-400'
          )}>
            Based on content analysis
          </span>
        </div>

        {/* Suggestions list */}
        <div className="divide-y divide-zinc-800/50">
          {suggestions.map((suggestion, index) => {
            const Icon = suggestion.icon
            const isSelected = selectedIndex === index

            return (
              <motion.button
                key={suggestion.tagName}
                className={cn(
                  'w-full flex items-start gap-3 p-3 text-left transition-colors',
                  isDark
                    ? isSelected
                      ? 'bg-zinc-800'
                      : 'hover:bg-zinc-800/50'
                    : isSelected
                      ? 'bg-zinc-100'
                      : 'hover:bg-zinc-50'
                )}
                onClick={() => handleSelect(suggestion, index)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {/* Icon */}
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: suggestion.color + '20' }}
                >
                  <Icon className="w-4 h-4" style={{ color: suggestion.color }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-medium text-sm"
                      style={{ color: suggestion.color }}
                    >
                      #{suggestion.schema?.displayName || suggestion.tagName}
                    </span>
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded',
                      getConfidenceColor(suggestion.confidence),
                      isDark ? 'bg-zinc-800' : 'bg-zinc-100'
                    )}>
                      {formatConfidence(suggestion.confidence)} match
                    </span>
                  </div>
                  <p className={cn(
                    'text-xs mt-1 line-clamp-2',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}>
                    {suggestion.reason}
                  </p>
                </div>

                {/* Apply arrow */}
                <Icons.ChevronRight className={cn(
                  'flex-shrink-0 w-4 h-4 mt-2',
                  isDark ? 'text-zinc-600' : 'text-zinc-400'
                )} />
              </motion.button>
            )
          })}
        </div>
      </div>
    )
  }

  // Dropdown mode
  return (
    <div className={cn(
      'rounded-lg border shadow-lg overflow-hidden',
      isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200',
      className
    )}>
      <div className={cn(
        'px-3 py-2 text-xs',
        isDark ? 'text-zinc-500 bg-zinc-800/50' : 'text-zinc-400 bg-zinc-50'
      )}>
        <Icons.Sparkles className="w-3 h-3 inline mr-1.5" />
        Suggested supertags
      </div>
      <div className="py-1">
        {suggestions.map((suggestion, index) => {
          const Icon = suggestion.icon
          const isSelected = selectedIndex === index

          return (
            <button
              key={suggestion.tagName}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                isDark
                  ? isSelected
                    ? 'bg-zinc-800'
                    : 'hover:bg-zinc-800/50'
                  : isSelected
                    ? 'bg-zinc-100'
                    : 'hover:bg-zinc-50'
              )}
              onClick={() => handleSelect(suggestion, index)}
            >
              <Icon className="w-4 h-4" style={{ color: suggestion.color }} />
              <span style={{ color: suggestion.color }}>
                #{suggestion.tagName}
              </span>
              <span className={cn(
                'ml-auto text-xs',
                getConfidenceColor(suggestion.confidence)
              )}>
                {formatConfidence(suggestion.confidence)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPACT SUGGESTION PILLS
═══════════════════════════════════════════════════════════════════════════ */

export interface SupertagSuggestionPillsProps {
  /** Content to analyze */
  content: string
  /** Called when a pill is clicked */
  onSelect?: (tagName: string) => void
  /** Maximum number of pills */
  maxPills?: number
  /** Additional class names */
  className?: string
}

export function SupertagSuggestionPills({
  content,
  onSelect,
  maxPills = 3,
  className,
}: SupertagSuggestionPillsProps) {
  const [suggestions, setSuggestions] = useState<SupertagSuggestion[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!content.trim()) {
        setSuggestions([])
        return
      }

      try {
        const results = await suggestSupertags(content)
        if (!cancelled) {
          setSuggestions(results.slice(0, maxPills))
        }
      } catch (error) {
        console.error('Failed to get suggestions:', error)
      }
    }

    load()
    return () => { cancelled = true }
  }, [content, maxPills])

  if (suggestions.length === 0) return null

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Icons.Sparkles className="w-3 h-3 text-violet-400" />
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.tagName}
          className="text-xs text-violet-400 hover:text-violet-300 hover:underline"
          onClick={() => onSelect?.(suggestion.tagName)}
        >
          #{suggestion.tagName}
        </button>
      ))}
    </div>
  )
}

export default SupertagSuggestions
