/**
 * Q&A Context Scope Selector
 * @module codex/ui/QAContextSelector
 * 
 * @remarks
 * Allows users to choose what content to search:
 * - Current document only
 * - All documents
 * - Filtered by weave/loom/tags
 */

'use client'

import React, { useState, useMemo } from 'react'
import { FileText, Database, Filter, ChevronDown, AlertTriangle } from 'lucide-react'

export type ContextScope = 'current' | 'all' | 'filtered'

export interface ContextFilters {
  weaves?: string[]
  looms?: string[]
  tags?: string[]
  subjects?: string[]
  topics?: string[]
}

interface QAContextSelectorProps {
  /** Current scope */
  scope: ContextScope
  /** Change scope */
  onScopeChange: (scope: ContextScope) => void
  /** Current filters */
  filters: ContextFilters
  /** Update filters */
  onFiltersChange: (filters: ContextFilters) => void
  /** Available weaves (from knowledge tree) */
  availableWeaves: string[]
  /** Available looms */
  availableLooms: string[]
  /** Available tags */
  availableTags: string[]
  /** Available subjects (taxonomy) */
  availableSubjects?: string[]
  /** Available topics (taxonomy) */
  availableTopics?: string[]
  /** Current strand path (for "current doc" mode) */
  currentStrand?: string
  /** Total strands in scope */
  totalStrands: number
}

/**
 * Context scope selector with filtering UI
 */
export default function QAContextSelector({
  scope,
  onScopeChange,
  filters,
  onFiltersChange,
  availableWeaves,
  availableLooms,
  availableTags,
  availableSubjects = [],
  availableTopics = [],
  currentStrand,
  totalStrands,
}: QAContextSelectorProps) {
  const [showFilters, setShowFilters] = useState(false)

  const estimatedDocs = useMemo(() => {
    if (scope === 'current') return 1
    if (scope === 'all') return totalStrands
    
    // Estimate based on filters (rough heuristic)
    let estimate = totalStrands
    if (filters.weaves && filters.weaves.length > 0) {
      estimate = Math.floor(estimate * (filters.weaves.length / Math.max(availableWeaves.length, 1)))
    }
    if (filters.looms && filters.looms.length > 0) {
      estimate = Math.floor(estimate * 0.6) // Looms typically reduce by ~40%
    }
    if (filters.tags && filters.tags.length > 0) {
      estimate = Math.floor(estimate * 0.4) // Tags are more selective
    }
    return Math.max(estimate, 1)
  }, [scope, filters, totalStrands, availableWeaves.length])

  const showWarning = estimatedDocs > 100 && scope !== 'current'

  return (
    <div className="space-y-2">
      {/* Scope Selector */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onScopeChange('current')}
          disabled={!currentStrand}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all text-xs font-semibold ${
            scope === 'current'
              ? 'bg-cyan-100 dark:bg-cyan-900/30 border-cyan-400 dark:border-cyan-600 text-cyan-900 dark:text-cyan-200'
              : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          } ${!currentStrand ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Search only the current document"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Current</span>
        </button>
        
        <button
          onClick={() => onScopeChange('all')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all text-xs font-semibold ${
            scope === 'all'
              ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-400 dark:border-emerald-600 text-emerald-900 dark:text-emerald-200'
              : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          title="Search all documents in the Codex"
        >
          <Database className="w-3.5 h-3.5" />
          <span>All ({totalStrands})</span>
        </button>
        
        <button
          onClick={() => {
            onScopeChange('filtered')
            setShowFilters(true)
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all text-xs font-semibold ${
            scope === 'filtered'
              ? 'bg-violet-100 dark:bg-violet-900/30 border-violet-400 dark:border-violet-600 text-violet-900 dark:text-violet-200'
              : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          title="Filter by weaves, looms, or tags"
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Filter</span>
        </button>
      </div>

      {/* Estimated Scope Info */}
      <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 px-1">
        <span>~{estimatedDocs} doc{estimatedDocs !== 1 ? 's' : ''} in scope</span>
        {showWarning && (
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            May be slow
          </span>
        )}
      </div>

      {/* Filter Panel */}
      {scope === 'filtered' && showFilters && (
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 bg-gray-50 dark:bg-gray-900/50 space-y-3">
          {/* Help Section */}
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium">
              How to use filters
            </summary>
            <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-400 space-y-1">
              <p><strong>Subjects:</strong> High-level categories (e.g., "Machine Learning", "Web Development")</p>
              <p><strong>Topics:</strong> Specific areas within subjects (e.g., "Neural Networks", "React Hooks")</p>
              <p><strong>Tags:</strong> Keywords and metadata tags from your documents</p>
              <p><strong>Weaves:</strong> Top-level organizational folders in your vault</p>
              <p><strong>Looms:</strong> Sub-folders within weaves</p>
              <p className="pt-1 border-t border-gray-300 dark:border-gray-700 mt-1">
                <em>Tip: Combine filters to narrow down your search. Hold Ctrl/Cmd to select multiple.</em>
              </p>
            </div>
          </details>

          {/* Subjects */}
          {availableSubjects.length > 0 && (
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5 block">
                Subjects
              </label>
              <select
                multiple
                value={filters.subjects || []}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value)
                  onFiltersChange({ ...filters, subjects: selected.length > 0 ? selected : undefined })
                }}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
                size={Math.min(availableSubjects.length, 4)}
              >
                {availableSubjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
          )}

          {/* Topics */}
          {availableTopics.length > 0 && (
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5 block">
                Topics
              </label>
              <select
                multiple
                value={filters.topics || []}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value)
                  onFiltersChange({ ...filters, topics: selected.length > 0 ? selected : undefined })
                }}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
                size={Math.min(availableTopics.length, 4)}
              >
                {availableTopics.slice(0, 100).map(topic => (
                  <option key={topic} value={topic}>{topic}</option>
                ))}
              </select>
              {availableTopics.length > 100 && (
                <p className="text-[9px] text-gray-500 mt-1">
                  Showing first 100 topics ({availableTopics.length} total)
                </p>
              )}
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1">
              Tags
              {(availableTags?.length || 0) > 50 && (
                <span className="flex items-center gap-0.5 text-amber-600">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Heavy calc
                </span>
              )}
            </label>
            <select
              multiple
              value={filters.tags || []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value)
                onFiltersChange({ ...filters, tags: selected.length > 0 ? selected : undefined })
              }}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
              size={Math.min(availableTags?.length || 0, 4)}
            >
              {(availableTags || []).slice(0, 100).map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            {(availableTags?.length || 0) > 100 && (
              <p className="text-[9px] text-amber-600 dark:text-amber-400 mt-1">
                Showing first 100 tags ({availableTags?.length || 0} total)
              </p>
            )}
          </div>

          {/* Weaves */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5 block">
              Weaves
            </label>
            <select
              multiple
              value={filters.weaves || []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value)
                onFiltersChange({ ...filters, weaves: selected.length > 0 ? selected : undefined })
              }}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
              size={Math.min(availableWeaves.length, 4)}
            >
              {availableWeaves.map(weave => (
                <option key={weave} value={weave}>{weave}</option>
              ))}
            </select>
          </div>

          {/* Looms */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5 block">
              Looms
            </label>
            <select
              multiple
              value={filters.looms || []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value)
                onFiltersChange({ ...filters, looms: selected.length > 0 ? selected : undefined })
              }}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
              size={Math.min(availableLooms.length, 4)}
            >
              {availableLooms.map(loom => (
                <option key={loom} value={loom}>{loom}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {(filters.weaves || filters.looms || filters.tags || filters.subjects || filters.topics) && (
            <button
              onClick={() => onFiltersChange({})}
              className="w-full px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}


