/**
 * API Settings Tab
 * @module components/quarry/ui/settings/APISettingsTab
 *
 * Settings tab for API token management and developer access.
 * Features:
 * - Create/list/revoke API tokens
 * - Link to Swagger docs
 * - API usage statistics
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  AlertCircle,
  BarChart3,
  Clock,
  Shield,
  FileJson,
  ScrollText,
  RefreshCw,
  Eye,
  EyeOff,
  X,
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

interface APIToken {
  id: string
  label: string
  maskedToken: string
  createdAt: string
  lastUsedAt: string | null
  expiresAt: string | null
  usageCount: number
  isActive: boolean
}

interface APIStats {
  totalEvents: number
  eventsByAction: Record<string, number>
  recentFailures: number
  recentRateLimits: number
}

interface APISettingsTabProps {
  className?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const API_PORT = process.env.NEXT_PUBLIC_API_PORT || '3847'
const API_BASE = `http://localhost:${API_PORT}/api/v1`

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function APISettingsTab({ className = '' }: APISettingsTabProps) {
  // State
  const [tokens, setTokens] = useState<APIToken[]>([])
  const [stats, setStats] = useState<APIStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create token state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTokenLabel, setNewTokenLabel] = useState('')
  const [newTokenDays, setNewTokenDays] = useState(30)
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  // Revoke state
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showToken, setShowToken] = useState(false)

  // Load tokens and stats
  useEffect(() => {
    loadData()
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Get auth token from localStorage
      const authToken = localStorage.getItem('api_token')

      if (!authToken) {
        // No token yet - show empty state
        setLoading(false)
        return
      }

      const headers = { Authorization: `Bearer ${authToken}` }

      const [tokensRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/tokens`, { headers }).catch(() => null),
        fetch(`${API_BASE}/audit/api/stats`, { headers }).catch(() => null),
      ])

      if (tokensRes?.ok) {
        const data = await tokensRes.json()
        setTokens(data.data || [])
      }

      if (statsRes?.ok) {
        const data = await statsRes.json()
        setStats(data.data)
      }
    } catch (err) {
      console.error('Failed to load API data:', err)
      setError('Failed to connect to API server. Is it running?')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleCreateToken = useCallback(async () => {
    if (!newTokenLabel.trim()) return
    setCreating(true)

    try {
      const authToken = localStorage.getItem('api_token')
      const res = await fetch(`${API_BASE}/tokens`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          label: newTokenLabel.trim(),
          expiresInDays: newTokenDays,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setCreatedToken(data.data.token) // Full token shown once
        setNewTokenLabel('')
        loadData() // Refresh list
      } else {
        const err = await res.json()
        setError(err.message || 'Failed to create token')
      }
    } catch (err) {
      setError('Failed to create token')
    } finally {
      setCreating(false)
    }
  }, [newTokenLabel, newTokenDays, loadData])

  const handleRevokeToken = useCallback(
    async (tokenId: string) => {
      setRevokingId(tokenId)
      try {
        const authToken = localStorage.getItem('api_token')
        await fetch(`${API_BASE}/tokens/${tokenId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'X-Confirm-Revoke': 'true',
          },
        })
        loadData()
      } catch (err) {
        setError('Failed to revoke token')
      } finally {
        setRevokingId(null)
      }
    },
    [loadData]
  )

  const copyToken = useCallback(() => {
    if (createdToken) {
      navigator.clipboard.writeText(createdToken)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [createdToken])

  const copyApiUrl = useCallback(() => {
    navigator.clipboard.writeText(API_BASE)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading API settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-cyan-500" />
            API & Developer Access
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage API tokens and access documentation
          </p>
        </div>
        <a
          href={`${API_BASE}/docs`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Swagger Docs
        </a>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="p-1 text-red-400 hover:text-red-600 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* API Base URL Card */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">API Base URL</p>
            <code className="text-sm text-cyan-600 dark:text-cyan-400 font-mono">{API_BASE}</code>
          </div>
          <button
            onClick={copyApiUrl}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Copy URL"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
            <BarChart3 className="w-5 h-5 text-cyan-500 mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalEvents.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Total API Calls</div>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
            <AlertCircle className="w-5 h-5 text-amber-500 mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.recentFailures}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Auth Failures (24h)</div>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
            <Clock className="w-5 h-5 text-red-500 mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.recentRateLimits}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Rate Limits (24h)</div>
          </div>
        </div>
      )}

      {/* Feature Highlights */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800">
          <FileJson className="w-5 h-5 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-cyan-800 dark:text-cyan-200">OpenAPI 3.1</p>
            <p className="text-xs text-cyan-600 dark:text-cyan-400">Auto-generated Swagger docs</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Token Auth</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">SHA-256 hashed, rotatable</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
          <ScrollText className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-purple-800 dark:text-purple-200">Audit Logging</p>
            <p className="text-xs text-purple-600 dark:text-purple-400">Track all API access</p>
          </div>
        </div>
      </div>

      {/* Token List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900 dark:text-white">API Tokens</h4>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              New Token
            </button>
          </div>
        </div>

        {tokens.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
            <Key className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              No API tokens yet. Create one to get started.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Token
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {tokens.map((token) => (
              <div
                key={token.id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                  token.isActive
                    ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-2 rounded-lg ${
                      token.isActive
                        ? 'bg-cyan-100 dark:bg-cyan-900/30'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <Key
                      className={`w-4 h-4 ${
                        token.isActive
                          ? 'text-cyan-600 dark:text-cyan-400'
                          : 'text-gray-400 dark:text-gray-500'
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white truncate">
                        {token.label}
                      </span>
                      {!token.isActive && (
                        <span className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
                          Revoked
                        </span>
                      )}
                      {token.expiresAt && new Date(token.expiresAt) < new Date() && (
                        <span className="px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded">
                          Expired
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                      {token.maskedToken}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Used {token.usageCount} times
                      {token.lastUsedAt &&
                        ` • Last: ${new Date(token.lastUsedAt).toLocaleDateString()}`}
                      {token.expiresAt &&
                        ` • Expires: ${new Date(token.expiresAt).toLocaleDateString()}`}
                    </div>
                  </div>
                </div>
                {token.isActive && (
                  <button
                    onClick={() => handleRevokeToken(token.id)}
                    disabled={revokingId === token.id}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                    title="Revoke token"
                  >
                    {revokingId === token.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rate Limit Info */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>Rate Limit:</strong> 100 requests per minute per token. Headers{' '}
          <code className="text-xs bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded">
            X-RateLimit-*
          </code>{' '}
          included in all responses.
        </p>
      </div>

      {/* Create Token Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={(e) => !createdToken && e.target === e.currentTarget && setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-2xl mx-4"
            >
              {createdToken ? (
                <>
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-4">
                    <Shield className="w-5 h-5" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Token Created!</h3>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Copy this token now. You won't be able to see it again.
                  </p>
                  <div className="relative">
                    <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono text-sm break-all pr-20">
                      <code className="flex-1 text-gray-900 dark:text-white">
                        {showToken ? createdToken : createdToken.replace(/./g, '•')}
                      </code>
                    </div>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        onClick={() => setShowToken(!showToken)}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        title={showToken ? 'Hide token' : 'Show token'}
                      >
                        {showToken ? (
                          <EyeOff className="w-4 h-4 text-gray-500" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                      <button
                        onClick={copyToken}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Copy token"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowCreateModal(false)
                      setCreatedToken(null)
                      setShowToken(false)
                    }}
                    className="w-full mt-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Create API Token</h3>
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Token Label
                      </label>
                      <input
                        type="text"
                        value={newTokenLabel}
                        onChange={(e) => setNewTokenLabel(e.target.value)}
                        placeholder="e.g., CI/CD Pipeline, Mobile App"
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Expires In
                      </label>
                      <select
                        value={newTokenDays}
                        onChange={(e) => setNewTokenDays(Number(e.target.value))}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      >
                        <option value={7}>7 days</option>
                        <option value={30}>30 days</option>
                        <option value={90}>90 days</option>
                        <option value={180}>6 months</option>
                        <option value={365}>1 year</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateToken}
                      disabled={!newTokenLabel.trim() || creating}
                      className="flex-1 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                      Create
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { APISettingsTab }
