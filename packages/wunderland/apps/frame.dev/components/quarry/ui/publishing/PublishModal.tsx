/**
 * Publish Modal - Art Deco PR creation UI
 * @module codex/ui/PublishModal
 * 
 * @remarks
 * Orchestrates the journey from local draft to GitHub PR.
 * Provides real-time progress updates with Art Deco flair.
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Send, GitPullRequest, Check, AlertCircle,
  Loader2, Upload, GitBranch, GitCommit, ExternalLink, Copy
} from 'lucide-react'
import { GitSync, type SyncStatus, type RepoInfo, type FileChange, type MediaAsset } from '@/lib/github/gitSync'
import type { ThemeName } from '@/types/theme'

interface PublishModalProps {
  /** Whether modal is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** File path being edited */
  filePath: string
  /** Current content */
  content: string
  /** Current metadata */
  metadata: any
  /** Repository info */
  repo: RepoInfo
  /** Media assets to upload */
  assets?: MediaAsset[]
  /** Current theme */
  theme?: ThemeName
}

/**
 * Art Deco styled publish workflow modal
 * 
 * @remarks
 * - Fork detection and creation
 * - Asset upload progress
 * - Real-time commit status
 * - PR creation with preview
 * - Polling until merge (optional)
 */
export default function PublishModal({
  isOpen,
  onClose,
  filePath,
  content,
  metadata,
  repo,
  assets = [],
  theme = 'light',
}: PublishModalProps) {
  // IMPORTANT: status must be declared BEFORE gitSync since setStatus is passed to GitSync constructor
  const [status, setStatus] = useState<SyncStatus>({
    phase: 'idle',
    progress: 0,
    message: 'Ready to publish',
  })
  const [gitSync] = useState(() => new GitSync(setStatus))
  const [prTitle, setPrTitle] = useState('')
  const [prDescription, setPrDescription] = useState('')
  const [patConfigured, setPatConfigured] = useState(false)
  const [copied, setCopied] = useState(false)

  const manualEditUrl = useMemo(() => {
    const encodedPath = filePath.split('/').map(encodeURIComponent).join('/')
    return `https://github.com/${repo.owner}/${repo.repo}/edit/${repo.defaultBranch}/${encodedPath}`
  }, [filePath, repo.owner, repo.repo, repo.defaultBranch])

  const isDark = theme.includes('dark')
  const isSepia = theme.includes('sepia')

  // Check PAT on mount
  useEffect(() => {
    if (isOpen) {
      gitSync.initialize().then(setPatConfigured)
      
      // Generate default PR title and description
      const filename = filePath.split('/').pop() || 'Untitled'
      setPrTitle(`Update ${filename}`)
      setPrDescription(`Edited via Quarry Codex WYSIWYG editor\n\n**Changes:**\n- Updated content\n- ${assets.length} asset(s) added`)
    }
  }, [isOpen, filePath, assets.length, gitSync])

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy content for manual PR:', error)
    }
  }

  /**
   * Publish workflow
   */
  const handlePublish = async () => {
    if (!patConfigured) {
      alert('Please configure your GitHub PAT in Settings first.')
      return
    }

    if (!prTitle.trim()) {
      alert('Please enter a pull request title.')
      return
    }

    try {
      const changes: FileChange[] = [
        {
          path: filePath,
          content,
          encoding: 'utf-8',
        },
      ]

      await gitSync.sync(
        repo,
        changes,
        assets,
        prTitle,
        prTitle,
        prDescription
      )

      // Success! Keep modal open to show PR link
    } catch (error) {
      console.error('Publish failed:', error)
    }
  }

  if (!isOpen) return null

  const phaseIcons = {
    idle: Send,
    forking: GitBranch,
    uploading: Upload,
    committing: GitCommit,
    'pr-creating': GitPullRequest,
    polling: Loader2,
    complete: Check,
    error: AlertCircle,
  }

  const PhaseIcon = phaseIcons[status.phase]

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
          onClick={status.phase === 'idle' || status.phase === 'complete' || status.phase === 'error' ? onClose : undefined}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 50 }}
          transition={{ type: 'spring', damping: 20 }}
          className={`
            relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden
            ${isSepia && isDark ? 'bg-gradient-to-br from-amber-950 via-amber-900 to-amber-950' : ''}
            ${isSepia && !isDark ? 'bg-gradient-to-br from-amber-50 via-white to-amber-50' : ''}
            ${!isSepia && isDark ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : ''}
            ${!isSepia && !isDark ? 'bg-gradient-to-br from-white via-gray-50 to-white' : ''}
          `}
        >
          {/* Art Deco Header Pattern */}
          <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none opacity-10">
            <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
              <defs>
                <pattern id="publish-deco" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                  <path d="M50,0 L100,50 L50,100 L0,50 Z" fill="none" stroke="currentColor" strokeWidth="1" />
                  <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="1" />
                  <rect x="30" y="30" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect x="0" y="0" width="100%" height="100%" fill="url(#publish-deco)" />
            </svg>
          </div>

          {/* Header */}
          <div className={`
            relative px-8 py-6 border-b-2
            ${isDark ? 'border-amber-800' : 'border-amber-400'}
          `}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  animate={status.phase === 'polling' || status.phase === 'uploading' || status.phase === 'committing'
                    ? { rotate: 360 }
                    : {}
                  }
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className={`
                    p-3 rounded-xl
                    ${isDark ? 'bg-amber-900/50' : 'bg-amber-100'}
                  `}
                >
                  <PhaseIcon className={`w-6 h-6 ${
                    status.phase === 'error' ? 'text-red-600' :
                    status.phase === 'complete' ? 'text-green-600' :
                    'text-amber-700 dark:text-amber-300'
                  }`} />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-bold tracking-wider">
                    Publish to GitHub
                  </h2>
                  <p className="text-sm opacity-70">
                    {status.message}
                  </p>
                </div>
              </div>

              {(status.phase === 'idle' || status.phase === 'complete' || status.phase === 'error') && (
                <button
                  onClick={onClose}
                  className={`
                    p-2 rounded-lg transition-colors
                    ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}
                  `}
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="relative p-8 space-y-6">
            {/* Progress Bar */}
            {status.phase !== 'idle' && status.phase !== 'error' && (
              <div className="relative h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${status.progress}%` }}
                  transition={{ duration: 0.5 }}
                  className={`
                    h-full rounded-full
                    ${isDark 
                      ? 'bg-gradient-to-r from-amber-700 via-amber-600 to-amber-500' 
                      : 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700'
                    }
                  `}
                />
              </div>
            )}

            {/* Error State */}
            {status.phase === 'error' && status.error && (
              <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800">
                <p className="text-red-800 dark:text-red-200 font-medium">{status.error}</p>
              </div>
            )}

            {/* Success State */}
            {status.phase === 'complete' && status.pr && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`
                  p-6 rounded-xl border-2
                  ${isDark 
                    ? 'bg-green-900/20 border-green-700' 
                    : 'bg-green-50 border-green-300'
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-green-600">
                    <Check className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-green-800 dark:text-green-200 mb-2">
                      Pull Request Created!
                    </h3>
                    <p className="text-green-700 dark:text-green-300 mb-4">
                      Your changes have been submitted for review.
                    </p>
                    <a
                      href={status.pr.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`
                        inline-flex items-center gap-2 px-4 py-2 rounded-lg
                        font-semibold transition-colors
                        ${isDark
                          ? 'bg-green-700 hover:bg-green-600 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                        }
                      `}
                    >
                      <span>View Pull Request #{status.pr.number}</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Idle State - Form */}
            {status.phase === 'idle' && (
              <>
                {!patConfigured && (
                  <div className="p-4 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-800">
                    <div className="flex flex-col gap-3">
                      <p className="text-yellow-800 dark:text-yellow-200">
                        GitHub PAT not configured. You can still open the GitHub editor for this strand and paste the updated content to raise a PR.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={handleCopyContent}
                          className={`
                            inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors border
                            ${isDark
                              ? 'bg-gray-900 border-gray-800 hover:bg-gray-800 text-gray-100'
                              : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-800'
                            }
                          `}
                        >
                          <Copy className="w-4 h-4" />
                          {copied ? 'Copied content' : 'Copy updated content'}
                        </button>
                        <a
                          href={manualEditUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`
                            inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors border
                            ${isDark
                              ? 'bg-amber-900/30 border-amber-700 text-amber-100 hover:bg-amber-900/50'
                              : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                            }
                          `}
                        >
                          Open GitHub editor
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                      <p className="text-xs text-yellow-800 dark:text-yellow-200 opacity-80">
                        Opens {repo.owner}/{repo.repo} at `{filePath}` on {repo.defaultBranch}. Click "Propose changes" after pasting to create a PR without a PAT.
                      </p>
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Pull Request Title
                    </label>
                    <input
                      type="text"
                      value={prTitle}
                      onChange={(e) => setPrTitle(e.target.value)}
                      className={`
                        w-full px-4 py-3 rounded-lg border-2 transition-colors
                        ${isDark
                          ? 'bg-gray-800 border-gray-700 focus:border-amber-600'
                          : 'bg-white border-gray-300 focus:border-amber-500'
                        }
                        outline-none
                      `}
                      placeholder="Brief summary of changes"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Description (optional)
                    </label>
                    <textarea
                      value={prDescription}
                      onChange={(e) => setPrDescription(e.target.value)}
                      rows={4}
                      className={`
                        w-full px-4 py-3 rounded-lg border-2 transition-colors resize-none
                        ${isDark
                          ? 'bg-gray-800 border-gray-700 focus:border-amber-600'
                          : 'bg-white border-gray-300 focus:border-amber-500'
                        }
                        outline-none
                      `}
                      placeholder="What changed? Why?"
                    />
                  </div>

                  <div className={`
                    p-4 rounded-lg
                    ${isDark ? 'bg-gray-800' : 'bg-gray-100'}
                  `}>
                    <p className="text-sm font-medium mb-2">This will:</p>
                    <ul className="text-sm space-y-1 opacity-70">
                      <li>✓ Fork the repository (if needed)</li>
                      <li>✓ Upload {assets.length} media asset(s)</li>
                      <li>✓ Create a new branch</li>
                      <li>✓ Commit your changes</li>
                      <li>✓ Open a pull request for review</li>
                    </ul>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {status.phase === 'idle' && (
            <div className={`
              px-8 py-6 flex items-center justify-end gap-3
              border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}
            `}>
              <button
                onClick={onClose}
                className={`
                  px-6 py-3 rounded-lg font-semibold transition-colors
                  ${isDark
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }
                `}
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={!patConfigured || !prTitle.trim()}
                className={`
                  px-8 py-3 rounded-lg font-bold transition-all
                  flex items-center gap-2 shadow-lg
                  ${isDark
                    ? 'bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <GitPullRequest className="w-5 h-5" />
                <span>Publish Changes</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
