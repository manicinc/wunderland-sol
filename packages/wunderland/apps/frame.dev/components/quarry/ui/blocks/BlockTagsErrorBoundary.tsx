/**
 * Error boundary specifically for Block Tags components
 * Catches React errors and displays debug info in development
 * @module codex/ui/BlockTagsErrorBoundary
 */

'use client'

import React, { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react'

interface Props {
  children: ReactNode
  componentName?: string
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export default class BlockTagsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Detailed logging for debugging
    const componentName = this.props.componentName || 'BlockTagsComponent'

    console.group(`[${componentName}] Error Boundary Caught`)
    console.error('Error:', error.message)
    console.error('Stack:', error.stack)
    console.error('Component Stack:', errorInfo.componentStack)

    // Check for common patterns
    if (error.message.includes('undefined') && error.message.includes('length')) {
      console.warn('⚠️ Likely cause: Accessing .length on undefined array')
      console.warn('Check that blocks, block.tags, or block.suggestedTags are defined')
    }

    console.groupEnd()

    this.setState({ errorInfo })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { error, errorInfo } = this.state
      const componentName = this.props.componentName || 'Block Tags'
      const isDev = process.env.NODE_ENV === 'development'

      return (
        <div className="p-3 text-xs border border-amber-200 dark:border-amber-800 rounded-md bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">{componentName} Error</span>
          </div>

          {isDev && error && (
            <div className="space-y-2 mb-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded text-amber-800 dark:text-amber-200 font-mono text-[10px] overflow-x-auto">
                {error.message}
              </div>

              {error.message.includes('length') && (
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-300">
                  <Bug className="w-3 h-3" />
                  <span>Check blocks array null safety</span>
                </div>
              )}

              {errorInfo?.componentStack && (
                <details className="text-[9px]">
                  <summary className="cursor-pointer text-amber-600 dark:text-amber-400 hover:underline">
                    Component Stack
                  </summary>
                  <pre className="mt-1 p-2 bg-zinc-100 dark:bg-zinc-800 rounded overflow-x-auto whitespace-pre-wrap">
                    {errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
          )}

          <button
            onClick={this.handleRetry}
            className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium rounded
                       bg-amber-200 text-amber-800 hover:bg-amber-300
                       dark:bg-amber-800 dark:text-amber-100 dark:hover:bg-amber-700
                       transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * HOC to wrap components with BlockTagsErrorBoundary
 */
export function withBlockTagsErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) {
  return function WithErrorBoundary(props: P) {
    return (
      <BlockTagsErrorBoundary componentName={componentName}>
        <WrappedComponent {...props} />
      </BlockTagsErrorBoundary>
    )
  }
}
