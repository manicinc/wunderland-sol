/**
 * Move Publish Modal
 * Shows pending file moves and allows user to publish them
 * Supports GitHub PR, vault filesystem, or SQLite-only modes
 *
 * @module codex/ui/MovePublishModal
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ArrowRight,
  Folder,
  FileText,
  GitPullRequest,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
  Github,
  Clock,
  Database,
  FolderSync,
} from 'lucide-react'
import type { MoveOperation } from '@/components/quarry/tree/types'
import type { PublishTarget } from '@/lib/planner/hooks/useTreePersistence'
import { checkVaultStatus } from '@/lib/vault'

interface MovePublishModalProps {
  /** Whether modal is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Pending move operations */
  operations: MoveOperation[]
  /** Publish callback - creates PR with moves */
  onPublish: (operations: MoveOperation[]) => Promise<void>
  /** Clear all operations callback */
  onClearAll?: () => void
  /** Remove single operation callback */
  onRemoveOperation?: (index: number) => void
  /** Theme */
  isDark?: boolean
  /** Override publish target (auto-detected if not provided) */
  publishTarget?: PublishTarget
  /** Callback when NLP processing should be triggered */
  onNLPProcess?: (operations: MoveOperation[]) => void
}

/**
 * Format a path for display (truncate if long)
 */
function formatPath(path: string, maxLength = 40): string {
  if (path.length <= maxLength) return path
  const parts = path.split('/')
  if (parts.length <= 2) return path

  // Keep first and last parts
  return `${parts[0]}/.../${parts.slice(-2).join('/')}`
}

/**
 * Format timestamp to relative time
 */
function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

/**
 * Get icon and label for publish target
 */
function getTargetInfo(target: PublishTarget): {
  icon: typeof Github
  label: string
  description: string
  buttonLabel: string
} {
  switch (target) {
    case 'github':
      return {
        icon: Github,
        label: 'GitHub',
        description: 'Create a pull request with your changes',
        buttonLabel: 'Create Pull Request',
      }
    case 'vault':
      return {
        icon: FolderSync,
        label: 'Local Vault',
        description: 'Move files in your local vault folder',
        buttonLabel: 'Apply to Vault',
      }
    case 'sqlite':
    default:
      return {
        icon: Database,
        label: 'Local Database',
        description: 'Save changes to local database only',
        buttonLabel: 'Save Locally',
      }
  }
}

export default function MovePublishModal({
  isOpen,
  onClose,
  operations,
  onPublish,
  onClearAll,
  onRemoveOperation,
  isDark = false,
  publishTarget: propPublishTarget,
  onNLPProcess,
}: MovePublishModalProps) {
  const [step, setStep] = useState<'review' | 'submitting' | 'success' | 'error'>('review')
  const [errorMessage, setErrorMessage] = useState('')
  const [prUrl, setPrUrl] = useState<string | null>(null)
  const [detectedTarget, setDetectedTarget] = useState<PublishTarget>('sqlite')

  // Detect publish target on mount if not provided
  useEffect(() => {
    if (propPublishTarget) {
      setDetectedTarget(propPublishTarget)
      return
    }

    const detectTarget = async () => {
      // Check for GitHub PAT first
      const githubPAT = localStorage.getItem('openstrand_github_pat')
      if (githubPAT) {
        setDetectedTarget('github')
        return
      }

      // Check for vault
      try {
        const vaultStatus = await checkVaultStatus()
        if (vaultStatus.status === 'ready') {
          setDetectedTarget('vault')
          return
        }
      } catch {
        // Vault not available
      }

      // Default to SQLite only
      setDetectedTarget('sqlite')
    }

    detectTarget()
  }, [propPublishTarget])

  const publishTarget = propPublishTarget || detectedTarget
  const targetInfo = getTargetInfo(publishTarget)
  const TargetIcon = targetInfo.icon

  const handlePublish = useCallback(async () => {
    if (operations.length === 0) return

    setStep('submitting')
    setErrorMessage('')

    try {
      await onPublish(operations)

      // Trigger NLP processing after successful publish
      onNLPProcess?.(operations)

      setStep('success')
    } catch (error) {
      console.error('[MovePublishModal] Publish error:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Failed to publish changes')
      setStep('error')
    }
  }, [operations, onPublish, onNLPProcess])

  const handleClose = useCallback(() => {
    // Reset state when closing
    setStep('review')
    setErrorMessage('')
    setPrUrl(null)
    onClose()
  }, [onClose])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 dark:bg-black/80 z-[10000] backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`
                w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-8
                ${isDark ? 'bg-zinc-900' : 'bg-white'}
              `}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`
                p-5 border-b
                ${isDark
                  ? 'border-zinc-800 bg-gradient-to-r from-amber-900/20 to-orange-900/20'
                  : 'border-zinc-200 bg-gradient-to-r from-amber-50 to-orange-50'
                }
              `}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className={`text-xl font-bold flex items-center gap-3 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      <TargetIcon className="w-6 h-6 text-amber-500" />
                      Publish File Moves
                    </h2>
                    <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {operations.length} pending {operations.length === 1 ? 'move' : 'moves'} → {targetInfo.label}
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 max-h-[60vh] overflow-y-auto">
                {step === 'review' && (
                  <div className="space-y-4">
                    {/* Operations list */}
                    <div className="space-y-2">
                      {operations.map((op, index) => (
                        <motion.div
                          key={`${op.sourcePath}-${op.timestamp}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`
                            relative p-3 rounded-xl border
                            ${isDark
                              ? 'bg-zinc-800/50 border-zinc-700'
                              : 'bg-zinc-50 border-zinc-200'
                            }
                          `}
                        >
                          <div className="flex items-start gap-3">
                            {/* Icon */}
                            {op.nodeType === 'dir' ? (
                              <Folder className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            ) : (
                              <FileText className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            )}

                            {/* Paths */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <code className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-zinc-900 text-zinc-300' : 'bg-white text-zinc-700'}`}>
                                  {formatPath(op.sourcePath)}
                                </code>
                                <ArrowRight className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                <code className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-50 text-emerald-700'}`}>
                                  {formatPath(op.destPath)}
                                </code>
                              </div>
                              <div className={`flex items-center gap-2 mt-1 text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                <Clock className="w-3 h-3" />
                                {formatRelativeTime(op.timestamp)}
                              </div>
                            </div>

                            {/* Remove button */}
                            {onRemoveOperation && (
                              <button
                                onClick={() => onRemoveOperation(index)}
                                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-700 text-zinc-500' : 'hover:bg-zinc-200 text-zinc-400'}`}
                                title="Remove this move"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {operations.length === 0 && (
                      <div className={`text-center py-8 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        <Folder className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No pending moves</p>
                      </div>
                    )}

                    {/* Actions */}
                    {operations.length > 0 && (
                      <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                          {onClearAll && (
                            <button
                              onClick={onClearAll}
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isDark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-600 hover:bg-zinc-100'}`}
                            >
                              Clear all
                            </button>
                          )}
                        </div>
                        <button
                          onClick={handlePublish}
                          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/20"
                        >
                          <TargetIcon className="w-4 h-4" />
                          {targetInfo.buttonLabel}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {step === 'submitting' && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
                    <p className={`text-lg font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      Creating pull request...
                    </p>
                    <p className={`text-sm mt-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      Moving {operations.length} {operations.length === 1 ? 'file' : 'files'}
                    </p>
                  </div>
                )}

                {step === 'success' && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                      <CheckCircle className="w-10 h-10 text-emerald-500" />
                    </div>
                    <p className={`text-lg font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      {publishTarget === 'github' ? 'Pull request created!' : 'Changes published!'}
                    </p>
                    <p className={`text-sm mt-2 text-center max-w-md ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {publishTarget === 'github'
                        ? 'Your file moves have been submitted as a pull request. Merge it to apply the changes.'
                        : publishTarget === 'vault'
                          ? 'Your files have been moved in your local vault folder.'
                          : 'Your changes have been saved to the local database.'}
                    </p>
                    {prUrl && publishTarget === 'github' && (
                      <a
                        href={prUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                      >
                        <Github className="w-4 h-4" />
                        View Pull Request
                      </a>
                    )}
                    <button
                      onClick={handleClose}
                      className="mt-6 text-sm text-amber-500 hover:text-amber-600 font-medium"
                    >
                      Close
                    </button>
                  </div>
                )}

                {step === 'error' && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                      <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <p className={`text-lg font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      Failed to create PR
                    </p>
                    <p className={`text-sm mt-2 text-center max-w-md ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {errorMessage || 'An error occurred while creating the pull request.'}
                    </p>
                    <div className="flex items-center gap-3 mt-6">
                      <button
                        onClick={() => setStep('review')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg ${isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200'}`}
                      >
                        Back to review
                      </button>
                      <button
                        onClick={handlePublish}
                        className="px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg"
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

/**
 * Pending moves indicator badge
 * Shows in the header/toolbar when there are unpublished moves
 */
export function PendingMovesBadge({
  count,
  onClick,
  isDark = false,
}: {
  count: number
  onClick: () => void
  isDark?: boolean
}) {
  if (count === 0) return null

  return (
    <motion.button
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full
        text-xs font-semibold transition-all
        ${isDark
          ? 'bg-amber-900/50 text-amber-300 hover:bg-amber-900/70'
          : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
        }
      `}
      title={`${count} pending ${count === 1 ? 'move' : 'moves'} to publish`}
    >
      <GitPullRequest className="w-3.5 h-3.5" />
      <span>{count} unpublished</span>
    </motion.button>
  )
}
