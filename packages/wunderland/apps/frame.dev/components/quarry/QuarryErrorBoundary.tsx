'use client'

/**
 * Quarry Error Boundary
 * @module components/quarry/QuarryErrorBoundary
 *
 * Catches React errors in the Quarry component tree and displays
 * a friendly error message instead of crashing the entire app.
 */

import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

export class QuarryErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Enhanced debugging - always log to console
    console.error('[QuarryErrorBoundary] Caught error:', error)
    console.error('[QuarryErrorBoundary] Component stack:', errorInfo.componentStack)
    console.error('[QuarryErrorBoundary] Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 10).join('\n'),
      componentStack: errorInfo.componentStack?.split('\n').slice(0, 15).join('\n'),
    })

    // Extract likely culprit from component stack
    const stackLines = errorInfo.componentStack?.split('\n').filter(Boolean) || []
    const culpritLine = stackLines.find(line => line.includes('at ') && !line.includes('ErrorBoundary'))
    if (culpritLine) {
      console.error('[QuarryErrorBoundary] Likely culprit component:', culpritLine.trim())
    }

    // SVG/Framer-motion specific error detection
    const isSvgError = error.message.includes('<circle>') ||
      error.message.includes('<rect>') ||
      error.message.includes('<path>') ||
      error.message.includes('<line>') ||
      error.message.includes('<svg>') ||
      error.message.includes('attribute r:') ||
      error.message.includes('attribute cx:') ||
      error.message.includes('attribute cy:') ||
      error.message.includes('Expected length')

    if (isSvgError) {
      console.error('[QuarryErrorBoundary] SVG/Animation error detected!')
      console.error('[QuarryErrorBoundary] This is likely from a framer-motion animated SVG element')

      // Try to find motion components in stack
      const motionComponents = stackLines.filter(line =>
        line.includes('motion.') ||
        line.includes('Motion') ||
        line.includes('AnimatePresence') ||
        line.toLowerCase().includes('animated') ||
        line.toLowerCase().includes('background') ||
        line.toLowerCase().includes('banner') ||
        line.toLowerCase().includes('icon') ||
        line.toLowerCase().includes('graph') ||
        line.toLowerCase().includes('sidebar')
      )
      if (motionComponents.length > 0) {
        console.error('[QuarryErrorBoundary] Potential motion/animated components in stack:')
        motionComponents.forEach(c => console.error('  -', c.trim()))
      }

      // Log full component stack for SVG errors to help debugging
      console.error('[QuarryErrorBoundary] Full component stack for SVG error:')
      stackLines.slice(0, 25).forEach((line, i) => {
        console.error(`  ${i + 1}. ${line.trim()}`)
      })
    }

    this.setState({ errorInfo })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/quarry'
  }

  handleClearStorage = () => {
    // Clear potentially corrupted storage that might cause the error
    try {
      // Clear IndexedDB databases
      if (window.indexedDB) {
        indexedDB.deleteDatabase('openstrand')
        indexedDB.deleteDatabase('openstrand_db')
        indexedDB.deleteDatabase('fabric_codex')
      }
      // Clear localStorage items related to quarry
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i)
        if (key?.startsWith('quarry_') || key?.startsWith('codex_')) {
          localStorage.removeItem(key)
        }
      }
      // Reload after clearing
      window.location.reload()
    } catch (e) {
      console.error('[QuarryErrorBoundary] Failed to clear storage:', e)
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const errorMessage = this.state.error?.message || 'An unexpected error occurred'
      const isStorageError = errorMessage.includes('IndexedDB') ||
        errorMessage.includes('storage') ||
        errorMessage.includes('object store')

      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-zinc-300 p-4">
          <div className="max-w-md w-full text-center">
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-6" />

            <h2 className="text-2xl font-semibold mb-2">
              Something went wrong
            </h2>

            <p className="text-sm text-zinc-500 mb-6">
              {errorMessage}
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reload page
              </button>

              {isStorageError && (
                <button
                  onClick={this.handleClearStorage}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-lg transition-colors"
                >
                  Clear cache and reload
                </button>
              )}

              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-lg transition-colors"
              >
                <Home className="w-4 h-4" />
                Go to Quarry home
              </button>
            </div>

            {this.state.errorInfo && (
              <details className="mt-6 text-left">
                <summary className="text-xs text-zinc-600 cursor-pointer hover:text-zinc-400">
                  Technical details (click to expand)
                </summary>
                <div className="mt-2 space-y-2">
                  <pre className="p-3 bg-zinc-900 rounded-lg overflow-auto text-xs text-zinc-500 max-h-32">
                    <span className="text-amber-400">Error: </span>{this.state.error?.message}
                  </pre>
                  <pre className="p-3 bg-zinc-900 rounded-lg overflow-auto text-xs text-zinc-500 max-h-48">
                    <span className="text-amber-400">Stack: </span>
                    {this.state.error?.stack?.split('\n').slice(0, 8).join('\n')}
                  </pre>
                  <pre className="p-3 bg-zinc-900 rounded-lg overflow-auto text-xs text-zinc-500 max-h-48">
                    <span className="text-amber-400">Component: </span>
                    {this.state.errorInfo.componentStack?.split('\n').slice(0, 10).join('\n')}
                  </pre>
                </div>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default QuarryErrorBoundary
