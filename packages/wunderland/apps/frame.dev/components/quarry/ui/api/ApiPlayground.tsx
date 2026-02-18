/**
 * API Playground Component
 * @module codex/ui/ApiPlayground
 * 
 * Interactive API testing interface with pre-configured endpoints,
 * live token management, and response visualization.
 */

'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Key,
  Globe,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  Settings,
  Code,
  FileJson,
  Zap,
  Lock,
  Unlock,
  RefreshCw,
  ExternalLink,
  Info,
} from 'lucide-react'
import type { ThemeName } from '@/types/theme'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ApiEndpoint {
  id: string
  name: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  description: string
  category: string
  requiresAuth: boolean
  requestBody?: object
  headers?: Record<string, string>
  queryParams?: Record<string, string>
}

interface ApiResponse {
  status: number
  statusText: string
  data: unknown
  headers: Record<string, string>
  duration: number
  timestamp: string
}

interface ApiPlaygroundProps {
  /** Current theme */
  theme?: ThemeName
  /** Pre-configured API token */
  apiToken?: string
  /** Base URL for API */
  baseUrl?: string
  /** Show as popover (compact mode) */
  compact?: boolean
  /** Callback when token changes */
  onTokenChange?: (token: string) => void
  /** Class name */
  className?: string
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_BASE_URL = typeof window !== 'undefined' 
  ? `${window.location.origin}/api/v1` 
  : 'http://localhost:3000/api/v1'

const SAMPLE_ENDPOINTS: ApiEndpoint[] = [
  // System
  {
    id: 'health',
    name: 'Health Check',
    method: 'GET',
    path: '/health',
    description: 'Check API server health and uptime',
    category: 'System',
    requiresAuth: false,
  },
  {
    id: 'info',
    name: 'API Info',
    method: 'GET',
    path: '/info',
    description: 'Get API version and capabilities',
    category: 'System',
    requiresAuth: false,
  },
  // Knowledge
  {
    id: 'list-weaves',
    name: 'List Weaves',
    method: 'GET',
    path: '/knowledge/weaves',
    description: 'Get all weaves (top-level knowledge universes)',
    category: 'Knowledge',
    requiresAuth: true,
  },
  {
    id: 'list-looms',
    name: 'List Looms',
    method: 'GET',
    path: '/knowledge/looms',
    description: 'Get all looms (knowledge modules)',
    category: 'Knowledge',
    requiresAuth: true,
    queryParams: { weave: 'optional-weave-path' },
  },
  {
    id: 'list-strands',
    name: 'List Strands',
    method: 'GET',
    path: '/knowledge/strands',
    description: 'Get all strands (knowledge units)',
    category: 'Knowledge',
    requiresAuth: true,
    queryParams: { limit: '10', offset: '0' },
  },
  {
    id: 'search',
    name: 'Search',
    method: 'GET',
    path: '/knowledge/search',
    description: 'Search across all knowledge content',
    category: 'Knowledge',
    requiresAuth: true,
    queryParams: { q: 'your search query', limit: '10' },
  },
  // Generation
  {
    id: 'generate-flashcards',
    name: 'Generate Flashcards',
    method: 'POST',
    path: '/generation/flashcards',
    description: 'Generate flashcards from content',
    category: 'AI Generation',
    requiresAuth: true,
    requestBody: {
      content: 'Your content here...',
      count: 5,
      difficulty: 'medium',
    },
  },
  {
    id: 'generate-quiz',
    name: 'Generate Quiz',
    method: 'POST',
    path: '/generation/quiz',
    description: 'Generate quiz questions from content',
    category: 'AI Generation',
    requiresAuth: true,
    requestBody: {
      content: 'Your content here...',
      count: 5,
      type: 'multiple-choice',
    },
  },
  {
    id: 'generate-summary',
    name: 'Generate Summary',
    method: 'POST',
    path: '/generation/summary',
    description: 'Generate a summary of content',
    category: 'AI Generation',
    requiresAuth: true,
    requestBody: {
      content: 'Your content here...',
      maxLength: 200,
    },
  },
  // Profile
  {
    id: 'get-profile',
    name: 'Get Profile',
    method: 'GET',
    path: '/profile',
    description: 'Get current user profile',
    category: 'Profile',
    requiresAuth: true,
  },
  // Tokens
  {
    id: 'list-tokens',
    name: 'List Tokens',
    method: 'GET',
    path: '/tokens',
    description: 'List all API tokens',
    category: 'Tokens',
    requiresAuth: true,
  },
]

const METHOD_COLORS: Record<string, { bg: string; text: string }> = {
  GET: { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300' },
  POST: { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300' },
  PUT: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300' },
  DELETE: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300' },
  PATCH: { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300' },
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function formatJson(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return 'text-emerald-500'
  if (status >= 300 && status < 400) return 'text-amber-500'
  if (status >= 400 && status < 500) return 'text-orange-500'
  return 'text-red-500'
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function ApiPlayground({
  theme = 'light',
  apiToken: initialToken = '',
  baseUrl: initialBaseUrl = DEFAULT_BASE_URL,
  compact = false,
  onTokenChange,
  className = '',
}: ApiPlaygroundProps) {
  const resolvePath = useQuarryPath()
  const isDark = theme?.includes('dark')
  
  // State
  const [apiToken, setApiToken] = useState(initialToken)
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl)
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['System']))
  const [customBody, setCustomBody] = useState<string>('')
  const [customParams, setCustomParams] = useState<Record<string, string>>({})
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [showTokenInput, setShowTokenInput] = useState(!initialToken)
  const [showSettings, setShowSettings] = useState(false)
  
  // Group endpoints by category
  const endpointsByCategory = useMemo(() => {
    const grouped: Record<string, ApiEndpoint[]> = {}
    SAMPLE_ENDPOINTS.forEach(endpoint => {
      if (!grouped[endpoint.category]) {
        grouped[endpoint.category] = []
      }
      grouped[endpoint.category].push(endpoint)
    })
    return grouped
  }, [])
  
  // Update custom body when endpoint changes
  useEffect(() => {
    if (selectedEndpoint?.requestBody) {
      setCustomBody(formatJson(selectedEndpoint.requestBody))
    } else {
      setCustomBody('')
    }
    if (selectedEndpoint?.queryParams) {
      setCustomParams({ ...selectedEndpoint.queryParams })
    } else {
      setCustomParams({})
    }
  }, [selectedEndpoint])
  
  // Handle token change
  const handleTokenChange = useCallback((token: string) => {
    setApiToken(token)
    onTokenChange?.(token)
  }, [onTokenChange])
  
  // Toggle category expansion
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }, [])
  
  // Execute API request
  const executeRequest = useCallback(async () => {
    if (!selectedEndpoint) return
    
    setLoading(true)
    setError(null)
    setResponse(null)
    
    const startTime = Date.now()
    
    try {
      // Build URL with query params
      let url = `${baseUrl}${selectedEndpoint.path}`
      if (Object.keys(customParams).length > 0) {
        const params = new URLSearchParams()
        Object.entries(customParams).forEach(([key, value]) => {
          if (value && !value.includes('optional')) {
            params.append(key, value)
          }
        })
        const queryString = params.toString()
        if (queryString) {
          url += `?${queryString}`
        }
      }
      
      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (selectedEndpoint.requiresAuth && apiToken) {
        headers['Authorization'] = `Bearer ${apiToken}`
      }
      
      // Build request options
      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers,
      }
      
      // Add body for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(selectedEndpoint.method) && customBody) {
        options.body = customBody
      }
      
      const res = await fetch(url, options)
      const duration = Date.now() - startTime
      
      // Parse response
      let data: unknown
      const contentType = res.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        data = await res.json()
      } else {
        data = await res.text()
      }
      
      // Extract response headers
      const responseHeaders: Record<string, string> = {}
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })
      
      setResponse({
        status: res.status,
        statusText: res.statusText,
        data,
        headers: responseHeaders,
        duration,
        timestamp: new Date().toISOString(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }, [selectedEndpoint, baseUrl, apiToken, customBody, customParams])
  
  // Copy to clipboard
  const copyToClipboard = useCallback(async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }, [])
  
  // Generate cURL command
  const generateCurl = useCallback(() => {
    if (!selectedEndpoint) return ''
    
    let url = `${baseUrl}${selectedEndpoint.path}`
    if (Object.keys(customParams).length > 0) {
      const params = new URLSearchParams()
      Object.entries(customParams).forEach(([key, value]) => {
        if (value && !value.includes('optional')) {
          params.append(key, value)
        }
      })
      const queryString = params.toString()
      if (queryString) {
        url += `?${queryString}`
      }
    }
    
    let curl = `curl -X ${selectedEndpoint.method} "${url}"`
    
    if (selectedEndpoint.requiresAuth) {
      curl += ` \\\n  -H "Authorization: Bearer ${apiToken || 'YOUR_TOKEN'}"`
    }
    
    if (['POST', 'PUT', 'PATCH'].includes(selectedEndpoint.method)) {
      curl += ` \\\n  -H "Content-Type: application/json"`
      if (customBody) {
        curl += ` \\\n  -d '${customBody.replace(/\n/g, '')}'`
      }
    }
    
    return curl
  }, [selectedEndpoint, baseUrl, apiToken, customBody, customParams])
  
  return (
    <div className={`
      flex flex-col h-full
      ${isDark ? 'bg-zinc-900 text-zinc-100' : 'bg-white text-zinc-900'}
      ${className}
    `}>
      {/* Header */}
      <div className={`
        flex items-center justify-between px-4 py-3 border-b
        ${isDark ? 'border-zinc-800' : 'border-zinc-200'}
      `}>
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          <h2 className="font-semibold">API Playground</h2>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Token Status */}
          <button
            onClick={() => setShowTokenInput(!showTokenInput)}
            className={`
              flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium
              ${apiToken
                ? isDark ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                : isDark ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-700'
              }
            `}
          >
            {apiToken ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            {apiToken ? 'Token Set' : 'No Token'}
          </button>
          
          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Token Input */}
      <AnimatePresence>
        {showTokenInput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className={`px-4 py-3 border-b ${isDark ? 'border-zinc-800 bg-zinc-800/50' : 'border-zinc-200 bg-zinc-50'}`}>
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-zinc-400" />
                <input
                  type="password"
                  value={apiToken}
                  onChange={(e) => handleTokenChange(e.target.value)}
                  placeholder="Enter your API token..."
                  className={`
                    flex-1 px-3 py-1.5 text-sm rounded border
                    ${isDark 
                      ? 'bg-zinc-900 border-zinc-700 focus:border-cyan-500' 
                      : 'bg-white border-zinc-300 focus:border-cyan-500'
                    }
                    outline-none
                  `}
                />
                <button
                  onClick={() => setShowTokenInput(false)}
                  className={`px-3 py-1.5 text-xs font-medium rounded ${
                    isDark ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-zinc-200 hover:bg-zinc-300'
                  }`}
                >
                  Done
                </button>
              </div>
              <p className={`mt-2 text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                <Info className="w-3 h-3 inline mr-1" />
                Get your API token from <a href={resolvePath('/quarry/settings')} className="text-cyan-500 hover:underline">Settings → API Tokens</a>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className={`px-4 py-3 border-b ${isDark ? 'border-zinc-800 bg-zinc-800/50' : 'border-zinc-200 bg-zinc-50'}`}>
              <label className="block text-xs font-medium mb-1">Base URL</label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className={`
                  w-full px-3 py-1.5 text-sm rounded border
                  ${isDark 
                    ? 'bg-zinc-900 border-zinc-700 focus:border-cyan-500' 
                    : 'bg-white border-zinc-300 focus:border-cyan-500'
                  }
                  outline-none font-mono
                `}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Main Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Endpoint List - hidden on mobile, shown on md+ */}
        <div className={`
          hidden md:block w-48 lg:w-64 border-r overflow-y-auto flex-shrink-0
          ${isDark ? 'border-zinc-800' : 'border-zinc-200'}
        `}>
          {Object.entries(endpointsByCategory).map(([category, endpoints]) => (
            <div key={category}>
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide
                  ${isDark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-50'}
                `}
              >
                {expandedCategories.has(category) ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                {category}
              </button>
              
              {/* Endpoints */}
              <AnimatePresence>
                {expandedCategories.has(category) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    {endpoints.map(endpoint => (
                      <button
                        key={endpoint.id}
                        onClick={() => setSelectedEndpoint(endpoint)}
                        className={`
                          w-full flex items-center gap-2 px-3 py-2 text-left text-sm
                          ${selectedEndpoint?.id === endpoint.id
                            ? isDark ? 'bg-zinc-800' : 'bg-zinc-100'
                            : isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'
                          }
                        `}
                      >
                        <span className={`
                          px-1.5 py-0.5 text-[10px] font-bold rounded
                          ${METHOD_COLORS[endpoint.method].bg}
                          ${METHOD_COLORS[endpoint.method].text}
                        `}>
                          {endpoint.method}
                        </span>
                        <span className="truncate">{endpoint.name}</span>
                        {endpoint.requiresAuth && (
                          <Lock className="w-3 h-3 text-zinc-400 ml-auto flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
        
        {/* Request/Response Panel - scrollable on mobile */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {selectedEndpoint ? (
            <>
              {/* Endpoint Info */}
              <div className={`px-4 py-3 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`
                    px-2 py-0.5 text-xs font-bold rounded
                    ${METHOD_COLORS[selectedEndpoint.method].bg}
                    ${METHOD_COLORS[selectedEndpoint.method].text}
                  `}>
                    {selectedEndpoint.method}
                  </span>
                  <code className={`text-sm font-mono ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    {selectedEndpoint.path}
                  </code>
                  {selectedEndpoint.requiresAuth && (
                    <span className={`
                      flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded
                      ${isDark ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-700'}
                    `}>
                      <Lock className="w-2.5 h-2.5" />
                      Auth
                    </span>
                  )}
                </div>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {selectedEndpoint.description}
                </p>
              </div>
              
              {/* Request Builder */}
              <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${isDark ? 'bg-zinc-900/50' : 'bg-zinc-50/50'}`}>
                {/* Query Params */}
                {selectedEndpoint.queryParams && (
                  <div>
                    <label className="block text-xs font-semibold mb-2">Query Parameters</label>
                    <div className="space-y-2">
                      {Object.entries(customParams).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className={`w-24 text-xs font-mono ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            {key}
                          </span>
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => setCustomParams(prev => ({ ...prev, [key]: e.target.value }))}
                            className={`
                              flex-1 px-2 py-1 text-xs font-mono rounded border
                              ${isDark 
                                ? 'bg-zinc-800 border-zinc-700 focus:border-cyan-500' 
                                : 'bg-white border-zinc-300 focus:border-cyan-500'
                              }
                              outline-none
                            `}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Request Body */}
                {selectedEndpoint.requestBody && (
                  <div>
                    <label className="block text-xs font-semibold mb-2">Request Body (JSON)</label>
                    <textarea
                      value={customBody}
                      onChange={(e) => setCustomBody(e.target.value)}
                      rows={8}
                      className={`
                        w-full px-3 py-2 text-xs font-mono rounded border resize-none
                        ${isDark 
                          ? 'bg-zinc-800 border-zinc-700 focus:border-cyan-500' 
                          : 'bg-white border-zinc-300 focus:border-cyan-500'
                        }
                        outline-none
                      `}
                    />
                  </div>
                )}
                
                {/* cURL Command */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold">cURL</label>
                    <button
                      onClick={() => copyToClipboard(generateCurl(), 'curl')}
                      className={`
                        flex items-center gap-1 px-2 py-1 text-xs rounded
                        ${isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-200 hover:bg-zinc-300'}
                      `}
                    >
                      {copied === 'curl' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied === 'curl' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <pre className={`
                    p-3 text-xs font-mono rounded overflow-x-auto
                    ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'}
                  `}>
                    {generateCurl()}
                  </pre>
                </div>
              </div>
              
              {/* Execute Button */}
              <div className={`px-4 py-3 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={executeRequest}
                    disabled={loading || (selectedEndpoint.requiresAuth && !apiToken)}
                    className={`
                      flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded font-medium text-sm
                      ${loading || (selectedEndpoint.requiresAuth && !apiToken)
                        ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed dark:bg-zinc-700 dark:text-zinc-400'
                        : 'bg-cyan-600 text-white hover:bg-cyan-700'
                      }
                    `}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    {loading ? 'Sending...' : 'Send Request'}
                  </button>
                  
                  {selectedEndpoint.requiresAuth && !apiToken && (
                    <p className="text-xs text-amber-500">Token required</p>
                  )}
                </div>
              </div>
              
              {/* Response */}
              {(response || error) && (
                <div className={`border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                  <div className={`px-4 py-2 flex items-center justify-between ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold">Response</span>
                      {response && (
                        <>
                          <span className={`text-sm font-bold ${getStatusColor(response.status)}`}>
                            {response.status} {response.statusText}
                          </span>
                          <span className={`flex items-center gap-1 text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            <Clock className="w-3 h-3" />
                            {response.duration}ms
                          </span>
                        </>
                      )}
                    </div>
                    {response && (
                      <button
                        onClick={() => copyToClipboard(formatJson(response.data), 'response')}
                        className={`
                          flex items-center gap-1 px-2 py-1 text-xs rounded
                          ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'}
                        `}
                      >
                        {copied === 'response' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-64 overflow-auto">
                    {error ? (
                      <div className="p-4 flex items-start gap-2 text-red-500">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{error}</span>
                      </div>
                    ) : response ? (
                      <pre className={`p-4 text-xs font-mono ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                        {formatJson(response.data)}
                      </pre>
                    ) : null}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div>
                <Globe className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-zinc-600' : 'text-zinc-300'}`} />
                <h3 className={`font-semibold mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  Select an Endpoint
                </h3>
                <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Choose an API endpoint from the list to start testing
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Compact API playground popover trigger button
 */
export function ApiPlaygroundButton({
  onClick,
  theme = 'light',
  className = '',
}: {
  onClick: () => void
  theme?: ThemeName
  className?: string
}) {
  const isDark = theme?.includes('dark')
  
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
        ${isDark 
          ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' 
          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
        }
        transition-colors
        ${className}
      `}
    >
      <Zap className="w-4 h-4 text-amber-500" />
      API Playground
    </button>
  )
}

