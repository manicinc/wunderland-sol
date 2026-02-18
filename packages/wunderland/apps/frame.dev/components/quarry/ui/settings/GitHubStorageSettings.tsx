/**
 * GitHub Storage Settings Component
 * @module components/quarry/ui/settings/GitHubStorageSettings
 *
 * Settings panel for GitHub repository storage configuration.
 * Allows users to configure a GitHub repository for remote sync.
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
    Github,
    Lock,
    ExternalLink,
    Check,
    X,
    Loader2,
    RefreshCw,
    Key,
    GitBranch,
    FolderGit2,
    Unlink,
    AlertTriangle,
    Eye,
    EyeOff,
    BookOpen,
    CloudOff,
    CloudUpload,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getStorageManager } from '@/lib/storage'

// ============================================================================
// TYPES
// ============================================================================

interface GitHubConfig {
    owner: string
    repo: string
    branch: string
    basePath: string
    pat: string
}

interface ConnectionStatus {
    connected: boolean
    canWrite: boolean
    message?: string
    testedAt?: number
}

// ============================================================================
// PAT ENCRYPTION (browser-safe)
// ============================================================================

const STORAGE_KEY = 'quarry:github:config'
const PAT_KEY = 'quarry:github:pat'

/**
 * Get browser fingerprint for encryption
 */
function getBrowserFingerprint(): string {
    if (typeof window === 'undefined') return 'server'
    const nav = window.navigator
    const screen = window.screen
    return btoa(
        [
            nav.userAgent,
            nav.language,
            screen.colorDepth,
            screen.width,
            screen.height,
            new Date().getTimezoneOffset(),
        ].join('|')
    ).slice(0, 32)
}

/**
 * Simple XOR encryption for PAT (browser-safe)
 */
function encryptPAT(pat: string): string {
    const key = getBrowserFingerprint()
    let result = ''
    for (let i = 0; i < pat.length; i++) {
        result += String.fromCharCode(pat.charCodeAt(i) ^ key.charCodeAt(i % key.length))
    }
    return btoa(result)
}

/**
 * Decrypt PAT
 */
function decryptPAT(encrypted: string): string {
    try {
        const key = getBrowserFingerprint()
        const decoded = atob(encrypted)
        let result = ''
        for (let i = 0; i < decoded.length; i++) {
            result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length))
        }
        return result
    } catch {
        return ''
    }
}

/**
 * Save config to localStorage
 */
function saveConfig(config: Omit<GitHubConfig, 'pat'>): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    }
}

/**
 * Load config from localStorage
 */
function loadConfig(): Omit<GitHubConfig, 'pat'> | null {
    if (typeof window === 'undefined') return null
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    try {
        return JSON.parse(stored)
    } catch {
        return null
    }
}

/**
 * Save PAT securely
 */
function savePAT(pat: string): void {
    if (typeof window !== 'undefined' && pat) {
        localStorage.setItem(PAT_KEY, encryptPAT(pat))
    }
}

/**
 * Load PAT
 */
function loadPAT(): string {
    if (typeof window === 'undefined') return ''
    const encrypted = localStorage.getItem(PAT_KEY)
    if (!encrypted) return ''
    return decryptPAT(encrypted)
}

/**
 * Clear stored config and PAT
 */
function clearStoredConfig(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(PAT_KEY)
    }
}

// ============================================================================
// COMPONENT
// ============================================================================

interface GitHubStorageSettingsProps {
    className?: string
}

export function GitHubStorageSettings({ className }: GitHubStorageSettingsProps) {
    // Form state
    const [owner, setOwner] = useState('')
    const [repo, setRepo] = useState('')
    const [branch, setBranch] = useState('main')
    const [basePath, setBasePath] = useState('')
    const [pat, setPat] = useState('')
    const [showPat, setShowPat] = useState(false)

    // Connection state
    const [isConnected, setIsConnected] = useState(false)
    const [canWrite, setCanWrite] = useState(false)
    const [isTesting, setIsTesting] = useState(false)
    const [isConnecting, setIsConnecting] = useState(false)
    const [isDisconnecting, setIsDisconnecting] = useState(false)
    const [testResult, setTestResult] = useState<ConnectionStatus | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Load saved config on mount
    useEffect(() => {
        const config = loadConfig()
        const savedPat = loadPAT()

        if (config) {
            setOwner(config.owner || '')
            setRepo(config.repo || '')
            setBranch(config.branch || 'main')
            setBasePath(config.basePath || '')
        }

        if (savedPat) {
            setPat(savedPat)
        }

        // Check current connection status
        const manager = getStorageManager()
        setIsConnected(manager.hasGitHub())
        setCanWrite(manager.canWriteToGitHub())
    }, [])

    // Validate PAT format
    const validatePAT = useCallback((token: string): boolean => {
        // GitHub PATs start with ghp_, ghu_, gho_, ghs_, or github_pat_
        return /^(ghp_|ghu_|gho_|ghs_|github_pat_)[a-zA-Z0-9]+$/.test(token)
    }, [])

    // Test connection
    const handleTestConnection = useCallback(async () => {
        if (!owner || !repo) {
            setError('Owner and repository are required')
            return
        }

        setIsTesting(true)
        setTestResult(null)
        setError(null)

        try {
            // Test by attempting to access the repo
            const headers: Record<string, string> = {
                'Accept': 'application/vnd.github.v3+json',
            }
            if (pat) {
                headers['Authorization'] = `Bearer ${pat}`
            }

            const response = await fetch(
                `https://api.github.com/repos/${owner}/${repo}`,
                { headers }
            )

            if (!response.ok) {
                if (response.status === 404) {
                    setTestResult({
                        connected: false,
                        canWrite: false,
                        message: 'Repository not found or not accessible',
                    })
                } else if (response.status === 401) {
                    setTestResult({
                        connected: false,
                        canWrite: false,
                        message: 'Invalid PAT or token expired',
                    })
                } else {
                    setTestResult({
                        connected: false,
                        canWrite: false,
                        message: `GitHub API error: ${response.status}`,
                    })
                }
                return
            }

            const data = await response.json()
            const permissions = data.permissions || {}

            setTestResult({
                connected: true,
                canWrite: permissions.push === true || permissions.admin === true,
                message: data.private
                    ? 'Private repository'
                    : 'Public repository',
                testedAt: Date.now(),
            })
        } catch (err) {
            setTestResult({
                connected: false,
                canWrite: false,
                message: err instanceof Error ? err.message : 'Connection failed',
            })
        } finally {
            setIsTesting(false)
        }
    }, [owner, repo, pat])

    // Connect to GitHub
    const handleConnect = useCallback(async () => {
        if (!owner || !repo) {
            setError('Owner and repository are required')
            return
        }

        setIsConnecting(true)
        setError(null)

        try {
            const manager = getStorageManager()
            const success = await manager.configureGitHub({
                owner,
                repo,
                branch: branch || 'main',
                basePath: basePath || undefined,
                pat: pat || undefined,
            })

            if (success) {
                // Save config locally
                saveConfig({ owner, repo, branch, basePath })
                if (pat) {
                    savePAT(pat)
                }

                setIsConnected(true)
                setCanWrite(manager.canWriteToGitHub())
                setTestResult({
                    connected: true,
                    canWrite: manager.canWriteToGitHub(),
                    message: 'Connected successfully',
                    testedAt: Date.now(),
                })
            } else {
                setError('Failed to connect to repository')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Connection failed')
        } finally {
            setIsConnecting(false)
        }
    }, [owner, repo, branch, basePath, pat])

    // Disconnect
    const handleDisconnect = useCallback(async () => {
        setIsDisconnecting(true)
        setError(null)

        try {
            const manager = getStorageManager()
            await manager.disconnectGitHub()

            clearStoredConfig()
            setOwner('')
            setRepo('')
            setBranch('main')
            setBasePath('')
            setPat('')
            setIsConnected(false)
            setCanWrite(false)
            setTestResult(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Disconnect failed')
        } finally {
            setIsDisconnecting(false)
        }
    }, [])

    // Mask PAT for display
    const maskedPat = pat
        ? `${pat.slice(0, 7)}${'•'.repeat(Math.min(20, pat.length - 7))}`
        : ''

    const isValidForm = owner && repo

    return (
        <div
            className={cn(
                'bg-white dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden',
                className
            )}
        >
            {/* Header */}
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-700/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-700 dark:to-zinc-800">
                            <Github className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                        </div>
                        <div>
                            <h3 className="font-bold text-zinc-900 dark:text-white">
                                GitHub Storage
                            </h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Sync your content with a GitHub repository
                            </p>
                        </div>
                    </div>

                    {/* Connection Status Badge */}
                    {isConnected ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Connected
                            {canWrite && <CloudUpload className="w-3 h-3" />}
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                            <CloudOff className="w-3 h-3" />
                            Not Connected
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
                {/* Repository Settings */}
                <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        Repository Configuration
                    </h4>

                    {/* Owner/Repo Row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                                Owner
                            </label>
                            <input
                                type="text"
                                value={owner}
                                onChange={(e) => setOwner(e.target.value.trim())}
                                placeholder="username"
                                disabled={isConnected}
                                className={cn(
                                    'w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-900',
                                    'text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400',
                                    'focus:outline-none focus:ring-2 focus:ring-violet-500',
                                    'border-zinc-200 dark:border-zinc-700',
                                    'disabled:opacity-60 disabled:cursor-not-allowed'
                                )}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                                Repository
                            </label>
                            <input
                                type="text"
                                value={repo}
                                onChange={(e) => setRepo(e.target.value.trim())}
                                placeholder="my-notes"
                                disabled={isConnected}
                                className={cn(
                                    'w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-900',
                                    'text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400',
                                    'focus:outline-none focus:ring-2 focus:ring-violet-500',
                                    'border-zinc-200 dark:border-zinc-700',
                                    'disabled:opacity-60 disabled:cursor-not-allowed'
                                )}
                            />
                        </div>
                    </div>

                    {/* Branch and Base Path */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                                <GitBranch className="w-3 h-3 inline mr-1" />
                                Branch
                            </label>
                            <input
                                type="text"
                                value={branch}
                                onChange={(e) => setBranch(e.target.value.trim())}
                                placeholder="main"
                                disabled={isConnected}
                                className={cn(
                                    'w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-900',
                                    'text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400',
                                    'focus:outline-none focus:ring-2 focus:ring-violet-500',
                                    'border-zinc-200 dark:border-zinc-700',
                                    'disabled:opacity-60 disabled:cursor-not-allowed'
                                )}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                                <FolderGit2 className="w-3 h-3 inline mr-1" />
                                Base Path (optional)
                            </label>
                            <input
                                type="text"
                                value={basePath}
                                onChange={(e) => setBasePath(e.target.value.trim())}
                                placeholder="content/"
                                disabled={isConnected}
                                className={cn(
                                    'w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-900',
                                    'text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400',
                                    'focus:outline-none focus:ring-2 focus:ring-violet-500',
                                    'border-zinc-200 dark:border-zinc-700',
                                    'disabled:opacity-60 disabled:cursor-not-allowed'
                                )}
                            />
                        </div>
                    </div>
                </div>

                {/* PAT Section */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            <Key className="w-3.5 h-3.5 inline mr-1" />
                            Personal Access Token
                        </h4>
                        <a
                            href="https://github.com/settings/tokens/new?scopes=repo&description=Quarry%20Storage"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:underline"
                        >
                            Generate new token
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>

                    <div className="relative">
                        <input
                            type={showPat ? 'text' : 'password'}
                            value={pat}
                            onChange={(e) => setPat(e.target.value.trim())}
                            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                            disabled={isConnected}
                            className={cn(
                                'w-full px-3 py-2 pr-10 rounded-lg border bg-white dark:bg-zinc-900',
                                'text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 font-mono',
                                'focus:outline-none focus:ring-2',
                                pat && !validatePAT(pat)
                                    ? 'border-amber-300 dark:border-amber-700 focus:ring-amber-500'
                                    : 'border-zinc-200 dark:border-zinc-700 focus:ring-violet-500',
                                'disabled:opacity-60 disabled:cursor-not-allowed'
                            )}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPat(!showPat)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                        >
                            {showPat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>

                    {pat && !validatePAT(pat) && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            PAT should start with ghp_, ghu_, gho_, ghs_, or github_pat_
                        </p>
                    )}

                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        <Lock className="w-3 h-3 inline mr-1" />
                        Token is encrypted and stored locally. Required for write access to private repos.
                    </p>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                            <X className="w-4 h-4" />
                            {error}
                        </p>
                    </div>
                )}

                {/* Test Result */}
                {testResult && (
                    <div
                        className={cn(
                            'p-3 rounded-lg border',
                            testResult.connected
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        )}
                    >
                        <div className="flex items-center gap-2">
                            {testResult.connected ? (
                                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                            ) : (
                                <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                            )}
                            <span
                                className={cn(
                                    'text-sm font-medium',
                                    testResult.connected
                                        ? 'text-green-700 dark:text-green-400'
                                        : 'text-red-700 dark:text-red-400'
                                )}
                            >
                                {testResult.message}
                            </span>
                            {testResult.connected && (
                                <span className="text-xs text-zinc-500 ml-auto">
                                    {testResult.canWrite ? 'Read/Write' : 'Read Only'}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Documentation Link */}
                <div className="pt-2">
                    <a
                        href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                    >
                        <BookOpen className="w-3.5 h-3.5" />
                        Learn about GitHub Personal Access Tokens
                        <ExternalLink className="w-3 h-3" />
                    </a>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-700/50">
                    {isConnected ? (
                        <>
                            <button
                                onClick={handleDisconnect}
                                disabled={isDisconnecting}
                                className={cn(
                                    'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                                    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
                                    'hover:bg-red-200 dark:hover:bg-red-900/50',
                                    'disabled:opacity-50 disabled:cursor-not-allowed'
                                )}
                            >
                                {isDisconnecting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Unlink className="w-4 h-4" />
                                )}
                                Disconnect
                            </button>
                            <span className="text-xs text-zinc-500">
                                {owner}/{repo}:{branch}
                            </span>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={handleTestConnection}
                                disabled={!isValidForm || isTesting}
                                className={cn(
                                    'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                                    'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
                                    'hover:bg-zinc-200 dark:hover:bg-zinc-700',
                                    'disabled:opacity-50 disabled:cursor-not-allowed'
                                )}
                            >
                                {isTesting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-4 h-4" />
                                )}
                                Test Connection
                            </button>

                            <button
                                onClick={handleConnect}
                                disabled={!isValidForm || isConnecting}
                                className={cn(
                                    'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                                    'bg-violet-600 hover:bg-violet-700 text-white',
                                    'disabled:opacity-50 disabled:cursor-not-allowed'
                                )}
                            >
                                {isConnecting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Github className="w-4 h-4" />
                                )}
                                Connect
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default GitHubStorageSettings
