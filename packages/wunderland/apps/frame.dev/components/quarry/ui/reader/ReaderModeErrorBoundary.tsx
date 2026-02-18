/**
 * Error boundary specifically for Reader Mode
 * Catches React errors and displays a graceful fallback
 * @module codex/ui/ReaderModeErrorBoundary
 */

'use client'

import React, { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ReaderModeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console for debugging
    console.error('ReaderMode Error:', error)
    console.error('Error Info:', errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="space-y-2">
            <h3 className="font-medium text-ink-800 dark:text-paper-100">
              Reader Mode Unavailable
            </h3>
            <p className="text-sm text-paper-600 dark:text-ink-400 max-w-xs">
              Something went wrong loading reader mode. This doesn&apos;t affect the main content.
            </p>
          </div>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md
                       bg-cyan-50 text-cyan-700 hover:bg-cyan-100
                       dark:bg-cyan-900/30 dark:text-cyan-300 dark:hover:bg-cyan-900/50
                       transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
