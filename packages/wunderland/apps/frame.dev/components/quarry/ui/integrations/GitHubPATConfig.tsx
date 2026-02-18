'use client'

/**
 * GitHub PAT Configuration Popover
 * @module codex/ui/GitHubPATConfig
 * 
 * Allows users to configure GitHub Personal Access Token
 * for private repo access and Actions status checking.
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Key,
  Shield,
  Eye,
  EyeOff,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  Copy,
  Trash2,
} from 'lucide-react'

interface GitHubPATConfigProps {
  isOpen: boolean
  onClose: () => void
  theme?: string
}

const PAT_STORAGE_KEY = 'codex-github-pat'
const PAT_SCOPES = ['repo', 'workflow', 'read:org']

export default function GitHubPATConfig({ isOpen, onClose, theme = 'light' }: GitHubPATConfigProps) {
  const isDark = theme.includes('dark')
  const [pat, setPat] = useState('')
  const [showPat, setShowPat] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [hasExisting, setHasExisting] = useState(false)

  // Check for existing PAT
  useEffect(() => {
    const stored = localStorage.getItem(PAT_STORAGE_KEY)
    if (stored) {
      setHasExisting(true)
      setPat('•'.repeat(40)) // Masked placeholder
    }
  }, [])

  // Test the PAT
  const testPAT = async () => {
    if (pat === '•'.repeat(40)) return // Don't test masked value
    
    setTesting(true)
    setTestResult(null)
    setErrorMessage('')
    
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${pat}`,
          Accept: 'application/vnd.github.v3+json',
        },
      })
      
      if (!res.ok) {
        throw new Error('Invalid token')
      }
      
      const user = await res.json()
      
      // Check scopes
      const scopes = res.headers.get('X-OAuth-Scopes')?.split(', ') || []
      const hasRequired = PAT_SCOPES.every(s => scopes.includes(s))
      
      if (!hasRequired) {
        setErrorMessage(`Missing scopes. Need: ${PAT_SCOPES.join(', ')}`)
        setTestResult('error')
      } else {
        setTestResult('success')
        // Save to localStorage
        localStorage.setItem(PAT_STORAGE_KEY, pat)
        setHasExisting(true)
      }
    } catch (err) {
      setTestResult('error')
      setErrorMessage(err instanceof Error ? err.message : 'Failed to validate')
    } finally {
      setTesting(false)
    }
  }

  // Clear PAT
  const clearPAT = () => {
    localStorage.removeItem(PAT_STORAGE_KEY)
    setPat('')
    setHasExisting(false)
    setTestResult(null)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        
        {/* Panel */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className={`
            relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden
            ${isDark ? 'bg-zinc-900' : 'bg-white'}
          `}
        >
          {/* Header */}
          <div className={`px-6 py-4 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-amber-900/30' : 'bg-amber-100'}`}>
                  <Key className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                    GitHub Personal Access Token
                  </h2>
                  <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                    Required for private repos and Actions
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Info Box */}
            <div className={`p-4 rounded-xl ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
              <div className="flex items-start gap-3">
                <Shield className={`w-5 h-5 shrink-0 mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
                <div className="space-y-2">
                  <p className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    Your PAT is stored locally in your browser and never sent to our servers.
                  </p>
                  <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                    Required scopes: <code className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-xs">repo</code>, <code className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-xs">workflow</code>, <code className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-xs">read:org</code>
                  </p>
                </div>
              </div>
            </div>

            {/* Input */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Personal Access Token
              </label>
              <div className="relative">
                <input
                  type={showPat ? 'text' : 'password'}
                  value={pat}
                  onChange={e => {
                    setPat(e.target.value)
                    setTestResult(null)
                  }}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className={`
                    w-full px-4 py-3 rounded-xl border text-sm font-mono pr-20
                    ${isDark 
                      ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600' 
                      : 'bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
                    }
                    ${testResult === 'error' ? 'border-red-500' : ''}
                    ${testResult === 'success' ? 'border-emerald-500' : ''}
                  `}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    onClick={() => setShowPat(!showPat)}
                    className={`p-1.5 rounded ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'}`}
                  >
                    {showPat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  {hasExisting && (
                    <button
                      onClick={clearPAT}
                      className="p-1.5 rounded text-red-500 hover:bg-red-500/10"
                      title="Clear PAT"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Error message */}
              {testResult === 'error' && errorMessage && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errorMessage}
                </p>
              )}
              
              {/* Success message */}
              {testResult === 'success' && (
                <p className="text-xs text-emerald-500 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Token validated and saved!
                </p>
              )}
            </div>

            {/* Create PAT Link */}
            <a
              href="https://github.com/settings/tokens/new?scopes=repo,workflow,read:org&description=Frame%20Codex"
              target="_blank"
              rel="noopener noreferrer"
              className={`
                flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400
              `}
            >
              Create new PAT on GitHub
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Footer */}
          <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
            >
              Cancel
            </button>
            <button
              onClick={testPAT}
              disabled={testing || !pat || pat === '•'.repeat(40)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-colors
                flex items-center gap-2
                ${testing || !pat || pat === '•'.repeat(40)
                  ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed dark:bg-zinc-700 dark:text-zinc-500'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
                }
              `}
            >
              {testing && <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />}
              {testing ? 'Testing...' : 'Validate & Save'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Get stored PAT
 */
export function getStoredPAT(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(PAT_STORAGE_KEY)
}

/**
 * Check if PAT is configured
 */
export function hasPATConfigured(): boolean {
  return getStoredPAT() !== null
}




















