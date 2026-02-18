/**
 * RAG Scope Indicator
 * Shows current RAG scope as a badge in the Ask interface
 * @module quarry/ui/ask/RAGScopeIndicator
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Database,
  FolderOpen,
  FileText,
  Layers,
  ChevronDown,
  X,
  ToggleLeft,
  ToggleRight,
  Calendar,
} from 'lucide-react'
import { useRAGContext, type RAGMode, type RAGScope } from './RAGContext'

// ============================================================================
// SCOPE BADGE
// ============================================================================

interface ScopeBadgeProps {
  type: 'weave' | 'loom' | 'strand'
  name: string
  onRemove?: () => void
}

function ScopeBadge({ type, name, onRemove }: ScopeBadgeProps) {
  const icons = {
    weave: Layers,
    loom: FolderOpen,
    strand: FileText,
  }
  const colors = {
    weave: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    loom: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    strand: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  }

  const Icon = icons[type]

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border
        ${colors[type]}
      `}
    >
      <Icon className="w-3 h-3" />
      <span className="max-w-[100px] truncate">{name}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 p-0.5 rounded-full hover:bg-white/10"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}

// ============================================================================
// MODE TOGGLE
// ============================================================================

interface ModeToggleProps {
  mode: RAGMode
  onModeChange: (mode: RAGMode) => void
}

function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800">
      <button
        onClick={() => onModeChange('sidebar-auto')}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
          ${
            mode === 'sidebar-auto'
              ? 'bg-cyan-500 text-white'
              : 'text-zinc-400 hover:text-white'
          }
        `}
      >
        <ToggleRight className="w-3 h-3" />
        Sidebar Auto
      </button>
      <button
        onClick={() => onModeChange('manual-pick')}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
          ${
            mode === 'manual-pick'
              ? 'bg-cyan-500 text-white'
              : 'text-zinc-400 hover:text-white'
          }
        `}
      >
        <ToggleLeft className="w-3 h-3" />
        Manual Pick
      </button>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface RAGScopeIndicatorProps {
  className?: string
  compact?: boolean
}

export default function RAGScopeIndicator({
  className = '',
  compact = false,
}: RAGScopeIndicatorProps) {
  const {
    state,
    setMode,
    removeFromManualScope,
    clearManualScope,
    getEffectiveDateRange,
    getScopeCount,
  } = useRAGContext()
  const [expanded, setExpanded] = useState(false)

  const scopeCount = getScopeCount()
  const dateRange = getEffectiveDateRange()
  const activeScope = state.activeScope

  // Compact mode - just show count badge
  if (compact) {
    return (
      <button
        onClick={() => setExpanded(!expanded)}
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
          bg-zinc-800 border border-zinc-700 text-zinc-300 hover:border-zinc-600
          transition-colors ${className}
        `}
      >
        <Database className="w-3 h-3 text-cyan-500" />
        <span>
          {scopeCount > 0 ? `${scopeCount} in scope` : 'All docs'}
        </span>
        {dateRange && (
          <span className="flex items-center gap-0.5 text-amber-400">
            <Calendar className="w-3 h-3" />
          </span>
        )}
        <ChevronDown
          className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          RAG Scope
        </h4>
        <span className="text-xs text-zinc-500">
          {state.mode === 'sidebar-auto' ? 'Auto' : 'Manual'}
        </span>
      </div>

      {/* Mode Toggle */}
      <ModeToggle mode={state.mode} onModeChange={setMode} />

      {/* Scope Summary */}
      <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-4 h-4 text-cyan-500" />
          <span className="text-sm font-medium text-zinc-200">
            {scopeCount > 0
              ? `${scopeCount} items in scope`
              : 'Searching all documents'}
          </span>
        </div>

        {/* Scope Details */}
        {scopeCount > 0 && (
          <div className="space-y-2">
            {activeScope.weaves.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {activeScope.weaves.map((id) => (
                  <ScopeBadge
                    key={id}
                    type="weave"
                    name={id}
                    onRemove={
                      state.mode === 'manual-pick'
                        ? () => removeFromManualScope('weaves', id)
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
            {activeScope.looms.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {activeScope.looms.map((id) => (
                  <ScopeBadge
                    key={id}
                    type="loom"
                    name={id}
                    onRemove={
                      state.mode === 'manual-pick'
                        ? () => removeFromManualScope('looms', id)
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
            {activeScope.strands.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {activeScope.strands.slice(0, 5).map((id) => (
                  <ScopeBadge
                    key={id}
                    type="strand"
                    name={id.split('/').pop() || id}
                    onRemove={
                      state.mode === 'manual-pick'
                        ? () => removeFromManualScope('strands', id)
                        : undefined
                    }
                  />
                ))}
                {activeScope.strands.length > 5 && (
                  <span className="text-xs text-zinc-500">
                    +{activeScope.strands.length - 5} more
                  </span>
                )}
              </div>
            )}

            {/* Clear Button (Manual Mode) */}
            {state.mode === 'manual-pick' && scopeCount > 0 && (
              <button
                onClick={clearManualScope}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {/* Date Range */}
        {dateRange && (
          <div className="mt-2 pt-2 border-t border-zinc-700">
            <div className="flex items-center gap-2 text-xs text-amber-400">
              <Calendar className="w-3 h-3" />
              <span>
                {dateRange.start.toLocaleDateString()} -{' '}
                {dateRange.end.toLocaleDateString()}
              </span>
              {state.temporalTerms.length > 0 && (
                <span className="text-zinc-500">
                  ({state.temporalTerms.join(', ')})
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Index Status */}
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>
          {state.indexedDocCount > 0
            ? `${state.indexedDocCount} docs indexed`
            : 'Not indexed'}
        </span>
        {state.lastIndexed && (
          <span>
            Last: {new Date(state.lastIndexed).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Indexing Progress */}
      <AnimatePresence>
        {state.isIndexing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-cyan-400">Indexing...</span>
              <span className="text-zinc-400">{state.indexingProgress}%</span>
            </div>
            <div className="h-1 rounded-full bg-zinc-700 overflow-hidden">
              <motion.div
                className="h-full bg-cyan-500"
                initial={{ width: 0 }}
                animate={{ width: `${state.indexingProgress}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
