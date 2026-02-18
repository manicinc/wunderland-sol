/**
 * Template Publish Modal Component
 * @module codex/ui/TemplatePublishModal
 *
 * @description
 * Multi-step modal for publishing templates to GitHub.
 * Steps:
 * 1. Configure - select repo, path, PR options
 * 2. Preview - show template JSON and changes
 * 3. Publishing - loading state
 * 4. Success/Error - result display
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Github,
  ChevronRight,
  ChevronLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  GitPullRequest,
  GitCommit,
  FolderOpen,
  FileJson,
  Settings2,
  Key,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TemplateDraft, PublishTarget, PublishResult, TemplateRepository } from '@/lib/templates/types'
import { OFFICIAL_TEMPLATE_REPO } from '@/lib/templates/types'
import {
  publishToGitHub,
  getDefaultPublishTarget,
  generatePRBody,
  slugify,
  checkRepoAccess,
} from '@/lib/templates/templatePublisher'
import { getTemplateSourcePreferences } from '@/lib/templates/remoteTemplateLoader'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface TemplatePublishModalProps {
  /** Whether modal is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Template draft to publish */
  template: TemplateDraft
  /** Theme */
  isDark?: boolean
}

type PublishStep = 'configure' | 'preview' | 'publishing' | 'success' | 'error'

/* ═══════════════════════════════════════════════════════════════════════════
   STEP COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Step 1: Configure target
 */
function ConfigureStep({
  target,
  onChange,
  repositories,
  hasToken,
  isDark,
}: {
  target: PublishTarget
  onChange: (target: PublishTarget) => void
  repositories: TemplateRepository[]
  hasToken: boolean
  isDark: boolean
}) {
  return (
    <div className="space-y-6">
      {/* Token Warning */}
      {!hasToken && (
        <div
          className={cn(
            'flex items-start gap-3 p-4 rounded-lg',
            isDark ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'
          )}
        >
          <Key className="w-5 h-5 text-amber-500 mt-0.5" />
          <div>
            <div className={cn('font-medium', isDark ? 'text-amber-400' : 'text-amber-700')}>
              GitHub Token Required
            </div>
            <div className={cn('text-sm mt-1', isDark ? 'text-amber-400/80' : 'text-amber-600')}>
              Add a Personal Access Token in Settings → Integrations to publish templates.
            </div>
          </div>
        </div>
      )}

      {/* Repository Selection */}
      <div>
        <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-slate-300' : 'text-gray-700')}>
          Target Repository
        </label>
        <div className="space-y-2">
          {repositories.map((repo) => (
            <button
              key={repo.id}
              type="button"
              onClick={() => onChange({ ...target, repository: repo })}
              className={cn(
                'flex items-center gap-3 w-full p-3 rounded-lg text-left transition-colors',
                target.repository.id === repo.id
                  ? isDark
                    ? 'bg-cyan-500/20 border-cyan-500 border'
                    : 'bg-cyan-50 border-cyan-500 border'
                  : isDark
                  ? 'bg-slate-800 border-slate-700 border hover:bg-slate-700'
                  : 'bg-gray-50 border-gray-200 border hover:bg-gray-100'
              )}
            >
              <Github className={cn('w-5 h-5', isDark ? 'text-slate-400' : 'text-gray-500')} />
              <div className="flex-1 min-w-0">
                <div className={cn('font-medium text-sm', isDark ? 'text-slate-200' : 'text-gray-900')}>
                  {repo.name}
                  {repo.isOfficial && (
                    <span className="ml-2 text-xs text-cyan-500">(Official)</span>
                  )}
                </div>
                <div className={cn('text-xs', isDark ? 'text-slate-500' : 'text-gray-500')}>
                  {repo.owner}/{repo.repo}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Path */}
      <div>
        <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-slate-300' : 'text-gray-700')}>
          File Path
        </label>
        <div className="flex items-center gap-2">
          <span className={cn('text-sm', isDark ? 'text-slate-500' : 'text-gray-400')}>
            templates/
          </span>
          <input
            type="text"
            value={target.path}
            onChange={(e) => onChange({ ...target, path: e.target.value })}
            placeholder="category/template-name.json"
            className={cn(
              'flex-1 px-3 py-2 rounded-lg text-sm font-mono',
              isDark
                ? 'bg-slate-700 text-slate-200 placeholder:text-slate-500 border border-slate-600'
                : 'bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300',
              'focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500'
            )}
          />
        </div>
      </div>

      {/* PR vs Direct Commit */}
      <div>
        <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-slate-300' : 'text-gray-700')}>
          Publish Method
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onChange({ ...target, createPR: true })}
            className={cn(
              'flex items-center gap-3 p-4 rounded-lg text-left transition-colors',
              target.createPR
                ? isDark
                  ? 'bg-cyan-500/20 border-cyan-500 border'
                  : 'bg-cyan-50 border-cyan-500 border'
                : isDark
                ? 'bg-slate-800 border-slate-700 border hover:bg-slate-700'
                : 'bg-gray-50 border-gray-200 border hover:bg-gray-100'
            )}
          >
            <GitPullRequest className={cn('w-5 h-5', target.createPR ? 'text-cyan-500' : isDark ? 'text-slate-400' : 'text-gray-500')} />
            <div>
              <div className={cn('font-medium text-sm', isDark ? 'text-slate-200' : 'text-gray-900')}>
                Create Pull Request
              </div>
              <div className={cn('text-xs', isDark ? 'text-slate-500' : 'text-gray-500')}>
                Recommended for official repo
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onChange({ ...target, createPR: false })}
            className={cn(
              'flex items-center gap-3 p-4 rounded-lg text-left transition-colors',
              !target.createPR
                ? isDark
                  ? 'bg-cyan-500/20 border-cyan-500 border'
                  : 'bg-cyan-50 border-cyan-500 border'
                : isDark
                ? 'bg-slate-800 border-slate-700 border hover:bg-slate-700'
                : 'bg-gray-50 border-gray-200 border hover:bg-gray-100'
            )}
          >
            <GitCommit className={cn('w-5 h-5', !target.createPR ? 'text-cyan-500' : isDark ? 'text-slate-400' : 'text-gray-500')} />
            <div>
              <div className={cn('font-medium text-sm', isDark ? 'text-slate-200' : 'text-gray-900')}>
                Direct Commit
              </div>
              <div className={cn('text-xs', isDark ? 'text-slate-500' : 'text-gray-500')}>
                For your own repos only
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* PR Details (if creating PR) */}
      {target.createPR && (
        <div className="space-y-4">
          <div>
            <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-slate-300' : 'text-gray-700')}>
              PR Title
            </label>
            <input
              type="text"
              value={target.prTitle || ''}
              onChange={(e) => onChange({ ...target, prTitle: e.target.value })}
              placeholder="feat: Add new template"
              className={cn(
                'w-full px-3 py-2 rounded-lg text-sm',
                isDark
                  ? 'bg-slate-700 text-slate-200 placeholder:text-slate-500 border border-slate-600'
                  : 'bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300',
                'focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500'
              )}
            />
          </div>

          <div>
            <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-slate-300' : 'text-gray-700')}>
              PR Description
            </label>
            <textarea
              value={target.prBody || ''}
              onChange={(e) => onChange({ ...target, prBody: e.target.value })}
              placeholder="Describe your template..."
              rows={6}
              className={cn(
                'w-full px-3 py-2 rounded-lg text-sm resize-none',
                isDark
                  ? 'bg-slate-700 text-slate-200 placeholder:text-slate-500 border border-slate-600'
                  : 'bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300',
                'focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500'
              )}
            />
          </div>
        </div>
      )}

      {/* Commit Message (if direct commit) */}
      {!target.createPR && (
        <div>
          <label className={cn('block text-sm font-medium mb-2', isDark ? 'text-slate-300' : 'text-gray-700')}>
            Commit Message
          </label>
          <input
            type="text"
            value={target.commitMessage}
            onChange={(e) => onChange({ ...target, commitMessage: e.target.value })}
            placeholder="feat: add new template"
            className={cn(
              'w-full px-3 py-2 rounded-lg text-sm',
              isDark
                ? 'bg-slate-700 text-slate-200 placeholder:text-slate-500 border border-slate-600'
                : 'bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300',
              'focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500'
            )}
          />
        </div>
      )}

      {/* Update Registry */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={target.updateRegistry}
          onChange={(e) => onChange({ ...target, updateRegistry: e.target.checked })}
          className="rounded"
        />
        <span className={cn('text-sm', isDark ? 'text-slate-300' : 'text-gray-700')}>
          Update registry.json (recommended)
        </span>
      </label>
    </div>
  )
}

/**
 * Step 2: Preview changes
 */
function PreviewStep({
  template,
  target,
  isDark,
}: {
  template: TemplateDraft
  target: PublishTarget
  isDark: boolean
}) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className={cn('p-4 rounded-lg', isDark ? 'bg-slate-800' : 'bg-gray-50')}>
        <h4 className={cn('font-medium mb-3', isDark ? 'text-slate-200' : 'text-gray-900')}>
          Publish Summary
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Github className={cn('w-4 h-4', isDark ? 'text-slate-400' : 'text-gray-500')} />
            <span className={cn(isDark ? 'text-slate-400' : 'text-gray-500')}>Repository:</span>
            <span className={cn(isDark ? 'text-slate-200' : 'text-gray-900')}>
              {target.repository.owner}/{target.repository.repo}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FolderOpen className={cn('w-4 h-4', isDark ? 'text-slate-400' : 'text-gray-500')} />
            <span className={cn(isDark ? 'text-slate-400' : 'text-gray-500')}>Path:</span>
            <span className={cn('font-mono', isDark ? 'text-slate-200' : 'text-gray-900')}>
              templates/{target.path}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {target.createPR ? (
              <GitPullRequest className={cn('w-4 h-4', isDark ? 'text-slate-400' : 'text-gray-500')} />
            ) : (
              <GitCommit className={cn('w-4 h-4', isDark ? 'text-slate-400' : 'text-gray-500')} />
            )}
            <span className={cn(isDark ? 'text-slate-400' : 'text-gray-500')}>Method:</span>
            <span className={cn(isDark ? 'text-slate-200' : 'text-gray-900')}>
              {target.createPR ? 'Pull Request' : 'Direct Commit'}
            </span>
          </div>
        </div>
      </div>

      {/* Template Info */}
      <div className={cn('p-4 rounded-lg', isDark ? 'bg-slate-800' : 'bg-gray-50')}>
        <h4 className={cn('font-medium mb-3', isDark ? 'text-slate-200' : 'text-gray-900')}>
          Template Details
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <FileJson className={cn('w-4 h-4 mt-0.5', isDark ? 'text-slate-400' : 'text-gray-500')} />
            <div>
              <div className={cn(isDark ? 'text-slate-200' : 'text-gray-900')}>{template.name}</div>
              <div className={cn('text-xs', isDark ? 'text-slate-500' : 'text-gray-500')}>
                {template.category} • {template.difficulty} • {template.fields.length} fields
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PR Preview */}
      {target.createPR && (
        <div>
          <h4 className={cn('font-medium mb-2', isDark ? 'text-slate-300' : 'text-gray-700')}>
            PR Preview
          </h4>
          <div className={cn('p-4 rounded-lg border', isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200')}>
            <div className={cn('font-medium mb-2', isDark ? 'text-slate-200' : 'text-gray-900')}>
              {target.prTitle}
            </div>
            <div className={cn('text-sm whitespace-pre-wrap', isDark ? 'text-slate-400' : 'text-gray-600')}>
              {target.prBody}
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className={cn('flex items-start gap-2 p-3 rounded-lg text-sm', isDark ? 'bg-slate-800/50' : 'bg-gray-50')}>
        <Info className={cn('w-4 h-4 mt-0.5', isDark ? 'text-slate-400' : 'text-gray-500')} />
        <div className={cn(isDark ? 'text-slate-400' : 'text-gray-600')}>
          {target.createPR
            ? 'A new branch will be created and a pull request will be opened for review.'
            : 'Changes will be committed directly to the default branch.'}
        </div>
      </div>
    </div>
  )
}

/**
 * Step 3: Publishing
 */
function PublishingStep({ isDark }: { isDark: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className={cn('w-12 h-12 animate-spin mb-4', isDark ? 'text-cyan-400' : 'text-cyan-500')} />
      <div className={cn('text-lg font-medium', isDark ? 'text-slate-200' : 'text-gray-900')}>
        Publishing Template...
      </div>
      <div className={cn('text-sm mt-2', isDark ? 'text-slate-400' : 'text-gray-500')}>
        This may take a few seconds
      </div>
    </div>
  )
}

/**
 * Step 4: Success
 */
function SuccessStep({
  result,
  target,
  isDark,
}: {
  result: PublishResult
  target: PublishTarget
  isDark: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className={cn('w-16 h-16 rounded-full flex items-center justify-center mb-4', isDark ? 'bg-green-500/20' : 'bg-green-100')}>
        <CheckCircle className="w-8 h-8 text-green-500" />
      </div>
      <div className={cn('text-lg font-medium', isDark ? 'text-slate-200' : 'text-gray-900')}>
        {target.createPR ? 'Pull Request Created!' : 'Template Published!'}
      </div>
      <div className={cn('text-sm mt-2 text-center', isDark ? 'text-slate-400' : 'text-gray-500')}>
        {target.createPR
          ? `PR #${result.prNumber} has been opened for review.`
          : 'Your template has been committed to the repository.'}
      </div>
      {result.url && (
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex items-center gap-2 mt-6 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            isDark
              ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
              : 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100'
          )}
        >
          <ExternalLink className="w-4 h-4" />
          View on GitHub
        </a>
      )}
    </div>
  )
}

/**
 * Step 4 (alt): Error
 */
function ErrorStep({
  result,
  onRetry,
  isDark,
}: {
  result: PublishResult
  onRetry: () => void
  isDark: boolean
}) {
  const errorMessage = useMemo(() => {
    switch (result.errorType) {
      case 'auth':
        return 'Authentication failed. Check your GitHub token in Settings → Integrations.'
      case 'permission':
        return 'Permission denied. You may not have write access to this repository.'
      case 'conflict':
        return 'A file conflict occurred. The template may already exist.'
      case 'validation':
        return result.error || 'Template validation failed.'
      default:
        return result.error || 'An unexpected error occurred.'
    }
  }, [result])

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className={cn('w-16 h-16 rounded-full flex items-center justify-center mb-4', isDark ? 'bg-red-500/20' : 'bg-red-100')}>
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <div className={cn('text-lg font-medium', isDark ? 'text-slate-200' : 'text-gray-900')}>
        Publishing Failed
      </div>
      <div className={cn('text-sm mt-2 text-center max-w-md', isDark ? 'text-slate-400' : 'text-gray-500')}>
        {errorMessage}
      </div>
      <button
        type="button"
        onClick={onRetry}
        className={cn(
          'flex items-center gap-2 mt-6 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
          isDark
            ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        )}
      >
        Try Again
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function TemplatePublishModal({
  isOpen,
  onClose,
  template,
  isDark = true,
}: TemplatePublishModalProps) {
  const [step, setStep] = useState<PublishStep>('configure')
  const [target, setTarget] = useState<PublishTarget>(() => getDefaultPublishTarget(template))
  const [result, setResult] = useState<PublishResult | null>(null)
  const [repositories, setRepositories] = useState<TemplateRepository[]>([])
  const [hasToken, setHasToken] = useState(false)

  // Load repositories and check token
  useEffect(() => {
    if (!isOpen) return

    const prefs = getTemplateSourcePreferences()
    setRepositories(prefs.repositories.filter((r) => r.enabled))

    // Check for token
    try {
      const settings = localStorage.getItem('codex-settings')
      if (settings) {
        const parsed = JSON.parse(settings)
        setHasToken(!!parsed.githubToken || !!parsed.github?.pat)
      }
    } catch {
      setHasToken(false)
    }
  }, [isOpen])

  // Update target when template changes
  useEffect(() => {
    setTarget(getDefaultPublishTarget(template))
  }, [template])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('configure')
      setResult(null)
    }
  }, [isOpen])

  // Handle publish
  const handlePublish = useCallback(async () => {
    setStep('publishing')

    const publishResult = await publishToGitHub(template, target)
    setResult(publishResult)

    if (publishResult.success) {
      setStep('success')
    } else {
      setStep('error')
    }
  }, [template, target])

  // Handle retry
  const handleRetry = useCallback(() => {
    setStep('configure')
    setResult(null)
  }, [])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={cn(
            'relative w-full max-w-xl rounded-xl shadow-2xl overflow-hidden',
            isDark ? 'bg-slate-900' : 'bg-white'
          )}
        >
          {/* Header */}
          <div className={cn('flex items-center justify-between p-4 border-b', isDark ? 'border-slate-700' : 'border-gray-200')}>
            <div className="flex items-center gap-3">
              <Github className={cn('w-5 h-5', isDark ? 'text-slate-400' : 'text-gray-500')} />
              <h2 className={cn('font-semibold text-lg', isDark ? 'text-slate-200' : 'text-gray-900')}>
                Publish to GitHub
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
              )}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {step === 'configure' && (
                  <ConfigureStep
                    target={target}
                    onChange={setTarget}
                    repositories={repositories}
                    hasToken={hasToken}
                    isDark={isDark}
                  />
                )}
                {step === 'preview' && (
                  <PreviewStep template={template} target={target} isDark={isDark} />
                )}
                {step === 'publishing' && <PublishingStep isDark={isDark} />}
                {step === 'success' && result && (
                  <SuccessStep result={result} target={target} isDark={isDark} />
                )}
                {step === 'error' && result && (
                  <ErrorStep result={result} onRetry={handleRetry} isDark={isDark} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          {(step === 'configure' || step === 'preview') && (
            <div className={cn('flex items-center justify-between p-4 border-t', isDark ? 'border-slate-700' : 'border-gray-200')}>
              {step === 'configure' ? (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      isDark
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('preview')}
                    disabled={!hasToken}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      hasToken
                        ? isDark
                          ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                          : 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100'
                        : 'opacity-50 cursor-not-allowed bg-slate-700 text-slate-500'
                    )}
                  >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setStep('configure')}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      isDark
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handlePublish}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      isDark
                        ? 'bg-cyan-500 text-white hover:bg-cyan-600'
                        : 'bg-cyan-500 text-white hover:bg-cyan-600'
                    )}
                  >
                    <Github className="w-4 h-4" />
                    Publish
                  </button>
                </>
              )}
            </div>
          )}

          {/* Close Button for Success/Error */}
          {(step === 'success' || step === 'error') && (
            <div className={cn('flex justify-center p-4 border-t', isDark ? 'border-slate-700' : 'border-gray-200')}>
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'px-6 py-2 rounded-lg text-sm font-medium transition-colors',
                  isDark
                    ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                Close
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
