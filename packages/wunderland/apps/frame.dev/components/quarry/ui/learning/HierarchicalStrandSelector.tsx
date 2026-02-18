/**
 * Hierarchical Strand Selector Component
 * @module quarry/ui/learning/HierarchicalStrandSelector
 *
 * Tree view component for selecting strands organized by Weave > Loom > Strand hierarchy.
 * Supports multi-select with select-all per level.
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  Check,
  Minus,
  Search,
  X,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface StrandItem {
  id: string
  path: string
  title: string
  tags?: string[]
  subjects?: string[]
  topics?: string[]
  wordCount?: number
}

export interface LoomItem {
  id: string
  path: string
  name: string
  strands: StrandItem[]
  looms?: LoomItem[] // Nested looms
}

export interface WeaveItem {
  id: string
  slug: string
  name: string
  looms: LoomItem[]
  strands: StrandItem[] // Direct strands (not in looms)
}

export interface HierarchicalStrandSelectorProps {
  /** Hierarchical data */
  weaves: WeaveItem[]
  /** Currently selected strand IDs */
  selectedIds: Set<string>
  /** Toggle selection handler */
  onToggle: (id: string) => void
  /** Select all strands */
  onSelectAll: (ids: string[]) => void
  /** Deselect all strands */
  onDeselectAll: () => void
  /** Active filters */
  filters?: {
    tags?: string[]
    subjects?: string[]
    topics?: string[]
    search?: string
  }
  /** Theme */
  isDark: boolean
  /** Max height */
  maxHeight?: number
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

function getAllStrandIds(weaves: WeaveItem[]): string[] {
  const ids: string[] = []

  function collectFromLoom(loom: LoomItem) {
    ids.push(...loom.strands.map(s => s.id))
    loom.looms?.forEach(collectFromLoom)
  }

  for (const weave of weaves) {
    ids.push(...weave.strands.map(s => s.id))
    weave.looms.forEach(collectFromLoom)
  }

  return ids
}

function getStrandsInWeave(weave: WeaveItem): string[] {
  const ids: string[] = [...weave.strands.map(s => s.id)]

  function collectFromLoom(loom: LoomItem) {
    ids.push(...loom.strands.map(s => s.id))
    loom.looms?.forEach(collectFromLoom)
  }

  weave.looms.forEach(collectFromLoom)
  return ids
}

function getStrandsInLoom(loom: LoomItem): string[] {
  const ids: string[] = [...loom.strands.map(s => s.id)]
  loom.looms?.forEach(nested => {
    ids.push(...getStrandsInLoom(nested))
  })
  return ids
}

type CheckboxState = 'checked' | 'unchecked' | 'indeterminate'

function getCheckboxState(
  containedIds: string[],
  selectedIds: Set<string>
): CheckboxState {
  if (containedIds.length === 0) return 'unchecked'

  const selectedCount = containedIds.filter(id => selectedIds.has(id)).length

  if (selectedCount === 0) return 'unchecked'
  if (selectedCount === containedIds.length) return 'checked'
  return 'indeterminate'
}

function matchesFilters(
  strand: StrandItem,
  filters?: HierarchicalStrandSelectorProps['filters']
): boolean {
  if (!filters) return true

  // Search filter
  if (filters.search) {
    const search = filters.search.toLowerCase()
    if (!strand.title.toLowerCase().includes(search)) {
      return false
    }
  }

  // Tag filter
  if (filters.tags && filters.tags.length > 0) {
    if (!strand.tags?.some(t => filters.tags!.includes(t))) {
      return false
    }
  }

  // Subject filter
  if (filters.subjects && filters.subjects.length > 0) {
    if (!strand.subjects?.some(s => filters.subjects!.includes(s))) {
      return false
    }
  }

  // Topic filter
  if (filters.topics && filters.topics.length > 0) {
    if (!strand.topics?.some(t => filters.topics!.includes(t))) {
      return false
    }
  }

  return true
}

/* ═══════════════════════════════════════════════════════════════════════════
   CHECKBOX COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

interface TreeCheckboxProps {
  state: CheckboxState
  onClick: () => void
  isDark: boolean
}

function TreeCheckbox({ state, onClick, isDark }: TreeCheckboxProps) {
  return (
    <button
      onClick={e => {
        e.stopPropagation()
        onClick()
      }}
      className={`
        flex items-center justify-center w-4 h-4 rounded border transition-colors
        ${state === 'checked'
          ? isDark
            ? 'bg-emerald-600 border-emerald-600'
            : 'bg-emerald-500 border-emerald-500'
          : state === 'indeterminate'
            ? isDark
              ? 'bg-emerald-600/50 border-emerald-600'
              : 'bg-emerald-500/50 border-emerald-500'
            : isDark
              ? 'border-zinc-600 hover:border-zinc-500'
              : 'border-zinc-300 hover:border-zinc-400'
        }
      `}
    >
      {state === 'checked' && <Check className="w-3 h-3 text-white" />}
      {state === 'indeterminate' && <Minus className="w-3 h-3 text-white" />}
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   STRAND ROW COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

interface StrandRowProps {
  strand: StrandItem
  isSelected: boolean
  onToggle: () => void
  isDark: boolean
  depth: number
}

function StrandRow({ strand, isSelected, onToggle, isDark, depth }: StrandRowProps) {
  return (
    <div
      className={`
        flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors
        ${isSelected
          ? isDark
            ? 'bg-emerald-900/30'
            : 'bg-emerald-50'
          : isDark
            ? 'hover:bg-zinc-800'
            : 'hover:bg-zinc-100'
        }
      `}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      onClick={onToggle}
    >
      <TreeCheckbox
        state={isSelected ? 'checked' : 'unchecked'}
        onClick={onToggle}
        isDark={isDark}
      />
      <FileText
        className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}
      />
      <span
        className={`
          text-sm truncate flex-1
          ${isDark ? 'text-zinc-300' : 'text-zinc-700'}
        `}
      >
        {strand.title}
      </span>
      {strand.wordCount && (
        <span
          className={`
            text-xs tabular-nums
            ${isDark ? 'text-zinc-600' : 'text-zinc-400'}
          `}
        >
          {strand.wordCount.toLocaleString()}w
        </span>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOOM ROW COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

interface LoomRowProps {
  loom: LoomItem
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onSelectAll: (ids: string[]) => void
  isDark: boolean
  depth: number
  filters?: HierarchicalStrandSelectorProps['filters']
}

function LoomRow({
  loom,
  selectedIds,
  onToggle,
  onSelectAll,
  isDark,
  depth,
  filters,
}: LoomRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Filter strands
  const filteredStrands = loom.strands.filter(s => matchesFilters(s, filters))
  const strandIds = getStrandsInLoom(loom)
  const checkboxState = getCheckboxState(strandIds, selectedIds)

  const handleCheckbox = () => {
    if (checkboxState === 'checked') {
      // Deselect all in this loom
      strandIds.forEach(id => {
        if (selectedIds.has(id)) onToggle(id)
      })
    } else {
      // Select all in this loom
      onSelectAll(strandIds.filter(id => !selectedIds.has(id)))
    }
  }

  // Don't show if no strands match filters
  if (filteredStrands.length === 0 && (!loom.looms || loom.looms.length === 0)) {
    return null
  }

  return (
    <div>
      <div
        className={`
          flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors
          ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}
        `}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <TreeCheckbox
          state={checkboxState}
          onClick={handleCheckbox}
          isDark={isDark}
        />
        <button
          onClick={e => {
            e.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
          className={`p-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>
        {isExpanded ? (
          <FolderOpen
            className={`w-4 h-4 ${isDark ? 'text-amber-500' : 'text-amber-600'}`}
          />
        ) : (
          <Folder
            className={`w-4 h-4 ${isDark ? 'text-amber-500/70' : 'text-amber-500'}`}
          />
        )}
        <span
          className={`
            text-sm font-medium truncate flex-1
            ${isDark ? 'text-zinc-200' : 'text-zinc-800'}
          `}
        >
          {loom.name}
        </span>
        <span
          className={`
            text-xs
            ${isDark ? 'text-zinc-600' : 'text-zinc-400'}
          `}
        >
          {strandIds.length}
        </span>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Nested looms */}
            {loom.looms?.map(nested => (
              <LoomRow
                key={nested.id}
                loom={nested}
                selectedIds={selectedIds}
                onToggle={onToggle}
                onSelectAll={onSelectAll}
                isDark={isDark}
                depth={depth + 1}
                filters={filters}
              />
            ))}

            {/* Strands */}
            {filteredStrands.map(strand => (
              <StrandRow
                key={strand.id}
                strand={strand}
                isSelected={selectedIds.has(strand.id)}
                onToggle={() => onToggle(strand.id)}
                isDark={isDark}
                depth={depth + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   WEAVE ROW COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

interface WeaveRowProps {
  weave: WeaveItem
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onSelectAll: (ids: string[]) => void
  isDark: boolean
  filters?: HierarchicalStrandSelectorProps['filters']
}

function WeaveRow({
  weave,
  selectedIds,
  onToggle,
  onSelectAll,
  isDark,
  filters,
}: WeaveRowProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Filter direct strands
  const filteredStrands = weave.strands.filter(s => matchesFilters(s, filters))
  const strandIds = getStrandsInWeave(weave)
  const checkboxState = getCheckboxState(strandIds, selectedIds)

  const handleCheckbox = () => {
    if (checkboxState === 'checked') {
      strandIds.forEach(id => {
        if (selectedIds.has(id)) onToggle(id)
      })
    } else {
      onSelectAll(strandIds.filter(id => !selectedIds.has(id)))
    }
  }

  return (
    <div className="mb-2">
      <div
        className={`
          flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors
          ${isDark
            ? 'bg-zinc-800/50 hover:bg-zinc-800'
            : 'bg-zinc-100/50 hover:bg-zinc-100'
          }
        `}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <TreeCheckbox
          state={checkboxState}
          onClick={handleCheckbox}
          isDark={isDark}
        />
        <button
          onClick={e => {
            e.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
          className={`p-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        <span
          className={`
            text-sm font-semibold truncate flex-1
            ${isDark ? 'text-zinc-100' : 'text-zinc-900'}
          `}
        >
          {weave.name}
        </span>
        <span
          className={`
            text-xs px-1.5 py-0.5 rounded
            ${isDark
              ? 'bg-zinc-700 text-zinc-400'
              : 'bg-zinc-200 text-zinc-500'
            }
          `}
        >
          {strandIds.length} strands
        </span>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-1"
          >
            {/* Looms */}
            {weave.looms.map(loom => (
              <LoomRow
                key={loom.id}
                loom={loom}
                selectedIds={selectedIds}
                onToggle={onToggle}
                onSelectAll={onSelectAll}
                isDark={isDark}
                depth={1}
                filters={filters}
              />
            ))}

            {/* Direct strands */}
            {filteredStrands.map(strand => (
              <StrandRow
                key={strand.id}
                strand={strand}
                isSelected={selectedIds.has(strand.id)}
                onToggle={() => onToggle(strand.id)}
                isDark={isDark}
                depth={1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function HierarchicalStrandSelector({
  weaves,
  selectedIds,
  onToggle,
  onSelectAll,
  onDeselectAll,
  filters,
  isDark,
  maxHeight = 400,
}: HierarchicalStrandSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Combine search with filters
  const activeFilters = useMemo(() => ({
    ...filters,
    search: searchQuery || filters?.search,
  }), [filters, searchQuery])

  // Calculate stats
  const allIds = useMemo(() => getAllStrandIds(weaves), [weaves])
  const selectedCount = selectedIds.size
  const totalCount = allIds.length

  const handleSelectAll = () => {
    if (selectedCount === totalCount) {
      onDeselectAll()
    } else {
      onSelectAll(allIds.filter(id => !selectedIds.has(id)))
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with search and select all */}
      <div className="flex items-center gap-2 mb-3">
        {/* Search */}
        <div
          className={`
            flex-1 flex items-center gap-2 px-3 py-2 rounded-lg
            ${isDark
              ? 'bg-zinc-800 border border-zinc-700'
              : 'bg-white border border-zinc-200'
            }
          `}
        >
          <Search
            className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search strands..."
            className={`
              flex-1 bg-transparent border-none outline-none text-sm
              ${isDark ? 'text-zinc-200 placeholder:text-zinc-500' : 'text-zinc-800 placeholder:text-zinc-400'}
            `}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Select all button */}
        <button
          onClick={handleSelectAll}
          className={`
            px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap
            ${isDark
              ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200'
            }
          `}
        >
          {selectedCount === totalCount ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {/* Selection summary */}
      <div
        className={`
          flex items-center justify-between px-2 py-1.5 mb-2 rounded
          ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-100/50'}
        `}
      >
        <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          {selectedCount} of {totalCount} strands selected
        </span>
        {selectedCount > 0 && (
          <button
            onClick={onDeselectAll}
            className={`
              text-xs transition-colors
              ${isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'}
            `}
          >
            Clear
          </button>
        )}
      </div>

      {/* Tree */}
      <div
        className="flex-1 overflow-y-auto pr-1"
        style={{ maxHeight }}
      >
        {weaves.length === 0 ? (
          <div
            className={`
              flex items-center justify-center h-32
              ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
            `}
          >
            <p className="text-sm">No content available</p>
          </div>
        ) : (
          weaves.map(weave => (
            <WeaveRow
              key={weave.id}
              weave={weave}
              selectedIds={selectedIds}
              onToggle={onToggle}
              onSelectAll={onSelectAll}
              isDark={isDark}
              filters={activeFilters}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default HierarchicalStrandSelector
