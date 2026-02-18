'use client'

/**
 * API Documentation Hub
 * 
 * Main API documentation page with embedded Swagger UI and quick reference.
 * Features interactive documentation, code examples, and API status.
 * 
 * @module app/quarry/api/page
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { 
  Book, 
  Key, 
  Code, 
  Terminal, 
  Zap,
  Server,
  Activity,
  ExternalLink,
  Settings,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronDown
} from 'lucide-react'
import Navigation from '@/components/navigation'
import Footer from '@/components/footer'
import { cn } from '@/lib/utils'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'

// Dynamic import for Swagger UI (client-side only)
const SwaggerUI = dynamic(
  () => import('swagger-ui-react').then(mod => mod.default),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }
)

// Import Swagger UI styles
import 'swagger-ui-react/swagger-ui.css'

// ============================================================================
// CONSTANTS
// ============================================================================

const API_PORT = process.env.NEXT_PUBLIC_API_PORT || '3847'
const API_BASE_URL = `http://localhost:${API_PORT}/api/v1`

// ============================================================================
// HOOKS
// ============================================================================

function useApiStatus() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [info, setInfo] = useState<{
    version?: string
    uptime?: number
    database?: string
  } | null>(null)

  const checkStatus = async () => {
    setStatus('checking')
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3000)
      
      const res = await fetch(`${API_BASE_URL}/health`, {
        signal: controller.signal
      })
      clearTimeout(timeout)
      
      if (res.ok) {
        const data = await res.json()
        setInfo({
          version: data.version,
          uptime: data.uptime,
          database: data.database
        })
        setStatus('online')
      } else {
        setStatus('offline')
      }
    } catch {
      setStatus('offline')
    }
  }

  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [])

  return { status, info, refresh: checkStatus }
}

// ============================================================================
// COMPONENTS
// ============================================================================

function ApiStatusBanner() {
  const resolvePath = useQuarryPath()
  const { status, info, refresh } = useApiStatus()

  return (
    <div className={cn(
      'rounded-2xl border p-6 transition-all duration-300',
      status === 'online' 
        ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50'
        : status === 'offline'
        ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50'
        : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700'
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={cn(
            'p-3 rounded-xl',
            status === 'online' 
              ? 'bg-emerald-100 dark:bg-emerald-900/30'
              : status === 'offline'
              ? 'bg-red-100 dark:bg-red-900/30'
              : 'bg-zinc-200 dark:bg-zinc-700'
          )}>
            {status === 'checking' ? (
              <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" />
            ) : status === 'online' ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            )}
          </div>
          
          <div>
            <h3 className={cn(
              'font-bold text-lg',
              status === 'online' 
                ? 'text-emerald-900 dark:text-emerald-100'
                : status === 'offline'
                ? 'text-red-900 dark:text-red-100'
                : 'text-zinc-900 dark:text-white'
            )}>
              {status === 'checking' ? 'Checking API Status...' : 
               status === 'online' ? 'API Server Online' : 'API Server Offline'}
            </h3>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm">
              <span className={cn(
                status === 'online' 
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : status === 'offline'
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-zinc-600 dark:text-zinc-400'
              )}>
                <Server className="w-4 h-4 inline mr-1" />
                Port: <code className="font-mono font-bold">{API_PORT}</code>
              </span>
              
              {status === 'online' && info && (
                <>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    <Activity className="w-4 h-4 inline mr-1" />
                    Database: {info.database || 'Connected'}
                  </span>
                  {info.uptime && (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Uptime: {Math.floor(info.uptime / 60)}m
                    </span>
                  )}
                </>
              )}
            </div>
            
            {status === 'offline' && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                Start the API server with: <code className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 font-mono text-xs">npm run api</code>
              </p>
            )}
          </div>
        </div>

        <button
          onClick={refresh}
          disabled={status === 'checking'}
          className={cn(
            'p-2 rounded-lg transition-colors',
            status === 'online' 
              ? 'hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
              : status === 'offline'
              ? 'hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400'
              : 'hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500'
          )}
          title="Refresh status"
        >
          <RefreshCw className={cn('w-5 h-5', status === 'checking' && 'animate-spin')} />
        </button>
      </div>

      {/* Quick Links */}
      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-current/10">
        <a
          href={`${API_BASE_URL}/docs`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            status === 'online'
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
              : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 cursor-not-allowed'
          )}
          onClick={e => status !== 'online' && e.preventDefault()}
        >
          <ExternalLink className="w-4 h-4" />
          Open Swagger UI
        </a>
        
        <Link
          href={resolvePath('/quarry/settings')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
        >
          <Key className="w-4 h-4" />
          Manage API Tokens
        </Link>
        
        <Link
          href={resolvePath('/quarry/api-docs')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
        >
          <Book className="w-4 h-4" />
          Reference Guide
        </Link>
      </div>
    </div>
  )
}

function ViewToggle({ view, onViewChange }: { view: 'swagger' | 'reference'; onViewChange: (v: 'swagger' | 'reference') => void }) {
  return (
    <div className="inline-flex items-center rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1">
      <button
        onClick={() => onViewChange('swagger')}
        className={cn(
          'px-4 py-2 rounded-lg text-sm font-medium transition-all',
          view === 'swagger' 
            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
        )}
      >
        <Zap className="w-4 h-4 inline mr-2" />
        Interactive
      </button>
      <button
        onClick={() => onViewChange('reference')}
        className={cn(
          'px-4 py-2 rounded-lg text-sm font-medium transition-all',
          view === 'reference' 
            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
        )}
      >
        <Book className="w-4 h-4 inline mr-2" />
        Reference
      </button>
    </div>
  )
}

// ============================================================================
// PAGE
// ============================================================================

export default function ApiPage() {
  const resolvePath = useQuarryPath()
  const [view, setView] = useState<'swagger' | 'reference'>('swagger')
  const { status } = useApiStatus()

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      <Navigation />
      
      <main className="container mx-auto px-4 py-20">
        {/* Header */}
        <div className="max-w-6xl mx-auto mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium mb-6">
              <Code className="w-4 h-4" />
              REST API v1.0
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-zinc-900 dark:text-white mb-4">
              Quarry Codex API
            </h1>
            
            <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Build integrations, automate workflows, and access your knowledge base programmatically.
            </p>
          </motion.div>

          {/* Status Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <ApiStatusBanner />
          </motion.div>

          {/* View Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center mb-8"
          >
            <ViewToggle view={view} onViewChange={setView} />
          </motion.div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto">
          {view === 'swagger' ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-lg"
            >
              {status === 'online' ? (
                <div className="swagger-container">
                  <style jsx global>{`
                    .swagger-container .swagger-ui {
                      font-family: inherit;
                    }
                    .swagger-container .swagger-ui .topbar {
                      display: none;
                    }
                    .swagger-container .swagger-ui .info {
                      margin: 20px 0;
                    }
                    .swagger-container .swagger-ui .scheme-container {
                      background: transparent;
                      box-shadow: none;
                      padding: 20px 0;
                    }
                    .dark .swagger-container .swagger-ui {
                      filter: invert(88%) hue-rotate(180deg);
                    }
                    .dark .swagger-container .swagger-ui img,
                    .dark .swagger-container .swagger-ui svg {
                      filter: invert(100%) hue-rotate(180deg);
                    }
                    .swagger-container .swagger-ui .opblock-tag {
                      font-size: 18px !important;
                    }
                    .swagger-container .swagger-ui .opblock {
                      margin-bottom: 10px;
                      border-radius: 8px;
                    }
                  `}</style>
                  <SwaggerUI
                    url="/openapi.yaml"
                    docExpansion="list"
                    defaultModelsExpandDepth={-1}
                    persistAuthorization={true}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                  <XCircle className="w-16 h-16 text-red-400 mb-6" />
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                    API Server Not Available
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400 mb-6 max-w-md">
                    The interactive documentation requires the API server to be running.
                  </p>
                  <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-4 text-left">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">Start the server with:</p>
                    <code className="block px-4 py-2 rounded-lg bg-zinc-900 text-emerald-400 font-mono text-sm">
                      npm run api
                    </code>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Book className="w-16 h-16 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                API Reference Guide
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                View the full endpoint reference with code examples.
              </p>
              <Link 
                href="/quarry/api-docs"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
              >
                <Book className="w-5 h-5" />
                View Reference Guide
              </Link>
            </motion.div>
          )}
        </div>

        {/* Quick Start Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="max-w-4xl mx-auto mt-16"
        >
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6 text-center">
            Quick Start
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">1</span>
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-white mb-2">Get a Token</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                Generate an API token from the settings page.
              </p>
              <Link href={resolvePath('/quarry/settings')} className="text-blue-500 hover:text-blue-600 text-sm font-medium">
                Go to Settings →
              </Link>
            </div>
            
            <div className="bg-white dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">2</span>
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-white mb-2">Make a Request</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                Include your token in the Authorization header.
              </p>
              <code className="text-xs text-zinc-500 font-mono">Bearer fdev_xxx...</code>
            </div>
            
            <div className="bg-white dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                <span className="text-xl font-bold text-purple-600 dark:text-purple-400">3</span>
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-white mb-2">Explore Data</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                Access weaves, looms, strands, and more.
              </p>
              <code className="text-xs text-zinc-500 font-mono">GET /api/v1/strands</code>
            </div>
          </div>
        </motion.div>
      </main>
      
      <Footer />
    </div>
  )
}








