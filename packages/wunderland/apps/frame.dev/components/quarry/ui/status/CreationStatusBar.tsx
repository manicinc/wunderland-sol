'use client'

/**
 * Creation Status Bar - Live inline status indicators
 * @module codex/ui/CreationStatusBar
 * 
 * Shows real-time status of:
 * - Auto-save state (draft/saving/saved)
 * - NLP analysis progress
 * - GitHub backend status
 * - Publishing pipeline
 */

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cloud,
  CloudOff,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Brain,
  GitBranch,
  Zap,
  Clock,
  Eye,
  EyeOff,
  ChevronDown,
  ExternalLink,
  RefreshCw,
  Key,
  Shield,
  Activity,
} from 'lucide-react'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline'
export type NLPStatus = 'idle' | 'analyzing' | 'complete' | 'error'
export type BackendStatus = 'unknown' | 'running' | 'queued' | 'success' | 'failed'
export type PublishStatus = 'draft' | 'publishing' | 'published' | 'error'

interface CreationStatusBarProps {
  /** Current save status */
  saveStatus: SaveStatus
  /** Last saved timestamp */
  lastSaved?: Date
  /** NLP analysis status */
  nlpStatus: NLPStatus
  /** NLP analysis progress (0-100) */
  nlpProgress?: number
  /** NLP tasks completed */
  nlpTasks?: { done: number; total: number }
  /** GitHub Actions backend status */
  backendStatus?: BackendStatus
  /** GitHub Actions run URL */
  actionsUrl?: string
  /** Publish status */
  publishStatus: PublishStatus
  /** Whether user has PAT configured */
  hasPAT?: boolean
  /** Theme */
  theme?: string
  /** Callback to configure PAT */
  onConfigurePAT?: () => void
  /** Callback to refresh backend status */
  onRefreshBackend?: () => void
  /** Callback to force save */
  onForceSave?: () => void
}

const SAVE_STATUS_CONFIG: Record<SaveStatus, { icon: React.ElementType; text: string; color: string; animate?: boolean }> = {
  idle: { icon: Cloud, text: 'Draft', color: 'text-zinc-400' },
  saving: { icon: Loader2, text: 'Saving...', color: 'text-blue-500', animate: true },
  saved: { icon: CheckCircle2, text: 'Saved', color: 'text-emerald-500' },
  error: { icon: AlertCircle, text: 'Save failed', color: 'text-red-500' },
  offline: { icon: CloudOff, text: 'Offline', color: 'text-amber-500' },
}

const BACKEND_STATUS_CONFIG: Record<BackendStatus, { icon: React.ElementType; text: string; color: string; animate?: boolean }> = {
  unknown: { icon: Activity, text: 'Checking...', color: 'text-zinc-400' },
  running: { icon: Loader2, text: 'Processing', color: 'text-blue-500', animate: true },
  queued: { icon: Clock, text: 'Queued', color: 'text-amber-500' },
  success: { icon: CheckCircle2, text: 'Complete', color: 'text-emerald-500' },
  failed: { icon: AlertCircle, text: 'Failed', color: 'text-red-500' },
}

export default function CreationStatusBar({
  saveStatus,
  lastSaved,
  nlpStatus,
  nlpProgress = 0,
  nlpTasks,
  backendStatus = 'unknown',
  actionsUrl,
  publishStatus,
  hasPAT = false,
  theme = 'light',
  onConfigurePAT,
  onRefreshBackend,
  onForceSave,
}: CreationStatusBarProps) {
  const isDark = theme.includes('dark')
  const [showDetails, setShowDetails] = useState(false)
  const [timeAgo, setTimeAgo] = useState('')

  // Update time ago
  useEffect(() => {
    if (!lastSaved) return
    
    const update = () => {
      const diff = Date.now() - lastSaved.getTime()
      if (diff < 5000) setTimeAgo('just now')
      else if (diff < 60000) setTimeAgo(`${Math.floor(diff / 1000)}s ago`)
      else if (diff < 3600000) setTimeAgo(`${Math.floor(diff / 60000)}m ago`)
      else setTimeAgo(`${Math.floor(diff / 3600000)}h ago`)
    }
    
    update()
    const interval = setInterval(update, 10000)
    return () => clearInterval(interval)
  }, [lastSaved])

  const SaveIcon = SAVE_STATUS_CONFIG[saveStatus].icon
  const BackendIcon = BACKEND_STATUS_CONFIG[backendStatus].icon

  return (
    <div className={`relative ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
      {/* Compact Status Bar */}
      <div 
        className={`
          flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs cursor-pointer
          transition-colors select-none
          ${isDark ? 'bg-zinc-800/50 hover:bg-zinc-800' : 'bg-zinc-100/50 hover:bg-zinc-100'}
        `}
        onClick={() => setShowDetails(!showDetails)}
      >
        {/* Save Status - with detailed tooltip */}
        <div 
          className={`flex items-center gap-1.5 ${SAVE_STATUS_CONFIG[saveStatus].color}`}
          title={
            saveStatus === 'idle' 
              ? 'Draft mode: Changes are saved locally. Publish to sync with remote.'
              : saveStatus === 'saving'
              ? 'Saving changes locally...'
              : saveStatus === 'saved'
              ? `Saved locally${lastSaved ? ` ${timeAgo}` : ''}. Publish to sync with remote repository.`
              : saveStatus === 'error'
              ? 'Save failed. Click to retry. Your changes are preserved locally.'
              : 'Offline mode: Changes will sync when connection is restored.'
          }
        >
          <SaveIcon className={`w-3.5 h-3.5 ${SAVE_STATUS_CONFIG[saveStatus].animate ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{SAVE_STATUS_CONFIG[saveStatus].text}</span>
          {lastSaved && saveStatus === 'saved' && (
            <span className="text-zinc-500">{timeAgo}</span>
          )}
        </div>

        {/* Divider */}
        <div className={`w-px h-3 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

        {/* NLP Status */}
        <div className="flex items-center gap-1.5">
          {nlpStatus === 'analyzing' ? (
            <>
              <Brain className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
              <div className="w-16 h-1 rounded-full overflow-hidden bg-purple-900/30">
                <motion.div
                  className="h-full bg-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${nlpProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              {nlpTasks && (
                <span className="text-purple-400">{nlpTasks.done}/{nlpTasks.total}</span>
              )}
            </>
          ) : nlpStatus === 'complete' ? (
            <>
              <Brain className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-500 hidden sm:inline">Analyzed</span>
            </>
          ) : (
            <>
              <Brain className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-zinc-400 hidden sm:inline">NLP</span>
            </>
          )}
        </div>

        {/* Divider */}
        <div className={`w-px h-3 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />

        {/* Backend Status */}
        <div className={`flex items-center gap-1.5 ${BACKEND_STATUS_CONFIG[backendStatus].color}`}>
          <BackendIcon className={`w-3.5 h-3.5 ${BACKEND_STATUS_CONFIG[backendStatus].animate ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{BACKEND_STATUS_CONFIG[backendStatus].text}</span>
        </div>

        {/* PAT indicator */}
        {!hasPAT && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onConfigurePAT?.()
            }}
            className="flex items-center gap-1 text-amber-500 hover:text-amber-400"
            title="Configure GitHub PAT for private repos"
          >
            <Key className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Expand/Collapse */}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
      </div>

      {/* Expanded Details Panel */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className={`
              absolute top-full left-0 right-0 mt-1 z-50
              rounded-xl border shadow-xl overflow-hidden
              ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}
            `}
          >
            <div className="p-4 space-y-4">
              {/* Auto-Save Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Auto-Save
                  </h4>
                  <button
                    onClick={onForceSave}
                    className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200'}`}
                  >
                    Save Now
                  </button>
                </div>
                <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
                  <div className="flex items-center gap-2">
                    <SaveIcon className={`w-4 h-4 ${SAVE_STATUS_CONFIG[saveStatus].color} ${SAVE_STATUS_CONFIG[saveStatus].animate ? 'animate-spin' : ''}`} />
                    <span className="text-sm">{SAVE_STATUS_CONFIG[saveStatus].text}</span>
                    {lastSaved && <span className="text-xs text-zinc-500 ml-auto">{timeAgo}</span>}
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">
                    Drafts are saved locally. Publishing creates a GitHub PR.
                  </p>
                </div>
              </div>

              {/* NLP Analysis Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Client-Side NLP
                </h4>
                <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
                  <div className="space-y-2">
                    <NLPTaskRow label="Keyword Extraction" status={nlpStatus === 'complete' ? 'done' : nlpStatus === 'analyzing' && nlpProgress > 20 ? 'running' : 'pending'} />
                    <NLPTaskRow label="Entity Recognition" status={nlpStatus === 'complete' ? 'done' : nlpStatus === 'analyzing' && nlpProgress > 40 ? 'running' : 'pending'} />
                    <NLPTaskRow label="Tag Suggestion" status={nlpStatus === 'complete' ? 'done' : nlpStatus === 'analyzing' && nlpProgress > 60 ? 'running' : 'pending'} />
                    <NLPTaskRow label="Summary Generation" status={nlpStatus === 'complete' ? 'done' : nlpStatus === 'analyzing' && nlpProgress > 80 ? 'running' : 'pending'} />
                  </div>
                  <p className="text-xs text-zinc-500 mt-3">
                    Real-time analysis happens in your browser. Backend processing starts after publish.
                  </p>
                </div>
              </div>

              {/* Backend Status Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    GitHub Actions Backend
                  </h4>
                  <button
                    onClick={onRefreshBackend}
                    className={`p-1 rounded ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BackendIcon className={`w-4 h-4 ${BACKEND_STATUS_CONFIG[backendStatus].color} ${BACKEND_STATUS_CONFIG[backendStatus].animate ? 'animate-spin' : ''}`} />
                      <span className="text-sm">{BACKEND_STATUS_CONFIG[backendStatus].text}</span>
                    </div>
                    {actionsUrl && (
                      <a
                        href={actionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  
                  {/* Pipeline visualization */}
                  <div className="mt-3 flex items-center gap-1">
                    <PipelineStep label="PR" status={publishStatus !== 'draft' ? 'done' : 'pending'} />
                    <PipelineArrow />
                    <PipelineStep label="Index" status={backendStatus === 'success' ? 'done' : backendStatus === 'running' ? 'running' : 'pending'} />
                    <PipelineArrow />
                    <PipelineStep label="NLP" status={backendStatus === 'success' ? 'done' : 'pending'} />
                    <PipelineArrow />
                    <PipelineStep label="Search" status={backendStatus === 'success' ? 'done' : 'pending'} />
                  </div>
                </div>
              </div>

              {/* PAT Configuration */}
              {!hasPAT && (
                <div className={`p-3 rounded-lg border ${isDark ? 'border-amber-800/50 bg-amber-900/20' : 'border-amber-200 bg-amber-50'}`}>
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                        Configure GitHub PAT
                      </p>
                      <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1">
                        A Personal Access Token is required for private repos and to check Actions status.
                      </p>
                      <button
                        onClick={onConfigurePAT}
                        className="mt-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                      >
                        Configure PAT
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function NLPTaskRow({ label, status }: { label: string; status: 'pending' | 'running' | 'done' }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className={`flex items-center gap-1 ${
        status === 'done' ? 'text-emerald-500' :
        status === 'running' ? 'text-purple-500' :
        'text-zinc-400'
      }`}>
        {status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
        {status === 'done' && <CheckCircle2 className="w-3 h-3" />}
        {status === 'pending' && <Clock className="w-3 h-3" />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    </div>
  )
}

function PipelineStep({ label, status }: { label: string; status: 'pending' | 'running' | 'done' }) {
  return (
    <div className={`
      px-2 py-1 rounded text-[10px] font-medium
      ${status === 'done' ? 'bg-emerald-500/20 text-emerald-500' :
        status === 'running' ? 'bg-blue-500/20 text-blue-500' :
        'bg-zinc-500/20 text-zinc-400'}
    `}>
      {status === 'running' && <Loader2 className="w-2.5 h-2.5 inline mr-1 animate-spin" />}
      {label}
    </div>
  )
}

function PipelineArrow() {
  return (
    <div className="text-zinc-500">→</div>
  )
}

