/**
 * Insight Facts Component for Quarry Codex
 * @module components/quarry/ui/InsightFacts
 * 
 * @description
 * Displays entity-based insights derived from user's notes:
 * - Key entities (people, places, concepts)
 * - Connection suggestions
 * - Rediscovery prompts
 * 
 * Replaces generic activity-based random facts.
 */

'use client'

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, User, MapPin, Lightbulb, FolderKanban, Tag, Link2, Search, RefreshCw } from 'lucide-react'
import type { HistoryEntry } from '@/lib/localStorage'
import { getDailyInsights, type InsightFact } from '@/lib/codex/insightFacts'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface InsightFactsProps {
  /** View history from local storage */
  history: HistoryEntry[]
  /** Theme for styling */
  theme?: string
  /** Custom class name */
  className?: string
  /** Max facts to display */
  maxFacts?: number
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getCategoryIcon(category: InsightFact['category'], entityType?: InsightFact['entityType']) {
  // First check entity type
  if (entityType) {
    switch (entityType) {
      case 'person': return User
      case 'place': return MapPin
      case 'concept': return Lightbulb
      case 'project': return FolderKanban
      case 'topic': return Tag
    }
  }
  
  // Fall back to category
  switch (category) {
    case 'entity': return Sparkles
    case 'pattern': return RefreshCw
    case 'connection': return Link2
    case 'discovery': return Search
    case 'reminder': return RefreshCw
    default: return Sparkles
  }
}

function getCategoryColor(category: InsightFact['category'], isDark: boolean): string {
  switch (category) {
    case 'entity':
      return isDark ? 'text-amber-400' : 'text-amber-600'
    case 'connection':
      return isDark ? 'text-purple-400' : 'text-purple-600'
    case 'discovery':
      return isDark ? 'text-cyan-400' : 'text-cyan-600'
    case 'reminder':
      return isDark ? 'text-rose-400' : 'text-rose-600'
    default:
      return isDark ? 'text-emerald-400' : 'text-emerald-600'
  }
}

function getCategoryBg(category: InsightFact['category'], isDark: boolean): string {
  switch (category) {
    case 'entity':
      return isDark ? 'bg-amber-900/20' : 'bg-amber-50'
    case 'connection':
      return isDark ? 'bg-purple-900/20' : 'bg-purple-50'
    case 'discovery':
      return isDark ? 'bg-cyan-900/20' : 'bg-cyan-50'
    case 'reminder':
      return isDark ? 'bg-rose-900/20' : 'bg-rose-50'
    default:
      return isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function InsightFacts({
  history,
  theme = 'light',
  className = '',
  maxFacts = 3,
}: InsightFactsProps) {
  const isDark = theme?.includes('dark')
  
  // Get daily insights (cached for the day)
  const insights = useMemo(() => {
    const allInsights = getDailyInsights(history)
    return allInsights.slice(0, maxFacts)
  }, [history, maxFacts])
  
  // Don't render if no insights
  if (insights.length === 0) {
    return null
  }
  
  return (
    <div className={`space-y-2 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-1.5 px-1">
        <Sparkles className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
        <span className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Insights from your Codex
        </span>
      </div>
      
      {/* Insights List */}
      <div className="space-y-1.5">
        <AnimatePresence>
          {insights.map((insight, index) => (
            <InsightCard
              key={`${insight.category}-${insight.entityName || index}`}
              insight={insight}
              index={index}
              isDark={isDark}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function InsightCard({
  insight,
  index,
  isDark,
}: {
  insight: InsightFact
  index: number
  isDark: boolean
}) {
  const Icon = getCategoryIcon(insight.category, insight.entityType)
  const iconColor = getCategoryColor(insight.category, isDark)
  const bgColor = getCategoryBg(insight.category, isDark)
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className={`
        relative flex items-start gap-2 p-2.5 rounded-lg
        ${isDark ? 'bg-zinc-800/50 border border-zinc-700/50' : 'bg-white border border-zinc-100'}
        hover:shadow-md transition-shadow
        group
      `}
    >
      {/* Icon */}
      <div className={`
        flex-shrink-0 p-1.5 rounded-md
        ${bgColor}
      `}>
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
          {insight.text}
        </p>
        
        {/* Entity badge */}
        {insight.entityName && (
          <span className={`
            inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium
            ${isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}
          `}>
            <span>{insight.icon || '✨'}</span>
            {insight.entityName}
          </span>
        )}
        
        {/* Source paths hint */}
        {insight.sourcePaths && insight.sourcePaths.length > 0 && (
          <div className={`
            mt-1 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity
            ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
          `}>
            {insight.sourcePaths.length} related strand{insight.sourcePaths.length > 1 ? 's' : ''}
          </div>
        )}
      </div>
      
      {/* Relevance indicator */}
      <div className="absolute top-1.5 right-1.5">
        <div
          className={`
            w-1 h-1 rounded-full
            ${insight.relevance > 0.7 
              ? isDark ? 'bg-emerald-400' : 'bg-emerald-500'
              : insight.relevance > 0.4
                ? isDark ? 'bg-amber-400' : 'bg-amber-500'
                : isDark ? 'bg-zinc-500' : 'bg-zinc-400'
            }
          `}
          title={`Relevance: ${Math.round(insight.relevance * 100)}%`}
        />
      </div>
    </motion.div>
  )
}

