'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ChevronRight, ChevronLeft, ExternalLink, CheckCircle2,
  AlertCircle, Key, Users, GitPullRequest, Zap, Settings,
  Shield, HelpCircle, Info, BookOpen, Github
} from 'lucide-react'
import Link from 'next/link'
import {
  type WeaverStatus,
  type PublishCapability,
  checkWeaverStatus,
  getPublishCapability,
  getWeaversListUrl,
  buildGitHubEditUrl
} from '@/lib/weaver'

interface PublishGuideModalProps {
  isOpen: boolean
  onClose: () => void
  onProceed: (method: PublishCapability['method']) => void
  filePath?: string
  hasPAT: boolean
  pat?: string
  theme?: string
  /** If true, skip showing the guide in the future */
  onDontShowAgain?: () => void
  /** Whether user has opted out of this guide */
  dontShowAgain?: boolean
}

type Step = 'intro' | 'auth' | 'weaver-check' | 'method' | 'confirm'

export default function PublishGuideModal({
  isOpen,
  onClose,
  onProceed,
  filePath,
  hasPAT,
  pat,
  theme = 'light',
  onDontShowAgain,
  dontShowAgain = false
}: PublishGuideModalProps) {
  const isDark = theme.includes('dark')
  const [step, setStep] = useState<Step>('intro')
  const [weaverStatus, setWeaverStatus] = useState<WeaverStatus | null>(null)
  const [publishCapability, setPublishCapability] = useState<PublishCapability | null>(null)
  const [loading, setLoading] = useState(false)
  const [skipFuture, setSkipFuture] = useState(dontShowAgain)

  // Check weaver status when modal opens
  useEffect(() => {
    if (isOpen && pat) {
      setLoading(true)
      checkWeaverStatus(pat)
        .then(status => {
          setWeaverStatus(status)
          setPublishCapability(getPublishCapability(hasPAT, status))
        })
        .finally(() => setLoading(false))
    } else if (isOpen) {
      setPublishCapability(getPublishCapability(hasPAT, null))
    }
  }, [isOpen, pat, hasPAT])

  // If "don't show again" is set, skip to confirm
  useEffect(() => {
    if (isOpen && dontShowAgain && publishCapability) {
      setStep('confirm')
    }
  }, [isOpen, dontShowAgain, publishCapability])

  const handleProceed = useCallback(() => {
    if (skipFuture && onDontShowAgain) {
      onDontShowAgain()
    }
    if (publishCapability) {
      onProceed(publishCapability.method)
    }
    onClose()
  }, [skipFuture, onDontShowAgain, publishCapability, onProceed, onClose])

  const handleOpenSettings = useCallback(() => {
    onClose()
    // Dispatch event to open settings modal
    window.dispatchEvent(new CustomEvent('codex:open-settings'))
  }, [onClose])

  if (!isOpen) return null

  const steps: Record<Step, { title: string; icon: React.ReactNode }> = {
    intro: { title: 'Publishing Guide', icon: <BookOpen className="w-5 h-5" /> },
    auth: { title: 'Authentication', icon: <Key className="w-5 h-5" /> },
    'weaver-check': { title: 'Weaver Status', icon: <Users className="w-5 h-5" /> },
    method: { title: 'Publish Method', icon: <GitPullRequest className="w-5 h-5" /> },
    confirm: { title: 'Ready to Publish', icon: <CheckCircle2 className="w-5 h-5" /> }
  }

  const stepOrder: Step[] = ['intro', 'auth', 'weaver-check', 'method', 'confirm']
  const currentIndex = stepOrder.indexOf(step)

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`
            relative w-full max-w-lg max-h-[85vh] overflow-hidden rounded-xl shadow-2xl
            ${isDark ? 'bg-zinc-900 text-white' : 'bg-white text-gray-900'}
          `}
        >
          {/* Header */}
          <div className={`
            flex items-center justify-between p-4 border-b
            ${isDark ? 'border-zinc-800' : 'border-gray-200'}
          `}>
            <div className="flex items-center gap-3">
              <div className={`
                p-2 rounded-lg
                ${isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-600'}
              `}>
                {steps[step].icon}
              </div>
              <div>
                <h2 className="text-lg font-semibold">{steps[step].title}</h2>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                  Step {currentIndex + 1} of {stepOrder.length}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`
                p-2 rounded-lg transition-colors
                ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}
              `}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className={`h-1 ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
            <motion.div
              className="h-full bg-cyan-500"
              initial={{ width: '0%' }}
              animate={{ width: `${((currentIndex + 1) / stepOrder.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[50vh]">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {step === 'intro' && (
                  <div className="space-y-4">
                    <p className={isDark ? 'text-zinc-300' : 'text-gray-600'}>
                      Quarry Codex uses a collaborative contribution model. Let&apos;s walk through how publishing works.
                    </p>
                    
                    <div className={`
                      p-4 rounded-lg space-y-3
                      ${isDark ? 'bg-zinc-800/50' : 'bg-gray-50'}
                    `}>
                      <div className="flex items-start gap-3">
                        <Shield className={`w-5 h-5 mt-0.5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                        <div>
                          <h4 className="font-medium">Your data is safe</h4>
                          <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                            Changes are never published without your explicit action
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Users className={`w-5 h-5 mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                        <div>
                          <h4 className="font-medium">Two publishing paths</h4>
                          <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                            Approved Weavers auto-merge; others create Pull Requests
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Github className={`w-5 h-5 mt-0.5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                        <div>
                          <h4 className="font-medium">GitHub-powered</h4>
                          <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                            All contributions go through GitHub for transparency
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {step === 'auth' && (
                  <div className="space-y-4">
                    {hasPAT ? (
                      <div className={`
                        flex items-center gap-3 p-4 rounded-lg
                        ${isDark ? 'bg-green-500/10 border border-green-500/30' : 'bg-green-50 border border-green-200'}
                      `}>
                        <CheckCircle2 className={isDark ? 'text-green-400' : 'text-green-600'} />
                        <div>
                          <h4 className="font-medium">GitHub Connected</h4>
                          <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                            Your Personal Access Token is configured
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className={`
                        p-4 rounded-lg space-y-3
                        ${isDark ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'}
                      `}>
                        <div className="flex items-center gap-3">
                          <AlertCircle className={isDark ? 'text-amber-400' : 'text-amber-600'} />
                          <h4 className="font-medium">No GitHub Token</h4>
                        </div>
                        <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
                          You can still contribute! Without a token, you&apos;ll be redirected to GitHub to create a Pull Request manually.
                        </p>
                        <button
                          onClick={handleOpenSettings}
                          className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                            ${isDark 
                              ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30' 
                              : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'}
                          `}
                        >
                          <Settings className="w-4 h-4" />
                          Configure GitHub Token
                        </button>
                      </div>
                    )}

                    <div className={`
                      p-4 rounded-lg
                      ${isDark ? 'bg-zinc-800/50' : 'bg-gray-50'}
                    `}>
                      <h4 className="font-medium flex items-center gap-2 mb-2">
                        <Info className="w-4 h-4" />
                        Why a GitHub Token?
                      </h4>
                      <ul className={`text-sm space-y-1 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
                        <li>• Authenticate your contributions</li>
                        <li>• Enable direct commits (for Weavers)</li>
                        <li>• Create Pull Requests on your behalf</li>
                        <li>• Your token is encrypted in your browser only</li>
                      </ul>
                    </div>
                  </div>
                )}

                {step === 'weaver-check' && (
                  <div className="space-y-4">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent" />
                        <span className="ml-3">Checking weaver status...</span>
                      </div>
                    ) : weaverStatus?.isWeaver ? (
                      <div className={`
                        p-4 rounded-lg
                        ${isDark ? 'bg-green-500/10 border border-green-500/30' : 'bg-green-50 border border-green-200'}
                      `}>
                        <div className="flex items-center gap-3 mb-2">
                          <Zap className={isDark ? 'text-green-400' : 'text-green-600'} />
                          <h4 className="font-medium">You&apos;re an Approved Weaver!</h4>
                        </div>
                        <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
                          @{weaverStatus.username} • Your changes will be automatically merged after validation.
                        </p>
                      </div>
                    ) : (
                      <div className={`
                        p-4 rounded-lg
                        ${isDark ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}
                      `}>
                        <div className="flex items-center gap-3 mb-2">
                          <GitPullRequest className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                          <h4 className="font-medium">Pull Request Required</h4>
                        </div>
                        <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
                          {weaverStatus?.username 
                            ? `@${weaverStatus.username} - Your changes will create a PR for maintainer review.`
                            : 'Your changes will be submitted as a Pull Request.'}
                        </p>
                      </div>
                    )}

                    <div className={`
                      p-4 rounded-lg
                      ${isDark ? 'bg-zinc-800/50' : 'bg-gray-50'}
                    `}>
                      <h4 className="font-medium flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4" />
                        What are Weavers?
                      </h4>
                      <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-600'} mb-3`}>
                        Weavers are trusted contributors who have demonstrated high-quality work. They can merge changes directly.
                      </p>
                      <Link
                        href={getWeaversListUrl()}
                        target="_blank"
                        className={`
                          inline-flex items-center gap-1 text-sm
                          ${isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-600 hover:text-cyan-700'}
                        `}
                      >
                        View approved Weavers list
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>

                    <div className={`
                      p-4 rounded-lg
                      ${isDark ? 'bg-zinc-800/50' : 'bg-gray-50'}
                    `}>
                      <h4 className="font-medium mb-2">How to become a Weaver:</h4>
                      <ol className={`text-sm space-y-1 ${isDark ? 'text-zinc-400' : 'text-gray-600'} list-decimal list-inside`}>
                        <li>Submit 5+ high-quality PRs that pass validation</li>
                        <li>Demonstrate understanding of Codex quality standards</li>
                        <li>Receive nomination from existing Weavers or maintainers</li>
                      </ol>
                    </div>
                  </div>
                )}

                {step === 'method' && publishCapability && (
                  <div className="space-y-4">
                    <div className={`
                      p-4 rounded-lg
                      ${publishCapability.method === 'auto-merge' 
                        ? (isDark ? 'bg-green-500/10 border border-green-500/30' : 'bg-green-50 border border-green-200')
                        : publishCapability.method === 'pr'
                        ? (isDark ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200')
                        : (isDark ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200')}
                    `}>
                      <div className="flex items-center gap-3 mb-2">
                        {publishCapability.method === 'auto-merge' && <Zap className={isDark ? 'text-green-400' : 'text-green-600'} />}
                        {publishCapability.method === 'pr' && <GitPullRequest className={isDark ? 'text-blue-400' : 'text-blue-600'} />}
                        {publishCapability.method === 'github-redirect' && <ExternalLink className={isDark ? 'text-amber-400' : 'text-amber-600'} />}
                        <h4 className="font-medium">{publishCapability.reason}</h4>
                      </div>
                      <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
                        {publishCapability.helpText}
                      </p>
                    </div>

                    {filePath && publishCapability.method === 'github-redirect' && (
                      <div className={`
                        p-4 rounded-lg
                        ${isDark ? 'bg-zinc-800/50' : 'bg-gray-50'}
                      `}>
                        <h4 className="font-medium mb-2">What happens next:</h4>
                        <ol className={`text-sm space-y-2 ${isDark ? 'text-zinc-400' : 'text-gray-600'} list-decimal list-inside`}>
                          <li>You&apos;ll be redirected to GitHub</li>
                          <li>Sign in with your GitHub account</li>
                          <li>Review and submit your changes as a PR</li>
                          <li>Maintainers will review and merge</li>
                        </ol>
                      </div>
                    )}
                  </div>
                )}

                {step === 'confirm' && publishCapability && (
                  <div className="space-y-4">
                    <div className={`
                      p-4 rounded-lg text-center
                      ${isDark ? 'bg-zinc-800/50' : 'bg-gray-50'}
                    `}>
                      <CheckCircle2 className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                      <h3 className="text-lg font-semibold mb-2">Ready to Publish</h3>
                      <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
                        {publishCapability.helpText}
                      </p>
                    </div>

                    {/* Don't show again option */}
                    <label className={`
                      flex items-center gap-3 p-3 rounded-lg cursor-pointer
                      ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}
                    `}>
                      <input
                        type="checkbox"
                        checked={skipFuture}
                        onChange={(e) => setSkipFuture(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
                        Don&apos;t show this guide again
                      </span>
                    </label>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className={`
            flex items-center justify-between p-4 border-t
            ${isDark ? 'border-zinc-800' : 'border-gray-200'}
          `}>
            <button
              onClick={() => {
                const prevIndex = currentIndex - 1
                if (prevIndex >= 0) {
                  setStep(stepOrder[prevIndex])
                }
              }}
              disabled={currentIndex === 0}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                disabled:opacity-50 disabled:cursor-not-allowed
                ${isDark 
                  ? 'hover:bg-zinc-800 disabled:hover:bg-transparent' 
                  : 'hover:bg-gray-100 disabled:hover:bg-transparent'}
              `}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            {step === 'confirm' ? (
              <button
                onClick={handleProceed}
                className={`
                  flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium
                  bg-cyan-500 text-white hover:bg-cyan-600
                `}
              >
                {publishCapability?.method === 'github-redirect' ? (
                  <>
                    Open GitHub
                    <ExternalLink className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Publish
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => {
                  const nextIndex = currentIndex + 1
                  if (nextIndex < stepOrder.length) {
                    setStep(stepOrder[nextIndex])
                  }
                }}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                  ${isDark 
                    ? 'bg-zinc-800 hover:bg-zinc-700' 
                    : 'bg-gray-100 hover:bg-gray-200'}
                `}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}








