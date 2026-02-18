/**
 * ContentInsights - NLP-powered content analysis display
 * @module codex/ui/ContentInsights
 * 
 * Compact display of content analysis including:
 * - Auto-detected difficulty level
 * - Content type classification
 * - Suggested tags
 * - Entity highlights
 * - Content health score
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, Tag, BookOpen, Lightbulb, AlertTriangle, 
  ChevronDown, ChevronRight, Plus, Zap, Brain,
  FileText, Code, HelpCircle, Wrench, Layers
} from 'lucide-react'
import { useContentAnalysis, getDifficultyColor, getContentTypeColor, getHealthColor } from '../../hooks/useContentAnalysis'
import type { StrandMetadata } from '../../types'

interface ContentInsightsProps {
  content: string | null
  metadata?: StrandMetadata
  existingTags?: string[]
  onAddTag?: (tag: string) => void
  theme?: string
  compact?: boolean
}

const CONTENT_TYPE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  tutorial: BookOpen,
  reference: FileText,
  conceptual: Lightbulb,
  troubleshooting: Wrench,
  architecture: Layers,
  general: HelpCircle,
}

export default function ContentInsights({
  content,
  metadata,
  existingTags = [],
  onAddTag,
  theme = 'light',
  compact = false,
}: ContentInsightsProps) {
  const [expanded, setExpanded] = useState(!compact)
  const [showAllTags, setShowAllTags] = useState(false)
  const [showEntities, setShowEntities] = useState(false)
  
  const isDark = theme?.includes('dark')
  
  const analysis = useContentAnalysis(content, {
    metadata,
    existingTags,
    enabled: !!content,
  })
  
  if (!analysis) return null
  
  const ContentTypeIcon = CONTENT_TYPE_ICONS[analysis.contentType.primary] || HelpCircle
  
  // Show max 5 suggested tags unless expanded
  const visibleTags = showAllTags 
    ? analysis.suggestedTags 
    : analysis.suggestedTags.slice(0, 5)
  
  // Flatten entities for display
  const allEntities = Object.entries(analysis.entities)
    .flatMap(([category, items]) => items.map(item => ({ category, item })))
    .slice(0, showEntities ? 20 : 6)
  
  if (compact) {
    // Ultra-compact single-line view
    return (
      <div className={`
        flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px]
        ${isDark ? 'bg-zinc-900/50' : 'bg-zinc-50'}
      `}>
        <span className={`px-1.5 py-0.5 rounded font-medium ${getDifficultyColor(analysis.readingLevel.level)}`}>
          {analysis.readingLevel.level}
        </span>
        <span className={`px-1.5 py-0.5 rounded font-medium ${getContentTypeColor(analysis.contentType.primary)}`}>
          {analysis.contentType.primary}
        </span>
        <span className={`${getHealthColor(analysis.health.score)}`}>
          {analysis.health.score}%
        </span>
        {analysis.suggestedTags.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className={`flex items-center gap-0.5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}
          >
            <Sparkles className="w-3 h-3" />
            <span>{analysis.suggestedTags.length} suggestions</span>
          </button>
        )}
      </div>
    )
  }
  
  return (
    <div className={`
      rounded-lg border overflow-hidden
      ${isDark ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-200 bg-zinc-50/50'}
    `}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`
          w-full flex items-center justify-between px-3 py-2
          ${isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100/50'}
          transition-colors
        `}
      >
        <div className="flex items-center gap-2">
          <Brain className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
          <span className={`text-xs font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
            Content Insights
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${getHealthColor(analysis.health.score)} bg-current/10`}>
            {analysis.health.score}% health
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        )}
      </button>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={`px-3 pb-3 space-y-3 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
              {/* Classification Row */}
              <div className="flex items-center gap-2 pt-2">
                {/* Difficulty */}
                <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium ${getDifficultyColor(analysis.readingLevel.level)}`}>
                  <Zap className="w-3 h-3" />
                  {analysis.readingLevel.level}
                </div>
                
                {/* Content Type */}
                <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium ${getContentTypeColor(analysis.contentType.primary)}`}>
                  <ContentTypeIcon className="w-3 h-3" />
                  {analysis.contentType.primary}
                  {analysis.contentType.confidence > 0.5 && (
                    <span className="opacity-60">
                      ({Math.round(analysis.contentType.confidence * 100)}%)
                    </span>
                  )}
                </div>
                
                {/* Stats */}
                <div className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {analysis.wordCount} words • {analysis.headingCount} headings
                </div>
              </div>
              
              {/* Suggested Tags */}
              {analysis.suggestedTags.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Sparkles className={`w-3 h-3 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                      <span className={`text-[10px] font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                        Suggested Tags
                      </span>
                    </div>
                    {analysis.suggestedTags.length > 5 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowAllTags(!showAllTags) }}
                        className={`text-[9px] ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}
                      >
                        {showAllTags ? 'Show less' : `+${analysis.suggestedTags.length - 5} more`}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {visibleTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => onAddTag?.(tag)}
                        className={`
                          flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]
                          transition-colors
                          ${isDark 
                            ? 'bg-zinc-800 text-zinc-300 hover:bg-cyan-900/50 hover:text-cyan-300' 
                            : 'bg-zinc-200 text-zinc-700 hover:bg-cyan-100 hover:text-cyan-700'
                          }
                        `}
                        title="Click to add tag"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Detected Entities */}
              {allEntities.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Tag className={`w-3 h-3 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                      <span className={`text-[10px] font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                        Detected Entities
                      </span>
                    </div>
                    {Object.values(analysis.entities).flat().length > 6 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowEntities(!showEntities) }}
                        className={`text-[9px] ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}
                      >
                        {showEntities ? 'Show less' : `+${Object.values(analysis.entities).flat().length - 6} more`}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {allEntities.map(({ category, item }, i) => (
                      <span
                        key={`${category}-${item}-${i}`}
                        className={`
                          px-1.5 py-0.5 rounded text-[9px] font-medium
                          ${category === 'languages' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                          ${category === 'frameworks' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : ''}
                          ${category === 'databases' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : ''}
                          ${category === 'cloud' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : ''}
                          ${category === 'ai' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' : ''}
                          ${category === 'protocols' ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' : ''}
                          ${category === 'concepts' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : ''}
                        `}
                        title={category}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Health Issues/Suggestions */}
              {(analysis.health.issues.length > 0 || analysis.health.suggestions.length > 0) && (
                <div className="space-y-1">
                  {analysis.health.issues.map((issue, i) => (
                    <div 
                      key={i}
                      className={`
                        flex items-center gap-1.5 text-[10px]
                        ${isDark ? 'text-rose-400' : 'text-rose-600'}
                      `}
                    >
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                      {issue}
                    </div>
                  ))}
                  {analysis.health.suggestions.slice(0, 2).map((suggestion, i) => (
                    <div 
                      key={i}
                      className={`
                        flex items-center gap-1.5 text-[10px]
                        ${isDark ? 'text-amber-400' : 'text-amber-600'}
                      `}
                    >
                      <Lightbulb className="w-3 h-3 flex-shrink-0" />
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}














