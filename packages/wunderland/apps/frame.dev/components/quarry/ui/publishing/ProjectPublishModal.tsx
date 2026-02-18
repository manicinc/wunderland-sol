/**
 * Project Publish Modal
 * @module components/quarry/ui/ProjectPublishModal
 *
 * Modal for publishing writing projects as strands.
 * Supports two formats:
 * - Single combined strand: All chapters in one file
 * - Folder strand: Project folder with chapters as separate files
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  FileText,
  Folder,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Loader2,
  Send,
} from 'lucide-react'
import type { WritingProject, ProjectPublishFormat } from '@/lib/write/types'
import { enqueueJob } from '@/lib/jobs/jobQueue'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

interface ProjectPublishModalProps {
  /** Project to publish */
  project: WritingProject
  /** Whether modal is open */
  isOpen: boolean
  /** Close handler */
  onClose: () => void
  /** Called when publishing starts (with job ID) */
  onPublished?: (strandPath: string) => void
  /** Theme */
  isDark?: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ProjectPublishModal({
  project,
  isOpen,
  onClose,
  onPublished,
  isDark = true,
}: ProjectPublishModalProps) {
  const [format, setFormat] = useState<ProjectPublishFormat>('single-strand')
  const [targetWeave, setTargetWeave] = useState('weaves/writings')
  const [includeSynopses, setIncludeSynopses] = useState(true)
  const [includeWordCounts, setIncludeWordCounts] = useState(true)
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate totals
  const totalWords = project.parts.reduce(
    (sum, part) =>
      sum +
      part.chapters.reduce((chapterSum, ch) => chapterSum + ch.wordCount, 0),
    0
  )
  const totalChapters = project.parts.reduce(
    (sum, part) => sum + part.chapters.length,
    0
  )

  // Generate expected strand path
  const slug = project.title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const expectedPath =
    format === 'single-strand'
      ? `${targetWeave}/${slug}.md`
      : `${targetWeave}/${slug}/`

  const handlePublish = async () => {
    setIsPublishing(true)
    setError(null)

    try {
      const jobId = await enqueueJob('publish-project', {
        projectId: project.id,
        format,
        targetWeave,
        includeSynopses,
        includeWordCounts,
      })

      if (jobId) {
        // Job queued successfully
        onClose()
        onPublished?.(expectedPath)
      } else {
        setError('A publishing job is already in progress for this project')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publishing failed')
    } finally {
      setIsPublishing(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={cn(
            'rounded-xl shadow-2xl w-full max-w-lg p-6 mx-4',
            isDark ? 'bg-zinc-900' : 'bg-white'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <BookOpen
                className={cn(
                  'w-6 h-6',
                  isDark ? 'text-emerald-400' : 'text-emerald-600'
                )}
              />
              <h2
                className={cn(
                  'text-xl font-semibold',
                  isDark ? 'text-zinc-100' : 'text-zinc-900'
                )}
              >
                Publish Project
              </h2>
            </div>
            <button
              onClick={onClose}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
              )}
            >
              <X
                className={cn(
                  'w-5 h-5',
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                )}
              />
            </button>
          </div>

          {/* Project Info */}
          <div
            className={cn(
              'rounded-lg p-4 mb-6',
              isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'
            )}
          >
            <h3
              className={cn(
                'font-medium mb-1',
                isDark ? 'text-zinc-100' : 'text-zinc-900'
              )}
            >
              {project.title}
            </h3>
            <p
              className={cn(
                'text-sm',
                isDark ? 'text-zinc-400' : 'text-zinc-500'
              )}
            >
              {totalChapters} chapter{totalChapters !== 1 ? 's' : ''} |{' '}
              {totalWords.toLocaleString()} words
            </p>
            {project.publishing?.isPublished && (
              <p
                className={cn(
                  'text-xs mt-2',
                  isDark ? 'text-amber-400' : 'text-amber-600'
                )}
              >
                Previously published to: {project.publishing.publishedPath}
              </p>
            )}
          </div>

          {/* Format Selection */}
          <div className="mb-6">
            <label
              className={cn(
                'block text-sm font-medium mb-3',
                isDark ? 'text-zinc-300' : 'text-zinc-700'
              )}
            >
              Publishing Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormat('single-strand')}
                className={cn(
                  'p-4 rounded-lg border-2 text-left transition-all',
                  format === 'single-strand'
                    ? isDark
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-emerald-500 bg-emerald-50'
                    : isDark
                      ? 'border-zinc-700 hover:border-zinc-600'
                      : 'border-zinc-200 hover:border-zinc-300'
                )}
              >
                <FileText
                  className={cn(
                    'w-6 h-6 mb-2',
                    format === 'single-strand'
                      ? isDark
                        ? 'text-emerald-400'
                        : 'text-emerald-600'
                      : isDark
                        ? 'text-zinc-400'
                        : 'text-zinc-500'
                  )}
                />
                <div
                  className={cn(
                    'font-medium',
                    isDark ? 'text-zinc-100' : 'text-zinc-900'
                  )}
                >
                  Single File
                </div>
                <div
                  className={cn(
                    'text-xs mt-1',
                    isDark ? 'text-zinc-400' : 'text-zinc-500'
                  )}
                >
                  All chapters in one markdown file
                </div>
              </button>

              <button
                onClick={() => setFormat('folder-strand')}
                className={cn(
                  'p-4 rounded-lg border-2 text-left transition-all',
                  format === 'folder-strand'
                    ? isDark
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-emerald-500 bg-emerald-50'
                    : isDark
                      ? 'border-zinc-700 hover:border-zinc-600'
                      : 'border-zinc-200 hover:border-zinc-300'
                )}
              >
                <Folder
                  className={cn(
                    'w-6 h-6 mb-2',
                    format === 'folder-strand'
                      ? isDark
                        ? 'text-emerald-400'
                        : 'text-emerald-600'
                      : isDark
                        ? 'text-zinc-400'
                        : 'text-zinc-500'
                  )}
                />
                <div
                  className={cn(
                    'font-medium',
                    isDark ? 'text-zinc-100' : 'text-zinc-900'
                  )}
                >
                  Folder Strand
                </div>
                <div
                  className={cn(
                    'text-xs mt-1',
                    isDark ? 'text-zinc-400' : 'text-zinc-500'
                  )}
                >
                  Each chapter as separate file
                </div>
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4 mb-6">
            <div>
              <label
                className={cn(
                  'block text-sm font-medium mb-2',
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                )}
              >
                Target Location
              </label>
              <input
                type="text"
                value={targetWeave}
                onChange={(e) => setTargetWeave(e.target.value)}
                className={cn(
                  'w-full px-3 py-2 rounded-lg border',
                  isDark
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-100'
                    : 'bg-white border-zinc-200 text-zinc-900'
                )}
                placeholder="weaves/writings"
              />
              <p
                className={cn(
                  'text-xs mt-1',
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                )}
              >
                Will publish to: {expectedPath}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="includeSynopses"
                checked={includeSynopses}
                onChange={(e) => setIncludeSynopses(e.target.checked)}
                className="rounded"
              />
              <label
                htmlFor="includeSynopses"
                className={cn(
                  'text-sm',
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                )}
              >
                Include chapter synopses in table of contents
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="includeWordCounts"
                checked={includeWordCounts}
                onChange={(e) => setIncludeWordCounts(e.target.checked)}
                className="rounded"
              />
              <label
                htmlFor="includeWordCounts"
                className={cn(
                  'text-sm',
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                )}
              >
                Include word counts per chapter
              </label>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className={cn(
                'flex items-center gap-2 p-3 rounded-lg mb-6',
                isDark
                  ? 'bg-red-500/10 border border-red-500/20'
                  : 'bg-red-50 border border-red-200'
              )}
            >
              <AlertCircle
                className={cn(
                  'w-5 h-5',
                  isDark ? 'text-red-400' : 'text-red-600'
                )}
              />
              <span
                className={cn(
                  'text-sm',
                  isDark ? 'text-red-400' : 'text-red-600'
                )}
              >
                {error}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className={cn(
                'flex-1 px-4 py-2.5 rounded-lg border transition-colors',
                isDark
                  ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                  : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
              )}
            >
              Cancel
            </button>
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className={cn(
                'flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2',
                isDark
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50',
                'disabled:cursor-not-allowed'
              )}
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Publish
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default ProjectPublishModal
