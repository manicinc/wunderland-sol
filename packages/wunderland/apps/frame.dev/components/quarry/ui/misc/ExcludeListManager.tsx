/**
 * Exclude List Manager Component
 * @module codex/ui/ExcludeListManager
 *
 * @remarks
 * Displays and manages the list of excluded/hidden paths.
 * Allows users to re-include items that were hidden.
 */

'use client'

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, Folder, FileText, X } from 'lucide-react'

interface ExcludeListManagerProps {
  /** List of excluded paths */
  excludedPaths: string[]
  /** Re-include a path (remove from exclusion) */
  onInclude: (path: string) => void
  /** Compact mode */
  compact?: boolean
  /** Optional class name */
  className?: string
}

/**
 * Get the file/folder name from a path
 */
function getFileName(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1] || path
}

/**
 * Check if a path looks like a file (has extension)
 */
function isFilePath(path: string): boolean {
  const name = getFileName(path)
  return name.includes('.') && !name.startsWith('.')
}

/**
 * Exclude List Manager - Shows hidden items with option to unhide
 *
 * @example
 * ```tsx
 * <ExcludeListManager
 *   excludedPaths={filters.excludedPaths}
 *   onInclude={includePath}
 *   compact
 * />
 * ```
 */
export default function ExcludeListManager({
  excludedPaths,
  onInclude,
  compact = false,
  className = '',
}: ExcludeListManagerProps) {
  // Group by parent folder for better organization
  const groupedPaths = useMemo(() => {
    const groups = new Map<string, string[]>()

    for (const path of excludedPaths) {
      const parts = path.split('/')
      const parent = parts.length > 1 ? parts.slice(0, -1).join('/') : ''
      const existing = groups.get(parent) || []
      groups.set(parent, [...existing, path])
    }

    return groups
  }, [excludedPaths])

  if (excludedPaths.length === 0) {
    return null
  }

  if (compact) {
    return (
      <div className={`space-y-1 ${className}`}>
        <AnimatePresence mode="popLayout">
          {excludedPaths.slice(0, 5).map(path => (
            <motion.div
              key={path}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-between gap-2 px-2 py-1 rounded
                bg-zinc-100 dark:bg-zinc-800 group"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {isFilePath(path) ? (
                  <FileText className="w-3 h-3 text-zinc-400 flex-shrink-0" />
                ) : (
                  <Folder className="w-3 h-3 text-zinc-400 flex-shrink-0" />
                )}
                <span className="text-[9px] text-zinc-600 dark:text-zinc-400 truncate" title={path}>
                  {getFileName(path)}
                </span>
              </div>
              <button
                onClick={() => onInclude(path)}
                className="p-0.5 rounded opacity-0 group-hover:opacity-100
                  hover:bg-emerald-100 dark:hover:bg-emerald-900/30
                  text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400
                  transition-all"
                title="Show this item"
              >
                <Eye className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {excludedPaths.length > 5 && (
          <div className="text-[9px] text-zinc-500 text-center py-1">
            +{excludedPaths.length - 5} more hidden
          </div>
        )}
      </div>
    )
  }

  // Full-size mode with grouping
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Hidden Items
        </span>
        <span className="text-xs text-zinc-500">
          {excludedPaths.length} item{excludedPaths.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {Array.from(groupedPaths.entries()).map(([parent, paths]) => (
          <div key={parent || 'root'} className="space-y-1">
            {parent && (
              <div className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                <Folder className="w-3 h-3" />
                <span className="truncate">{parent}</span>
              </div>
            )}
            <AnimatePresence mode="popLayout">
              {paths.map(path => (
                <motion.div
                  key={path}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg
                    bg-zinc-100 dark:bg-zinc-800 group
                    ${parent ? 'ml-4' : ''}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isFilePath(path) ? (
                      <FileText className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    ) : (
                      <Folder className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm text-zinc-700 dark:text-zinc-300 truncate">
                        {getFileName(path)}
                      </div>
                      {parent && (
                        <div className="text-[10px] text-zinc-500 truncate">
                          {path}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onInclude(path)}
                    className="flex items-center gap-1 px-2 py-1 rounded
                      bg-emerald-100 dark:bg-emerald-900/30
                      text-emerald-700 dark:text-emerald-300
                      hover:bg-emerald-200 dark:hover:bg-emerald-900/50
                      transition-colors text-xs"
                  >
                    <Eye className="w-3 h-3" />
                    Show
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  )
}
