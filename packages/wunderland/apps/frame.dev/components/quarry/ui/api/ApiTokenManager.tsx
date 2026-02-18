'use client'

/**
 * API Token Manager Component
 * 
 * UI for managing API tokens - creating, viewing, and revoking tokens.
 * Includes copy to clipboard and confirmation dialogs.
 * 
 * @module components/quarry/ui/ApiTokenManager
 */

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Key, 
  Plus, 
  Copy, 
  Check, 
  Trash2, 
  Eye, 
  EyeOff, 
  RefreshCw,
  Shield,
  Clock,
  Activity,
  AlertTriangle,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

interface APIToken {
  id: string
  label: string
  token: string
  createdAt: string
  lastUsedAt: string | null
  expiresAt: string | null
  isActive: boolean
  usageCount: number
}

interface ApiTokenManagerProps {
  profileId: string
  className?: string
}

// ============================================================================
// HOOKS
// ============================================================================

function useApiTokens(profileId: string) {
  const [tokens, setTokens] = useState<APIToken[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTokens = useCallback(async () => {
    // In a real implementation, this would call the API
    // For now, we use localStorage as a demo
    try {
      const stored = localStorage.getItem(`api_tokens_${profileId}`)
      if (stored) {
        setTokens(JSON.parse(stored))
      }
      setLoading(false)
    } catch {
      setError('Failed to load tokens')
      setLoading(false)
    }
  }, [profileId])

  const createToken = useCallback(async (label: string): Promise<{ token: APIToken; rawToken: string } | null> => {
    try {
      // Generate a secure token
      const rawToken = `fdev_${generateRandomString(40)}`
      const now = new Date().toISOString()
      
      const newToken: APIToken = {
        id: generateRandomString(12),
        label,
        token: maskToken(rawToken),
        createdAt: now,
        lastUsedAt: null,
        expiresAt: null,
        isActive: true,
        usageCount: 0
      }
      
      const updatedTokens = [...tokens, newToken]
      setTokens(updatedTokens)
      localStorage.setItem(`api_tokens_${profileId}`, JSON.stringify(updatedTokens))
      
      return { token: newToken, rawToken }
    } catch {
      setError('Failed to create token')
      return null
    }
  }, [tokens, profileId])

  const revokeToken = useCallback(async (tokenId: string): Promise<boolean> => {
    try {
      const updatedTokens = tokens.map(t => 
        t.id === tokenId ? { ...t, isActive: false } : t
      )
      setTokens(updatedTokens)
      localStorage.setItem(`api_tokens_${profileId}`, JSON.stringify(updatedTokens))
      return true
    } catch {
      return false
    }
  }, [tokens, profileId])

  const deleteToken = useCallback(async (tokenId: string): Promise<boolean> => {
    try {
      const updatedTokens = tokens.filter(t => t.id !== tokenId)
      setTokens(updatedTokens)
      localStorage.setItem(`api_tokens_${profileId}`, JSON.stringify(updatedTokens))
      return true
    } catch {
      return false
    }
  }, [tokens, profileId])

  useEffect(() => {
    fetchTokens()
  }, [fetchTokens])

  return { tokens, loading, error, createToken, revokeToken, deleteToken, refresh: fetchTokens }
}

// ============================================================================
// HELPERS
// ============================================================================

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function maskToken(token: string): string {
  if (token.length <= 12) return '****'
  return `${token.slice(0, 8)}...${token.slice(-4)}`
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 30) return `${days}d ago`
  return formatDate(dateString)
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface TokenCardProps {
  token: APIToken
  onRevoke: (id: string) => void
  onDelete: (id: string) => void
}

function TokenCard({ token, onRevoke, onDelete }: TokenCardProps) {
  const [showConfirm, setShowConfirm] = useState<'revoke' | 'delete' | null>(null)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'group relative rounded-xl border p-4 transition-all duration-200',
        token.isActive 
          ? 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50' 
          : 'border-zinc-200/50 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 opacity-60'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Key className={cn(
              'w-4 h-4',
              token.isActive ? 'text-emerald-500' : 'text-zinc-400'
            )} />
            <h3 className="font-medium text-zinc-900 dark:text-white truncate">
              {token.label}
            </h3>
            {!token.isActive && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                Revoked
              </span>
            )}
          </div>
          
          <code className="text-sm font-mono text-zinc-500 dark:text-zinc-400">
            {token.token}
          </code>
          
          <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Created {getRelativeTime(token.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3" />
              {token.usageCount} uses
            </span>
            {token.lastUsedAt && (
              <span>
                Last used {getRelativeTime(token.lastUsedAt)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {token.isActive ? (
            <button
              onClick={() => setShowConfirm('revoke')}
              className="p-2 rounded-lg text-zinc-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              title="Revoke token"
            >
              <Shield className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setShowConfirm('delete')}
              className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Delete permanently"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white/95 dark:bg-zinc-800/95 rounded-xl flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <div className="text-center">
              <AlertTriangle className={cn(
                'w-8 h-8 mx-auto mb-2',
                showConfirm === 'revoke' ? 'text-amber-500' : 'text-red-500'
              )} />
              <p className="text-sm font-medium text-zinc-900 dark:text-white mb-1">
                {showConfirm === 'revoke' ? 'Revoke this token?' : 'Delete permanently?'}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                {showConfirm === 'revoke' 
                  ? 'It will no longer work for API access.' 
                  : 'This cannot be undone.'}
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setShowConfirm(null)}
                  className="px-3 py-1.5 text-sm rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (showConfirm === 'revoke') {
                      onRevoke(token.id)
                    } else {
                      onDelete(token.id)
                    }
                    setShowConfirm(null)
                  }}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-lg font-medium transition-colors',
                    showConfirm === 'revoke'
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  )}
                >
                  {showConfirm === 'revoke' ? 'Revoke' : 'Delete'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

interface CreateTokenModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (label: string) => Promise<{ token: APIToken; rawToken: string } | null>
}

function CreateTokenModal({ isOpen, onClose, onSubmit }: CreateTokenModalProps) {
  const [label, setLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [result, setResult] = useState<{ token: APIToken; rawToken: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!label.trim()) return
    
    setCreating(true)
    const res = await onSubmit(label.trim())
    setCreating(false)
    
    if (res) {
      setResult(res)
    }
  }

  const handleCopy = async () => {
    if (!result?.rawToken) return
    await navigator.clipboard.writeText(result.rawToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    setLabel('')
    setResult(null)
    setCopied(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && !result && handleClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            {result ? 'Token Created!' : 'Create API Token'}
          </h2>
          {!result && (
            <button onClick={handleClose} className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          )}
        </div>

        <div className="p-4">
          {!result ? (
            <form onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Token Label
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., My App Integration"
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                autoFocus
              />
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Give your token a descriptive name to identify its use.
              </p>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!label.trim() || creating}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {creating && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Create Token
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-1">
                      Your API token has been created
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      Copy it now! You won&apos;t be able to see it again.
                    </p>
                  </div>
                </div>
              </div>

              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Your API Token
              </label>
              <div className="relative">
                <code className="block w-full p-3 pr-12 rounded-lg bg-zinc-100 dark:bg-zinc-900 font-mono text-sm text-zinc-900 dark:text-white break-all">
                  {result.rawToken}
                </code>
                <button
                  onClick={handleCopy}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-zinc-500" />
                  )}
                </button>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ApiTokenManager({ profileId, className }: ApiTokenManagerProps) {
  const { tokens, loading, error, createToken, revokeToken, deleteToken, refresh } = useApiTokens(profileId)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const activeTokens = tokens.filter(t => t.isActive)
  const revokedTokens = tokens.filter(t => !t.isActive)

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <RefreshCw className="w-6 h-6 text-zinc-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Key className="w-5 h-5" />
            API Tokens
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Manage tokens for accessing the Quarry Codex API
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Token
        </button>
      </div>

      {/* API Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4">
        <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          Using the API
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
          Include your token in the Authorization header of your API requests:
        </p>
        <code className="block p-3 rounded-lg bg-white/80 dark:bg-zinc-900/50 text-sm font-mono text-zinc-800 dark:text-zinc-200">
          Authorization: Bearer YOUR_API_TOKEN
        </code>
        <a 
          href="/quarry/api-docs" 
          className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mt-3"
        >
          View API Documentation →
        </a>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Token List */}
      {tokens.length === 0 ? (
        <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
          <Key className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">
            No API tokens yet
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            Create a token to start using the Quarry Codex API
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Your First Token
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active Tokens */}
          {activeTokens.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">
                Active Tokens ({activeTokens.length})
              </h3>
              <div className="space-y-3">
                <AnimatePresence>
                  {activeTokens.map(token => (
                    <TokenCard
                      key={token.id}
                      token={token}
                      onRevoke={revokeToken}
                      onDelete={deleteToken}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Revoked Tokens */}
          {revokedTokens.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">
                Revoked Tokens ({revokedTokens.length})
              </h3>
              <div className="space-y-3">
                <AnimatePresence>
                  {revokedTokens.map(token => (
                    <TokenCard
                      key={token.id}
                      token={token}
                      onRevoke={revokeToken}
                      onDelete={deleteToken}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateTokenModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSubmit={createToken}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default ApiTokenManager












