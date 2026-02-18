/**
 * Metadata and relations panel for Frame Codex viewer
 * Displays frontmatter metadata, backlinks, and graph controls
 * @module codex/CodexMetadataPanel
 */

'use client'

import React, { useMemo } from 'react'
import { X, Info, Hash, Link2, Clock } from 'lucide-react'
import type { StrandMetadata, GitHubFile } from './types'
import BacklinkList from '../backlink-list'

interface CodexMetadataPanelProps {
  /** Whether panel is open */
  isOpen: boolean
  /** Close panel callback */
  onClose: () => void
  /** Current file metadata */
  metadata: StrandMetadata
  /** Current file */
  currentFile: GitHubFile | null
  /** All files (for backlink detection) */
  allFiles: GitHubFile[]
  /** Pre-computed extractive summary + last indexed date from Codex index */
  summaryInfo?: {
    summary?: string
    lastIndexed?: string
  }
}

const formatDifficultyLabel = (key: string): string =>
  key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

export default function CodexMetadataPanel({
  isOpen,
  onClose,
  metadata,
  currentFile,
  allFiles,
  summaryInfo,
}: CodexMetadataPanelProps) {
  const difficultyValue = metadata.difficulty
  const difficultyEntries = useMemo(() => {
    if (!difficultyValue || typeof difficultyValue !== 'object' || Array.isArray(difficultyValue)) {
      return null
    }
    return Object.entries(difficultyValue).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    )
  }, [difficultyValue])

  if (!isOpen || !currentFile) return null

  return (
    <div
      className={`
        flex flex-col flex-shrink-0
        border-l border-gray-200 dark:border-gray-800
        bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900
        transition-all duration-300 ease-in-out
        ${isOpen ? 'w-64 xl:w-72' : 'w-0'}
        overflow-hidden
        shadow-[-4px_0_12px_rgba(0,0,0,0.08)]
      `}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' /%3E%3C/filter%3E%3Crect width='60' height='60' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
        backgroundSize: '60px 60px',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-950">
        <h4 className="text-[11px] font-semibold flex items-center gap-1.5 text-gray-800 dark:text-gray-200 uppercase tracking-[0.2em]">
          <Info className="w-4 h-4 text-emerald-600" />
          Metadata & Relations
        </h4>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Close metadata panel"
          title="Close (m)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5 overscroll-contain text-[12px] leading-snug">
        {/* Summary Section (auto-generated, extractive) */}
        {summaryInfo?.summary && (
          <div>
            <h5 className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
              <Info className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
              Summary
            </h5>
            <p className="text-[12px] text-gray-700 dark:text-gray-300 leading-snug">
              {summaryInfo.summary}
            </p>
            {summaryInfo.lastIndexed && (
              <p className="mt-2 inline-flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                <Clock className="w-3 h-3" />
                Extractive summary generated{' '}
                {new Date(summaryInfo.lastIndexed).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            )}
          </div>
        )}

        {/* Metadata Section */}
        <div>
          <h5 className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
            <Hash className="w-3 h-3" />
            Metadata
          </h5>
          {Object.keys(metadata).length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">No metadata available</p>
          ) : (
            <div className="space-y-3">
              {/* Tags */}
              {metadata.tags && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {(Array.isArray(metadata.tags) ? metadata.tags : metadata.tags.split(',')).map(
                      (tag: string) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 font-medium"
                        >
                          {tag.trim()}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Difficulty */}
              {difficultyValue && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">Difficulty</p>
                  {difficultyEntries ? (
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {difficultyEntries.map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                        >
                          <span className="text-gray-500 dark:text-gray-400">{formatDifficultyLabel(key)}</span>
                          <span className="font-mono text-blue-800 dark:text-blue-200">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="inline-block px-2 py-0.5 text-[11px] rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 font-medium capitalize">
                      {typeof difficultyValue === 'string' ? difficultyValue : ''}
                    </span>
                  )}
                </div>
              )}

              {/* Version */}
              {metadata.version && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">Version</p>
                  <span className="inline-block px-2 py-0.5 text-[11px] font-mono rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700">
                    v{metadata.version}
                  </span>
                </div>
              )}

              {/* Taxonomy */}
              {metadata.taxonomy && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Taxonomy</p>
                  <div className="space-y-2">
                    {metadata.taxonomy.subjects && metadata.taxonomy.subjects.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                          Subjects
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {metadata.taxonomy.subjects.map((subject) => (
                            <span
                              key={subject}
                              className="px-2 py-0.5 text-xs rounded bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800"
                            >
                              {subject}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {metadata.taxonomy.topics && metadata.taxonomy.topics.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                          Topics
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {metadata.taxonomy.topics.map((topic) => (
                            <span
                              key={topic}
                              className="px-2 py-0.5 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Content Type */}
              {metadata.contentType && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Content Type</p>
                  <span className="inline-block px-2.5 py-1 text-xs rounded-lg bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800 font-medium capitalize">
                    {metadata.contentType}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t-2 border-gray-300 dark:border-gray-700" />

        {/* Backlinks Section */}
        <div>
          <h5 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-1">
            <Link2 className="w-3 h-3" />
            Backlinks
          </h5>
          <BacklinkList currentPath={currentFile.path} files={allFiles} />
        </div>

        {/* Divider */}
        <div className="border-t-2 border-gray-300 dark:border-gray-700" />

        {/* Graph Controls */}
        <div>
          <h5 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-3">
            Graph Controls
          </h5>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer group touch-manipulation min-h-[44px]">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs text-gray-700 dark:text-gray-300 group-hover:text-emerald-600">
                Highlight in graph
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group touch-manipulation min-h-[44px]">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs text-gray-700 dark:text-gray-300 group-hover:text-emerald-600">
                Show same-tag strands
              </span>
            </label>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Shortcuts</p>
          <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
            <p>
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 rounded font-mono text-xs border border-gray-300 dark:border-gray-700">
                m
              </kbd>{' '}
              Toggle this panel
            </p>
            <p>
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 rounded font-mono text-xs border border-gray-300 dark:border-gray-700">
                /
              </kbd>{' '}
              Focus search
            </p>
            <p>
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 rounded font-mono text-xs border border-gray-300 dark:border-gray-700">
                g
              </kbd>{' '}
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 rounded font-mono text-xs border border-gray-300 dark:border-gray-700">
                h
              </kbd>{' '}
              Go home
            </p>
            <p>
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 rounded font-mono text-xs border border-gray-300 dark:border-gray-700">
                s
              </kbd>{' '}
              Toggle sidebar (mobile)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}



