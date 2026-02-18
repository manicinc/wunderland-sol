'use client'

/**
 * Publish Workflow Component
 * @module codex/ui/PublishWorkflow
 * 
 * Handles the draft -> publish flow:
 * - Auto-save drafts locally
 * - Create GitHub PR on publish
 * - Track Actions status
 * - Show processing pipeline
 */

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  GitPullRequest,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Clock,
  Zap,
  FileText,
  GitBranch,
  ArrowRight,
  X,
  Edit3,
  Eye,
  Check,
  Copy,
} from 'lucide-react'
import { getStoredPAT, hasPATConfigured } from '../integrations/GitHubPATConfig'
import type { SourceMetadata } from '@/types/sourceMetadata'

interface PublishWorkflowProps {
  /** Content to publish */
  content: string
  /** File name */
  fileName: string
  /** Target path in repo */
  targetPath: string
  /** Extracted metadata */
  metadata?: {
    title?: string
    summary?: string
    tags?: string[]
  }
  /** Source metadata */
  source?: SourceMetadata
  /** Theme */
  theme?: string
  /** Callback on successful publish */
  onPublished?: (prUrl: string) => void
  /** Callback to open PAT config */
  onConfigurePAT?: () => void
}

type WorkflowStep = 'idle' | 'validating' | 'creating-branch' | 'committing' | 'creating-pr' | 'success' | 'error'

const REPO_OWNER = 'framersai'
const REPO_NAME = 'codex'
const BASE_BRANCH = 'main'

export default function PublishWorkflow({
  content,
  fileName,
  targetPath,
  metadata,
  source,
  theme = 'light',
  onPublished,
  onConfigurePAT,
}: PublishWorkflowProps) {
  const isDark = theme.includes('dark')
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<WorkflowStep>('idle')
  const [error, setError] = useState<string | null>(null)
  const [prUrl, setPrUrl] = useState<string | null>(null)
  const [branchName, setBranchName] = useState('')
  const [commitMessage, setCommitMessage] = useState('')
  const [prTitle, setPrTitle] = useState('')
  const [prDescription, setPrDescription] = useState('')
  const [copied, setCopied] = useState(false)

  // Initialize form values
  useEffect(() => {
    const slug = fileName.replace('.md', '').replace(/\s+/g, '-').toLowerCase()
    setBranchName(`strand/${slug}-${Date.now().toString(36)}`)
    setCommitMessage(`feat(strand): add ${metadata?.title || fileName}`)
    setPrTitle(`Add strand: ${metadata?.title || fileName}`)

    // Build PR description with source metadata
    let description = `## New Strand\n\n${metadata?.summary || 'No summary provided'}\n\n### Tags\n${metadata?.tags?.map(t => `- ${t}`).join('\n') || 'None'}`

    if (source) {
      description += `\n\n### Source\n- Type: ${source.sourceType}\n- Creator: ${source.creator} (${source.creatorType})`
      if (source.sourceUrl) description += `\n- URL: ${source.sourceUrl}`
      if (source.sourceFilename) description += `\n- File: ${source.sourceFilename}`
      description += `\n- Created: ${new Date(source.createdAt).toLocaleString()}`
      if (source.uploadedAt) description += `\n- Uploaded: ${new Date(source.uploadedAt).toLocaleString()}`
    }

    setPrDescription(description)
  }, [fileName, metadata, source])

  const hasPAT = hasPATConfigured()

  // Execute publish workflow
  const publish = useCallback(async () => {
    if (!hasPAT) {
      onConfigurePAT?.()
      return
    }

    const pat = getStoredPAT()
    if (!pat) return

    setStep('validating')
    setError(null)

    const headers = {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    }

    try {
      // 1. Get base branch SHA
      const baseRef = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/ref/heads/${BASE_BRANCH}`,
        { headers }
      ).then(r => r.json())

      if (baseRef.message) throw new Error(baseRef.message)
      const baseSha = baseRef.object.sha

      // 2. Create new branch
      setStep('creating-branch')
      const branchRes = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            ref: `refs/heads/${branchName}`,
            sha: baseSha,
          }),
        }
      ).then(r => r.json())

      if (branchRes.message && !branchRes.message.includes('already exists')) {
        throw new Error(branchRes.message)
      }

      // 3. Create/update file
      setStep('committing')
      const filePath = `${targetPath}${fileName}`.replace(/^\//, '').replace(/\/+/g, '/')
      
      const commitRes = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            message: commitMessage,
            content: btoa(unescape(encodeURIComponent(content))), // Base64 encode with UTF-8 support
            branch: branchName,
          }),
        }
      ).then(r => r.json())

      if (commitRes.message && !commitRes.commit) {
        throw new Error(commitRes.message)
      }

      // 4. Create PR
      setStep('creating-pr')
      const prRes = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            title: prTitle,
            body: prDescription,
            head: branchName,
            base: BASE_BRANCH,
          }),
        }
      ).then(r => r.json())

      if (prRes.message) {
        throw new Error(prRes.message)
      }

      // Success!
      setStep('success')
      setPrUrl(prRes.html_url)
      onPublished?.(prRes.html_url)

    } catch (err) {
      setStep('error')
      setError(err instanceof Error ? err.message : 'Publish failed')
    }
  }, [branchName, commitMessage, content, fileName, hasPAT, metadata, onConfigurePAT, onPublished, prDescription, prTitle, targetPath])

  const stepLabels: Record<WorkflowStep, string> = {
    idle: 'Ready to publish',
    validating: 'Validating...',
    'creating-branch': 'Creating branch...',
    committing: 'Committing file...',
    'creating-pr': 'Creating pull request...',
    success: 'Published!',
    error: 'Failed',
  }

  return (
    <>
      {/* Publish Button */}
      <button
        onClick={() => setIsOpen(true)}
        disabled={!content || content.length < 10}
        title={!content || content.length < 10 ? 'Add some content first (at least 10 characters)' : 'Publish to GitHub'}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
          ${!content || content.length < 10
            ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed dark:bg-zinc-700'
            : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/25'
          }
        `}
      >
        <Send className="w-4 h-4" />
        Publish
      </button>

      {/* Publish Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => step !== 'success' && setIsOpen(false)}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className={`
                relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden
                ${isDark ? 'bg-zinc-900' : 'bg-white'}
              `}
            >
              {/* Header */}
              <div className={`px-6 py-4 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-100'}`}>
                      <GitPullRequest className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                        Publish Strand
                      </h2>
                      <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                        Create a pull request to add this strand
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className={`p-2 rounded-lg ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Progress Steps */}
                <div className="flex items-center justify-between text-xs">
                  <ProgressStep
                    label="Validate"
                    status={step === 'validating' ? 'active' : ['creating-branch', 'committing', 'creating-pr', 'success'].includes(step) ? 'done' : step === 'error' ? 'error' : 'pending'}
                    isDark={isDark}
                  />
                  <div className={`flex-1 h-px mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
                  <ProgressStep
                    label="Branch"
                    status={step === 'creating-branch' ? 'active' : ['committing', 'creating-pr', 'success'].includes(step) ? 'done' : step === 'error' ? 'error' : 'pending'}
                    isDark={isDark}
                  />
                  <div className={`flex-1 h-px mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
                  <ProgressStep
                    label="Commit"
                    status={step === 'committing' ? 'active' : ['creating-pr', 'success'].includes(step) ? 'done' : 'pending'}
                    isDark={isDark}
                  />
                  <div className={`flex-1 h-px mx-2 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
                  <ProgressStep
                    label="PR"
                    status={step === 'creating-pr' ? 'active' : step === 'success' ? 'done' : 'pending'}
                    isDark={isDark}
                  />
                </div>

                {/* Form (only show when idle) */}
                {step === 'idle' && (
                  <div className="space-y-4">
                    {/* File info */}
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'} flex items-center gap-3`}>
                      <FileText className="w-5 h-5 text-emerald-500" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                          {targetPath}{fileName}
                        </p>
                        <p className="text-xs text-zinc-500">{content.length} characters</p>
                      </div>
                    </div>

                    {/* Commit message */}
                    <div className="space-y-1">
                      <label className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        Commit Message
                      </label>
                      <input
                        type="text"
                        value={commitMessage}
                        onChange={e => setCommitMessage(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-300'}`}
                      />
                    </div>

                    {/* PR Title */}
                    <div className="space-y-1">
                      <label className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        Pull Request Title
                      </label>
                      <input
                        type="text"
                        value={prTitle}
                        onChange={e => setPrTitle(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-300'}`}
                      />
                    </div>

                    {/* PR Description */}
                    <div className="space-y-1">
                      <label className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        Description
                      </label>
                      <textarea
                        value={prDescription}
                        onChange={e => setPrDescription(e.target.value)}
                        rows={4}
                        className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-300'}`}
                      />
                    </div>
                  </div>
                )}

                {/* Processing State */}
                {['validating', 'creating-branch', 'committing', 'creating-pr'].includes(step) && (
                  <div className={`p-6 rounded-xl text-center ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
                    <Loader2 className="w-8 h-8 mx-auto text-emerald-500 animate-spin mb-3" />
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      {stepLabels[step]}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">Please wait...</p>
                  </div>
                )}

                {/* Success State */}
                {step === 'success' && (
                  <div className={`p-6 rounded-xl text-center ${isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'}`}>
                    <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      Published Successfully!
                    </p>
                    <p className="text-xs text-zinc-500 mt-1 mb-4">
                      Your pull request has been created
                    </p>
                    {prUrl && (
                      <a
                        href={prUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                      >
                        View Pull Request
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                )}

                {/* Error State */}
                {step === 'error' && (
                  <div className={`p-6 rounded-xl ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
                    <AlertCircle className="w-8 h-8 mx-auto text-red-500 mb-3" />
                    <p className={`font-medium text-center ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      Publish Failed
                    </p>
                    <p className="text-xs text-red-500 text-center mt-1">{error}</p>
                    <button
                      onClick={() => setStep('idle')}
                      className="mt-4 w-full py-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30 text-sm font-medium"
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {/* Manual PR Option (when no PAT) */}
                {!hasPAT && step === 'idle' && (
                  <div className={`p-4 rounded-lg border ${isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-200 bg-zinc-50'}`}>
                    <p className={`text-sm font-medium mb-3 ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                      No GitHub PAT configured. Create manually:
                    </p>
                    <ol className={`text-xs mb-3 space-y-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      <li>1. Copy content below</li>
                      <li>2. Click "Create on GitHub"</li>
                      <li>3. Paste content and commit</li>
                    </ol>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(content)
                          setCopied(true)
                          setTimeout(() => setCopied(false), 2000)
                        }}
                        className={`w-full px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${copied ? 'bg-emerald-500 text-white' : isDark ? 'bg-zinc-700 hover:bg-zinc-600 text-white' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'}`}
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copied! Now click below' : '1. Copy Content'}
                      </button>
                      <a
                        href={`https://github.com/${REPO_OWNER}/${REPO_NAME}/new/master/${encodeURIComponent(targetPath)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
                      >
                        <GitPullRequest className="w-4 h-4" />
                        2. Create on GitHub →
                      </a>
                    </div>
                    <p className={`text-xs mt-3 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                      Or configure a GitHub PAT in <span className="text-emerald-500">Settings → GitHub Token</span> (click the profile icon in the toolbar) for automatic publishing.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              {step === 'idle' && (
                <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                  <button
                    onClick={() => setIsOpen(false)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
                  >
                    {hasPAT ? 'Cancel' : 'Close'}
                  </button>
                  {hasPAT && (
                    <button
                      onClick={publish}
                      className="px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 bg-emerald-500 text-white hover:bg-emerald-600"
                    >
                      <GitPullRequest className="w-4 h-4" />
                      Create Pull Request
                    </button>
                  )}
                </div>
              )}

              {step === 'success' && (
                <div className={`px-6 py-4 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                  <button
                    onClick={() => setIsOpen(false)}
                    className={`w-full py-2 rounded-lg text-sm font-medium ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
                  >
                    Close
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function ProgressStep({ label, status, isDark }: { label: string; status: 'pending' | 'active' | 'done' | 'error'; isDark: boolean }) {
  return (
    <div className={`flex items-center gap-1 ${
      status === 'done' ? 'text-emerald-500' :
      status === 'active' ? 'text-blue-500' :
      status === 'error' ? 'text-red-500' :
      'text-zinc-400'
    }`}>
      {status === 'active' && <Loader2 className="w-3 h-3 animate-spin" />}
      {status === 'done' && <CheckCircle2 className="w-3 h-3" />}
      {status === 'error' && <AlertCircle className="w-3 h-3" />}
      {status === 'pending' && <Clock className="w-3 h-3" />}
      <span>{label}</span>
    </div>
  )
}

