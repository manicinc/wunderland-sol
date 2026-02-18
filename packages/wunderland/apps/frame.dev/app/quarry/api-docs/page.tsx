'use client'

/**
 * API Documentation Page
 * 
 * Interactive documentation for the Quarry Codex REST API.
 * Features code examples, endpoint reference, and authentication guide.
 * 
 * @module app/quarry/api-docs/page
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Book,
  Key,
  Code,
  Terminal,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Zap,
  Database,
  Search,
  Sparkles,
  User,
  Shield,
  ExternalLink,
  ArrowRight
} from 'lucide-react'
import Navigation from '@/components/navigation'
import Footer from '@/components/footer'
import { cn } from '@/lib/utils'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'

// ============================================================================
// CONSTANTS
// ============================================================================

const API_BASE_URL = 'http://localhost:3847/api/v1'

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  description: string
  auth: boolean
  params?: { name: string; type: string; required?: boolean; description: string }[]
  body?: { name: string; type: string; required?: boolean; description: string }[]
  response: string
}

interface EndpointCategory {
  name: string
  icon: React.ReactNode
  description: string
  endpoints: Endpoint[]
}

const ENDPOINT_CATEGORIES: EndpointCategory[] = [
  {
    name: 'Public API',
    icon: <Database className="w-5 h-5" />,
    description: 'Unauthenticated read-only endpoints (no API key required)',
    endpoints: [
      {
        method: 'GET',
        path: '/api/strands',
        description: 'List all strands with pagination and filtering',
        auth: false,
        params: [
          { name: 'page', type: 'number', description: 'Page number (default: 1)' },
          { name: 'limit', type: 'number', description: 'Items per page (default: 50, max: 200)' },
          { name: 'weave', type: 'string', description: 'Filter by weave slug' },
          { name: 'loom', type: 'string', description: 'Filter by loom path' },
          { name: 'tags', type: 'string', description: 'Comma-separated tags to filter by' },
          { name: 'search', type: 'string', description: 'Full-text search query' },
          { name: 'status', type: 'string', description: 'Filter by status (published, draft, archived)' },
          { name: 'sortBy', type: 'string', description: 'Sort field (title, updated, created, wordCount)' },
          { name: 'sortOrder', type: 'string', description: 'Sort direction (asc, desc)' }
        ],
        response: '{ "success": true, "strands": [...], "pagination": { "page": 1, "limit": 50, "total": 127, "totalPages": 3 } }'
      },
      {
        method: 'GET',
        path: '/api/strands/:path',
        description: 'Get a single strand with full content by path',
        auth: false,
        response: '{ "success": true, "strand": { "id": "...", "title": "...", "content": "...", "tags": [...] } }'
      },
      {
        method: 'GET',
        path: '/api/weaves',
        description: 'List all weaves with strand and loom counts',
        auth: false,
        response: '{ "success": true, "weaves": [{ "slug": "wiki", "name": "Wiki", "strandCount": 42, "loomCount": 5 }] }'
      },
      {
        method: 'GET',
        path: '/api/looms',
        description: 'List all looms with strand counts',
        auth: false,
        params: [
          { name: 'weave', type: 'string', description: 'Filter by weave slug' }
        ],
        response: '{ "success": true, "looms": [{ "slug": "getting-started", "name": "Getting Started", "strandCount": 10 }] }'
      },
      {
        method: 'GET',
        path: '/api/stats',
        description: 'Get codex statistics (strand counts, word counts, top tags)',
        auth: false,
        response: '{ "success": true, "stats": { "strands": { "total": 127 }, "weaves": { "total": 5 }, "tags": { "topTags": [...] } } }'
      }
    ]
  },
  {
    name: 'Knowledge Base',
    icon: <Database className="w-5 h-5" />,
    description: 'Access and manage weaves, looms, and strands',
    endpoints: [
      {
        method: 'GET',
        path: '/weaves',
        description: 'List all knowledge weaves',
        auth: true,
        params: [
          { name: 'limit', type: 'number', description: 'Max items to return (default: 50)' },
          { name: 'offset', type: 'number', description: 'Pagination offset' }
        ],
        response: '{ "data": [{ "id": "...", "name": "...", "slug": "...", ... }], "meta": { "pagination": {...} } }'
      },
      {
        method: 'GET',
        path: '/weaves/:slug',
        description: 'Get a specific weave by slug',
        auth: true,
        response: '{ "data": { "id": "...", "name": "...", "description": "...", ... } }'
      },
      {
        method: 'GET',
        path: '/looms',
        description: 'List all looms (subdirectories)',
        auth: true,
        params: [
          { name: 'weave', type: 'string', description: 'Filter by weave slug' },
          { name: 'limit', type: 'number', description: 'Max items to return' }
        ],
        response: '{ "data": [...], "meta": { "pagination": {...} } }'
      },
      {
        method: 'GET',
        path: '/strands',
        description: 'List strands with filtering',
        auth: true,
        params: [
          { name: 'weave', type: 'string', description: 'Filter by weave slug' },
          { name: 'loom', type: 'string', description: 'Filter by loom slug' },
          { name: 'status', type: 'string', description: 'Filter by status (draft, published, archived)' },
          { name: 'q', type: 'string', description: 'Search query' }
        ],
        response: '{ "data": [...], "meta": { "pagination": {...} } }'
      },
      {
        method: 'GET',
        path: '/strands/:slug',
        description: 'Get a specific strand with full content',
        auth: true,
        response: '{ "data": { "id": "...", "title": "...", "content": "...", ... } }'
      }
    ]
  },
  {
    name: 'Search',
    icon: <Search className="w-5 h-5" />,
    description: 'Search across the knowledge base',
    endpoints: [
      {
        method: 'GET',
        path: '/search',
        description: 'Full-text search across all strands',
        auth: true,
        params: [
          { name: 'q', type: 'string', required: true, description: 'Search query' },
          { name: 'weave', type: 'string', description: 'Limit to specific weave' },
          { name: 'limit', type: 'number', description: 'Max results (default: 20)' }
        ],
        response: '{ "data": [{ "slug": "...", "title": "...", "snippet": "...", "score": 0.95 }], "meta": {...} }'
      }
    ]
  },
  {
    name: 'AI Generation',
    icon: <Sparkles className="w-5 h-5" />,
    description: 'Generate flashcards, quizzes, and summaries',
    endpoints: [
      {
        method: 'POST',
        path: '/generate/flashcards',
        description: 'Generate flashcards from strand content',
        auth: true,
        body: [
          { name: 'strandSlug', type: 'string', description: 'Slug of source strand' },
          { name: 'content', type: 'string', description: 'Raw content (alternative to strandSlug)' },
          { name: 'count', type: 'number', description: 'Number of cards (default: 5)' }
        ],
        response: '{ "data": [{ "front": "...", "back": "...", "difficulty": "easy" }], "meta": {...} }'
      },
      {
        method: 'POST',
        path: '/generate/quiz',
        description: 'Generate quiz questions from content',
        auth: true,
        body: [
          { name: 'strandSlug', type: 'string', description: 'Slug of source strand' },
          { name: 'content', type: 'string', description: 'Raw content' },
          { name: 'count', type: 'number', description: 'Number of questions' }
        ],
        response: '{ "data": [{ "question": "...", "options": [...], "correctIndex": 0 }], "meta": {...} }'
      },
      {
        method: 'POST',
        path: '/generate/glossary',
        description: 'Extract glossary terms from content',
        auth: true,
        body: [
          { name: 'strandSlug', type: 'string', description: 'Slug of source strand' },
          { name: 'content', type: 'string', description: 'Raw content' }
        ],
        response: '{ "data": [{ "term": "...", "definition": "..." }], "meta": {...} }'
      },
      {
        method: 'POST',
        path: '/generate/summary',
        description: 'Generate a summary of content',
        auth: true,
        body: [
          { name: 'strandSlug', type: 'string', description: 'Slug of source strand' },
          { name: 'maxLength', type: 'number', description: 'Max summary length' }
        ],
        response: '{ "data": { "summary": "...", "keyPoints": [...] }, "meta": {...} }'
      }
    ]
  },
  {
    name: 'Profile',
    icon: <User className="w-5 h-5" />,
    description: 'User profile and settings',
    endpoints: [
      {
        method: 'GET',
        path: '/profile',
        description: 'Get user profile',
        auth: true,
        response: '{ "data": { "displayName": "...", "level": 5, "totalXp": 1200, ... } }'
      },
      {
        method: 'PUT',
        path: '/profile',
        description: 'Update user profile',
        auth: true,
        body: [
          { name: 'displayName', type: 'string', description: 'Display name' },
          { name: 'bio', type: 'string', description: 'User bio' }
        ],
        response: '{ "data": {...}, "meta": { "updated": true } }'
      },
      {
        method: 'GET',
        path: '/settings',
        description: 'Get user settings',
        auth: true,
        response: '{ "data": { "theme": "dark", "dailyGoalMinutes": 15, ... } }'
      },
      {
        method: 'GET',
        path: '/profile/stats',
        description: 'Get detailed user statistics',
        auth: true,
        response: '{ "data": { "xp": {...}, "study": {...}, "streak": {...} } }'
      }
    ]
  },
  {
    name: 'Tokens',
    icon: <Key className="w-5 h-5" />,
    description: 'Manage API tokens',
    endpoints: [
      {
        method: 'GET',
        path: '/tokens',
        description: 'List all API tokens',
        auth: true,
        response: '{ "data": [...], "meta": { "total": 3, "active": 2 } }'
      },
      {
        method: 'POST',
        path: '/tokens',
        description: 'Create a new API token',
        auth: true,
        body: [
          { name: 'label', type: 'string', description: 'Token label' },
          { name: 'expiresInDays', type: 'number', description: 'Expiration in days' }
        ],
        response: '{ "data": { "token": "fdev_xxx...", ... }, "meta": { "warning": "..." } }'
      },
      {
        method: 'DELETE',
        path: '/tokens/:tokenId',
        description: 'Revoke a token (requires X-Confirm-Revoke: true header)',
        auth: true,
        response: '{ "data": { "id": "...", "revoked": true } }'
      }
    ]
  },
  {
    name: 'System',
    icon: <Shield className="w-5 h-5" />,
    description: 'Health and system status',
    endpoints: [
      {
        method: 'GET',
        path: '/health',
        description: 'Health check (no auth required)',
        auth: false,
        response: '{ "status": "healthy", "database": "connected", "uptime": 3600 }'
      },
      {
        method: 'GET',
        path: '/info',
        description: 'API information (no auth required)',
        auth: false,
        response: '{ "name": "...", "version": "1.0.0", "endpoints": [...] }'
      },
      {
        method: 'GET',
        path: '/stats',
        description: 'Database statistics',
        auth: true,
        response: '{ "embeddings": 1000, "searchHistory": 50, ... }'
      }
    ]
  }
]

// ============================================================================
// COMPONENTS
// ============================================================================

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-lg hover:bg-zinc-700 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-4 h-4 text-emerald-400" />
      ) : (
        <Copy className="w-4 h-4 text-zinc-400" />
      )}
    </button>
  )
}

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  return (
    <div className="relative group">
      <pre className="p-4 rounded-xl bg-zinc-900 overflow-x-auto text-sm">
        <code className="text-zinc-300 font-mono">{code}</code>
      </pre>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={code} />
      </div>
    </div>
  )
}

function MethodBadge({ method }: { method: 'GET' | 'POST' | 'PUT' | 'DELETE' }) {
  const colors = {
    GET: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    POST: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    PUT: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    DELETE: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
  }

  return (
    <span className={cn('px-2 py-0.5 text-xs font-mono font-bold rounded', colors[method])}>
      {method}
    </span>
  )
}

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
      >
        <MethodBadge method={endpoint.method} />
        <code className="flex-1 text-sm font-mono text-zinc-800 dark:text-zinc-200">
          {endpoint.path}
        </code>
        {!endpoint.auth && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">No auth</span>
        )}
        <ChevronDown className={cn(
          'w-4 h-4 text-zinc-400 transition-transform',
          expanded && 'rotate-180'
        )} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-4 border-t border-zinc-100 dark:border-zinc-700/50">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {endpoint.description}
              </p>

              {endpoint.params && endpoint.params.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                    Query Parameters
                  </h4>
                  <div className="space-y-2">
                    {endpoint.params.map(param => (
                      <div key={param.name} className="flex items-start gap-2 text-sm">
                        <code className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-mono">
                          {param.name}
                        </code>
                        <span className="text-xs text-zinc-500">{param.type}</span>
                        {param.required && <span className="text-xs text-red-500">required</span>}
                        <span className="text-zinc-500 dark:text-zinc-400">{param.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {endpoint.body && endpoint.body.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                    Request Body
                  </h4>
                  <div className="space-y-2">
                    {endpoint.body.map(field => (
                      <div key={field.name} className="flex items-start gap-2 text-sm">
                        <code className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-mono">
                          {field.name}
                        </code>
                        <span className="text-xs text-zinc-500">{field.type}</span>
                        <span className="text-zinc-500 dark:text-zinc-400">{field.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                  Response
                </h4>
                <pre className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 overflow-x-auto">
                  {endpoint.response}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CategorySection({ category }: { category: EndpointCategory }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <section className="space-y-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 group"
      >
        <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
          {category.icon}
        </div>
        <div className="text-left">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
            {category.name}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {category.description}
          </p>
        </div>
        <ChevronRight className={cn(
          'w-5 h-5 text-zinc-400 transition-transform ml-auto',
          expanded && 'rotate-90'
        )} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-3 pl-14"
          >
            {category.endpoints.map((endpoint, i) => (
              <EndpointCard key={i} endpoint={endpoint} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

// ============================================================================
// PAGE
// ============================================================================

export default function ApiDocsPage() {
  const resolvePath = useQuarryPath()

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      <Navigation />

      <main className="container mx-auto px-4 py-20">
        {/* Header */}
        <div className="max-w-4xl mx-auto mb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium mb-6"
          >
            <Zap className="w-4 h-4" />
            REST API v1.0
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-black text-zinc-900 dark:text-white mb-4"
          >
            Quarry Codex API
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto"
          >
            Access your knowledge base programmatically. Build integrations, automate workflows,
            and create custom applications.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-4 mt-8"
          >
            <a
              href={`${API_BASE_URL}/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Swagger UI
            </a>
            <Link
              href={resolvePath('/quarry/settings')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-medium transition-colors"
            >
              <Key className="w-4 h-4" />
              Manage Tokens
            </Link>
          </motion.div>
        </div>

        <div className="max-w-4xl mx-auto grid md:grid-cols-[280px_1fr] gap-8">
          {/* Sidebar - Quick Start */}
          <aside className="space-y-6">
            <div className="sticky top-24 space-y-6">
              {/* Base URL */}
              <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
                  Base URL
                </h3>
                <code className="text-xs font-mono text-blue-600 dark:text-blue-400 break-all">
                  {API_BASE_URL}
                </code>
              </div>

              {/* Quick Links */}
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                  Jump to
                </h3>
                {ENDPOINT_CATEGORIES.map(cat => (
                  <a
                    key={cat.name}
                    href={`#${cat.name.toLowerCase().replace(' ', '-')}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
                  >
                    {cat.icon}
                    {cat.name}
                  </a>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="space-y-12">
            {/* Authentication Section */}
            <section className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800/50">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/50">
                  <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">
                    Authentication
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    All API requests require a valid API token.
                  </p>
                </div>
              </div>

              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                Include your token in the <code className="px-1.5 py-0.5 rounded bg-white/50 dark:bg-zinc-800/50 font-mono text-xs">Authorization</code> header:
              </p>

              <CodeBlock code="Authorization: Bearer fdev_YOUR_API_TOKEN" />

              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-4">
                Generate tokens in{' '}
                <Link href={resolvePath('/quarry/settings')} className="text-blue-600 dark:text-blue-400 hover:underline">
                  Profile Settings → API Tokens
                </Link>
              </p>
            </section>

            {/* Quick Example */}
            <section>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                Quick Example
              </h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    cURL
                  </h3>
                  <CodeBlock
                    code={`curl -X GET "${API_BASE_URL}/strands" \\
  -H "Authorization: Bearer fdev_your_token_here"`}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    JavaScript / Node.js
                  </h3>
                  <CodeBlock
                    language="javascript"
                    code={`const response = await fetch('${API_BASE_URL}/strands', {
  headers: {
    'Authorization': 'Bearer fdev_your_token_here'
  }
});
const data = await response.json();
console.log(data.data); // Array of strands`}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Python
                  </h3>
                  <CodeBlock
                    language="python"
                    code={`import requests

response = requests.get(
    '${API_BASE_URL}/strands',
    headers={'Authorization': 'Bearer fdev_your_token_here'}
)
strands = response.json()['data']`}
                  />
                </div>
              </div>
            </section>

            {/* Endpoint Categories */}
            {ENDPOINT_CATEGORIES.map(category => (
              <div key={category.name} id={category.name.toLowerCase().replace(' ', '-')}>
                <CategorySection category={category} />
              </div>
            ))}

            {/* Rate Limits */}
            <section className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/50">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
                Rate Limits
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                The API is rate-limited to ensure fair usage:
              </p>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" />
                  100 requests per minute per token
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" />
                  Rate limit headers included in all responses
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" />
                  Automatic retry-after information on 429 errors
                </li>
              </ul>
            </section>

            {/* Error Handling */}
            <section>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
                Error Handling
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                All errors follow a consistent format:
              </p>
              <CodeBlock
                code={`{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {} // Optional additional context
}`}
              />

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <code className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">401</code>
                  <span className="text-zinc-600 dark:text-zinc-400">Unauthorized - Invalid or missing token</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">404</code>
                  <span className="text-zinc-600 dark:text-zinc-400">Not Found - Resource doesn&apos;t exist</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">429</code>
                  <span className="text-zinc-600 dark:text-zinc-400">Rate Limited - Too many requests</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">503</code>
                  <span className="text-zinc-600 dark:text-zinc-400">Database Unavailable - Try again later</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

