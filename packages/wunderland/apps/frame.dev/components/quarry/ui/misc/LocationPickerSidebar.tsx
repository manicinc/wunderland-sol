/**
 * Location Picker Sidebar for Strand Creation
 * @module codex/ui/LocationPickerSidebar
 *
 * Shows a file explorer-like tree for selecting where to save new strands.
 * Always visible sidebar with quick presets and expandable weave/loom hierarchy.
 * Supports creating new looms and weaves inline.
 */

'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Inbox,
  BookOpen,
  FileText,
  Lightbulb,
  Bookmark,
  FlaskConical,
  FolderPlus,
  Check,
  MapPin,
  Plus,
  X,
  Sparkles,
} from 'lucide-react'

interface LocationPickerSidebarProps {
  /** Current selected target path */
  targetPath: string
  /** Callback when path is selected */
  onSelectPath: (path: string) => void
  /** Whether dark mode is enabled */
  isDark?: boolean
  /** Available weaves/looms structure (optional - uses defaults if not provided) */
  structure?: LocationNode[]
  /** Callback when a new loom is created */
  onCreateLoom?: (parentPath: string, loomName: string) => void
  /** Callback when a new weave is created */
  onCreateWeave?: (weaveName: string) => void
  /** Auto-categorization suggestion (if AI suggests a location) */
  suggestedPath?: string
  /** Explanation for why AI suggested this path */
  suggestionReason?: string
  /** Whether to show auto-categorize toggle */
  showAutoCategorize?: boolean
  /** Auto-categorize enabled state */
  autoCategorize?: boolean
  /** Callback when auto-categorize toggled */
  onToggleAutoCategorize?: (enabled: boolean) => void
}

interface LocationNode {
  id: string
  name: string
  path: string
  icon?: React.ElementType
  children?: LocationNode[]
  description?: string
}

// Default weave/loom structure
const DEFAULT_STRUCTURE: LocationNode[] = [
  {
    id: 'inbox',
    name: 'Inbox',
    path: 'weaves/inbox/',
    icon: Inbox,
    description: 'Unsorted new strands',
  },
  {
    id: 'wiki',
    name: 'Wiki',
    path: 'weaves/wiki/',
    icon: BookOpen,
    children: [
      { id: 'tutorials', name: 'Tutorials', path: 'weaves/wiki/tutorials/' },
      { id: 'reference', name: 'Reference', path: 'weaves/wiki/reference/' },
      { id: 'concepts', name: 'Concepts', path: 'weaves/wiki/concepts/' },
      { id: 'how-to', name: 'How-To Guides', path: 'weaves/wiki/how-to/' },
      { id: 'best-practices', name: 'Best Practices', path: 'weaves/wiki/best-practices/' },
      { id: 'troubleshooting', name: 'Troubleshooting', path: 'weaves/wiki/troubleshooting/' },
      { id: 'architecture', name: 'Architecture', path: 'weaves/wiki/architecture/' },
      { id: 'comparisons', name: 'Comparisons', path: 'weaves/wiki/comparisons/' },
      { id: 'case-studies', name: 'Case Studies', path: 'weaves/wiki/case-studies/' },
    ],
  },
  {
    id: 'notes',
    name: 'Notes',
    path: 'weaves/notes/',
    icon: FileText,
    description: 'Personal notes',
  },
  {
    id: 'research',
    name: 'Research',
    path: 'weaves/research/',
    icon: FlaskConical,
    description: 'Research & exploration',
  },
  {
    id: 'projects',
    name: 'Projects',
    path: 'weaves/projects/',
    icon: Bookmark,
    description: 'Project documentation',
  },
  {
    id: 'ideas',
    name: 'Ideas',
    path: 'weaves/ideas/',
    icon: Lightbulb,
    description: 'Ideas & brainstorms',
  },
]

// Quick preset paths
const QUICK_PRESETS = [
  { path: 'weaves/inbox/', label: 'Inbox', icon: Inbox },
  { path: 'weaves/wiki/tutorials/', label: 'Tutorials', icon: BookOpen },
  { path: 'weaves/notes/', label: 'Notes', icon: FileText },
]

interface TreeNodeProps {
  node: LocationNode
  selectedPath: string
  onSelect: (path: string) => void
  isDark: boolean
  level?: number
  expandedNodes: Set<string>
  onToggleExpand: (id: string) => void
  onCreateLoom?: (parentPath: string, loomName: string) => void
  suggestedPath?: string
}

function TreeNode({
  node,
  selectedPath,
  onSelect,
  isDark,
  level = 0,
  expandedNodes,
  onToggleExpand,
  onCreateLoom,
  suggestedPath,
}: TreeNodeProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newLoomName, setNewLoomName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const hasChildren = node.children && node.children.length > 0
  const isExpanded = expandedNodes.has(node.id)
  const isSelected = selectedPath === node.path
  const isSuggested = suggestedPath === node.path
  const Icon = node.icon || (hasChildren ? (isExpanded ? FolderOpen : Folder) : Folder)
  const isWeave = level === 0 && node.id !== 'inbox'

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isCreating])

  const handleCreateLoom = () => {
    if (newLoomName.trim() && onCreateLoom) {
      const slug = newLoomName.trim().toLowerCase().replace(/\s+/g, '-')
      onCreateLoom(node.path, slug)
      setNewLoomName('')
      setIsCreating(false)
      // Select the new loom path
      onSelect(`${node.path}${slug}/`)
    }
  }

  return (
    <div>
      <div className="relative group">
        <button
          onClick={() => {
            if (hasChildren) {
              onToggleExpand(node.id)
            }
            onSelect(node.path)
          }}
          className={`
            w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
            transition-all
            ${isSelected
              ? isDark
                ? 'bg-cyan-900/50 text-cyan-300 border border-cyan-700'
                : 'bg-cyan-100 text-cyan-700 border border-cyan-300'
              : isSuggested
                ? isDark
                  ? 'bg-amber-900/30 text-amber-300 border border-amber-700/50'
                  : 'bg-amber-50 text-amber-700 border border-amber-300'
                : isDark
                  ? 'hover:bg-zinc-800 text-zinc-300'
                  : 'hover:bg-zinc-100 text-zinc-700'
            }
          `}
          style={{ paddingLeft: `${12 + level * 16}px` }}
        >
          {hasChildren && (
            <span className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </span>
          )}
          {!hasChildren && level > 0 && <span className="w-4" />}
          <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? '' : 'opacity-60'}`} />
          <span className="truncate flex-1 text-left">{node.name}</span>
          {isSuggested && !isSelected && (
            <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
          )}
          {isSelected && (
            <Check className="w-4 h-4 flex-shrink-0 text-cyan-500" />
          )}
        </button>

        {/* Inline + button for weaves to create looms */}
        {isWeave && onCreateLoom && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (!isExpanded) {
                onToggleExpand(node.id)
              }
              setIsCreating(true)
            }}
            className={`
              absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded
              opacity-0 group-hover:opacity-100 transition-opacity
              ${isDark
                ? 'hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200'
                : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700'
              }
            `}
            title={`New loom in ${node.name}`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {node.children!.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                selectedPath={selectedPath}
                onSelect={onSelect}
                isDark={isDark}
                level={level + 1}
                expandedNodes={expandedNodes}
                onToggleExpand={onToggleExpand}
                onCreateLoom={onCreateLoom}
                suggestedPath={suggestedPath}
              />
            ))}

            {/* Inline create loom form */}
            {isCreating && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-3 py-1"
                style={{ paddingLeft: `${12 + (level + 1) * 16}px` }}
              >
                <div className="flex items-center gap-2">
                  <FolderPlus className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
                  <input
                    ref={inputRef}
                    type="text"
                    value={newLoomName}
                    onChange={(e) => setNewLoomName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateLoom()
                      } else if (e.key === 'Escape') {
                        setIsCreating(false)
                        setNewLoomName('')
                      }
                    }}
                    placeholder="New loom name..."
                    className={`
                      flex-1 text-sm px-2 py-1 rounded border outline-none
                      ${isDark
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 focus:border-cyan-600'
                        : 'bg-white border-zinc-300 text-zinc-800 placeholder:text-zinc-400 focus:border-cyan-500'
                      }
                    `}
                  />
                  <button
                    onClick={handleCreateLoom}
                    disabled={!newLoomName.trim()}
                    className={`
                      p-1 rounded transition-colors
                      ${isDark
                        ? 'hover:bg-cyan-900/50 text-cyan-400 disabled:text-zinc-600'
                        : 'hover:bg-cyan-100 text-cyan-600 disabled:text-zinc-400'
                      }
                    `}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false)
                      setNewLoomName('')
                    }}
                    className={`
                      p-1 rounded transition-colors
                      ${isDark
                        ? 'hover:bg-zinc-700 text-zinc-400'
                        : 'hover:bg-zinc-200 text-zinc-500'
                      }
                    `}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function LocationPickerSidebar({
  targetPath,
  onSelectPath,
  isDark = false,
  structure = DEFAULT_STRUCTURE,
  onCreateLoom,
  onCreateWeave,
  suggestedPath,
  suggestionReason,
  showAutoCategorize = false,
  autoCategorize = false,
  onToggleAutoCategorize,
}: LocationPickerSidebarProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['wiki']))
  const [isCreatingWeave, setIsCreatingWeave] = useState(false)
  const [newWeaveName, setNewWeaveName] = useState('')
  const weaveInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isCreatingWeave && weaveInputRef.current) {
      weaveInputRef.current.focus()
    }
  }, [isCreatingWeave])

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleCreateWeave = () => {
    if (newWeaveName.trim() && onCreateWeave) {
      onCreateWeave(newWeaveName.trim())
      const slug = newWeaveName.trim().toLowerCase().replace(/\s+/g, '-')
      onSelectPath(`weaves/${slug}/`)
      setNewWeaveName('')
      setIsCreatingWeave(false)
    }
  }

  // Find current selection name for display
  const currentSelectionName = useMemo(() => {
    function findName(nodes: LocationNode[]): string | null {
      for (const node of nodes) {
        if (node.path === targetPath) return node.name
        if (node.children) {
          const found = findName(node.children)
          if (found) return found
        }
      }
      return null
    }
    return findName(structure) || targetPath
  }, [targetPath, structure])

  return (
    <div
      className={`
        w-56 flex-shrink-0 border-r flex flex-col h-full
        ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}
      `}
    >
      {/* Header */}
      <div className={`px-4 py-3 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <div className="flex items-center gap-2 mb-2">
          <MapPin className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
          <span className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Save Location
          </span>
        </div>
        <div className={`text-sm font-medium truncate ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
          {currentSelectionName}
        </div>
      </div>

      {/* Auto-categorize toggle */}
      {showAutoCategorize && onToggleAutoCategorize && (
        <div className={`px-3 py-2 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={autoCategorize}
              onChange={(e) => onToggleAutoCategorize(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`
                w-8 h-4 rounded-full transition-colors relative
                ${autoCategorize
                  ? isDark ? 'bg-amber-600' : 'bg-amber-500'
                  : isDark ? 'bg-zinc-700' : 'bg-zinc-300'
                }
              `}
            >
              <div
                className={`
                  w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all
                  ${autoCategorize ? 'left-[18px]' : 'left-0.5'}
                `}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className={`w-3.5 h-3.5 ${autoCategorize ? 'text-amber-500' : isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
              <span className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                Auto-categorize
              </span>
            </div>
          </label>
          {autoCategorize && suggestionReason && (
            <p className={`mt-1.5 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {suggestionReason}
            </p>
          )}
        </div>
      )}

      {/* Quick Presets */}
      <div className={`px-3 py-2 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <div className="flex flex-wrap gap-1">
          {QUICK_PRESETS.map((preset) => {
            const PresetIcon = preset.icon
            const isActive = targetPath === preset.path
            const isSuggested = suggestedPath === preset.path
            return (
              <button
                key={preset.path}
                onClick={() => onSelectPath(preset.path)}
                className={`
                  px-2 py-1 rounded text-xs font-medium transition-colors
                  flex items-center gap-1 relative
                  ${isActive
                    ? isDark
                      ? 'bg-cyan-900/50 text-cyan-300'
                      : 'bg-cyan-100 text-cyan-700'
                    : isSuggested
                      ? isDark
                        ? 'bg-amber-900/30 text-amber-300 ring-1 ring-amber-700/50'
                        : 'bg-amber-50 text-amber-700 ring-1 ring-amber-300'
                      : isDark
                        ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-800'
                  }
                `}
              >
                <PresetIcon className="w-3 h-3" />
                {preset.label}
                {isSuggested && !isActive && (
                  <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {structure.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            selectedPath={targetPath}
            onSelect={onSelectPath}
            isDark={isDark}
            expandedNodes={expandedNodes}
            onToggleExpand={toggleExpand}
            onCreateLoom={onCreateLoom}
            suggestedPath={suggestedPath}
          />
        ))}
      </div>

      {/* Footer - Create New Weave/Loom */}
      <div className={`px-3 py-3 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'} space-y-2`}>
        <AnimatePresence>
          {isCreatingWeave ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <div className="flex items-center gap-2">
                <input
                  ref={weaveInputRef}
                  type="text"
                  value={newWeaveName}
                  onChange={(e) => setNewWeaveName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateWeave()
                    } else if (e.key === 'Escape') {
                      setIsCreatingWeave(false)
                      setNewWeaveName('')
                    }
                  }}
                  placeholder="New weave name..."
                  className={`
                    flex-1 text-sm px-3 py-2 rounded-lg border outline-none
                    ${isDark
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 focus:border-cyan-600'
                      : 'bg-white border-zinc-300 text-zinc-800 placeholder:text-zinc-400 focus:border-cyan-500'
                    }
                  `}
                />
                <button
                  onClick={handleCreateWeave}
                  disabled={!newWeaveName.trim()}
                  className={`
                    p-2 rounded-lg transition-colors
                    ${isDark
                      ? 'bg-cyan-900/50 text-cyan-400 hover:bg-cyan-900 disabled:bg-zinc-800 disabled:text-zinc-600'
                      : 'bg-cyan-100 text-cyan-600 hover:bg-cyan-200 disabled:bg-zinc-100 disabled:text-zinc-400'
                    }
                  `}
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setIsCreatingWeave(false)
                    setNewWeaveName('')
                  }}
                  className={`
                    p-2 rounded-lg transition-colors
                    ${isDark
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-500'
                    }
                  `}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex gap-2"
            >
              {onCreateWeave && (
                <button
                  onClick={() => setIsCreatingWeave(true)}
                  className={`
                    flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                    transition-colors
                    ${isDark
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                    }
                  `}
                >
                  <FolderPlus className="w-4 h-4" />
                  New Weave
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tip for creating looms */}
        {!isCreatingWeave && (
          <p className={`text-xs text-center ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
            Hover over a weave and click + to create a loom
          </p>
        )}
      </div>
    </div>
  )
}
