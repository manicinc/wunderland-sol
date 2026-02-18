/**
 * Code execution output display component
 * Shows execution results with ANSI color support and collapsible output
 * @module codex/ui/CodeOutput
 */

'use client'

import React, { useState, useEffect } from 'react'
import {
  Check,
  X,
  Copy,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle,
  WifiOff,
} from 'lucide-react'
import type { ExecutionResult, ExecutionStatus } from '@/lib/execution/types'

interface CodeOutputProps {
  /** Execution result to display */
  result: ExecutionResult
  /** Current execution status */
  status: ExecutionStatus
  /** Callback when output is cleared */
  onClear?: () => void
  /** Whether the output can be saved to markdown */
  canSave?: boolean
  /** Callback to save output to markdown */
  onSave?: () => void
  /** Maximum lines before collapsing */
  collapseThreshold?: number
}

/**
 * Status indicator component
 */
function StatusIndicator({ status }: { status: ExecutionStatus }) {
  switch (status) {
    case 'running':
      return (
        <div className="flex items-center gap-1.5 text-amber-500">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs font-medium">Running...</span>
        </div>
      )
    case 'success':
      return (
        <div className="flex items-center gap-1.5 text-emerald-500">
          <Check className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Success</span>
        </div>
      )
    case 'error':
      return (
        <div className="flex items-center gap-1.5 text-red-500">
          <X className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Error</span>
        </div>
      )
    case 'timeout':
      return (
        <div className="flex items-center gap-1.5 text-orange-500">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Timeout</span>
        </div>
      )
    case 'offline':
      return (
        <div className="flex items-center gap-1.5 text-zinc-500">
          <WifiOff className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Offline</span>
        </div>
      )
    default:
      return null
  }
}

/**
 * Convert ANSI escape codes to HTML spans
 * Simple implementation for common color codes
 */
function ansiToHtml(text: string): string {
  const ansiColors: Record<string, string> = {
    '30': 'color: #1a1a1a',
    '31': 'color: #e53e3e',
    '32': 'color: #38a169',
    '33': 'color: #d69e2e',
    '34': 'color: #3182ce',
    '35': 'color: #805ad5',
    '36': 'color: #0bc5ea',
    '37': 'color: #e2e8f0',
    '90': 'color: #718096',
    '91': 'color: #fc8181',
    '92': 'color: #68d391',
    '93': 'color: #faf089',
    '94': 'color: #63b3ed',
    '95': 'color: #b794f4',
    '96': 'color: #76e4f7',
    '97': 'color: #f7fafc',
    '1': 'font-weight: bold',
    '3': 'font-style: italic',
    '4': 'text-decoration: underline',
  }

  // Replace ANSI codes with spans
  let result = text
    // Reset
    .replace(/\x1b\[0m/g, '</span>')
    // Colors and styles
    .replace(/\x1b\[(\d+)m/g, (_, code) => {
      const style = ansiColors[code]
      return style ? `<span style="${style}">` : ''
    })
    // Remove any remaining escape sequences
    .replace(/\x1b\[[0-9;]*m/g, '')

  // Balance unclosed spans
  const openTags = (result.match(/<span/g) || []).length
  const closeTags = (result.match(/<\/span>/g) || []).length
  for (let i = 0; i < openTags - closeTags; i++) {
    result += '</span>'
  }

  return result
}

/**
 * Code execution output display
 */
export default function CodeOutput({
  result,
  status,
  onClear,
  canSave,
  onSave,
  collapseThreshold = 20,
}: CodeOutputProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  // Process output - using useState+useEffect to avoid useMemo dependency comparison crashes
  // when result changes from undefined to an object (React tries to access .length on undefined)
  const [outputLines, setOutputLines] = useState<OutputLine[]>([])
  const [isLong, setIsLong] = useState(false)
  const [displayedLines, setDisplayedLines] = useState<OutputLine[]>([])
  const [formattedDuration, setFormattedDuration] = useState<string | null>(null)

  useEffect(() => {
    // Safely extract output array
    const lines = Array.isArray(result?.output) ? result.output : []
    const long = lines.length > collapseThreshold
    const displayed = long && !isExpanded
      ? lines.slice(0, collapseThreshold)
      : lines
    
    setOutputLines(lines)
    setIsLong(long)
    setDisplayedLines(displayed)

    // Format duration
    if (result?.duration) {
      if (result.duration < 1000) {
        setFormattedDuration(`${Math.round(result.duration)}ms`)
      } else {
        setFormattedDuration(`${(result.duration / 1000).toFixed(2)}s`)
      }
    } else {
      setFormattedDuration(null)
    }
  }, [result, collapseThreshold, isExpanded])

  // Copy output
  const handleCopy = async () => {
    const text = outputLines.join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mt-1 rounded-md border border-gray-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-0.5 bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            Output
          </span>
          <StatusIndicator status={status} />
          {formattedDuration && (
            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono">
              {formattedDuration}
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className={`p-1 rounded transition-colors ${
              copied
                ? 'text-emerald-500'
                : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
            }`}
            title={copied ? 'Copied!' : 'Copy output'}
          >
            {copied ? (
              <Check className="w-3 h-3" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>

          {/* Save button */}
          {canSave && onSave && (
            <button
              onClick={onSave}
              className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              title="Save output to markdown"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
            </button>
          )}

          {/* Clear button */}
          {onClear && (
            <button
              onClick={onClear}
              className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              title="Clear output"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Output content */}
      <div className="bg-white dark:bg-zinc-900">
        {/* Error display */}
        {result.error && (
          <div className="px-2 py-1.5 bg-red-50/80 dark:bg-red-900/20">
            <div className="flex items-start gap-1.5">
              <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0 mt-0.5" />
              <pre className="text-[11px] font-mono text-red-600 dark:text-red-400 whitespace-pre-wrap break-words">
                {result.error}
              </pre>
            </div>
          </div>
        )}

        {/* Standard output */}
        {displayedLines.length > 0 && (
          <pre className="px-2 py-1.5 text-[11px] font-mono leading-relaxed overflow-x-auto text-zinc-700 dark:text-zinc-300 !bg-transparent !m-0 !border-0">
            {displayedLines.map((line, i) => (
              <div
                key={i}
                className="min-h-[1.2em]"
                dangerouslySetInnerHTML={{ __html: ansiToHtml(line) || '&nbsp;' }}
              />
            ))}
          </pre>
        )}

        {/* Empty output */}
        {displayedLines.length === 0 && !result.error && (
          <div className="px-2 py-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 italic">
            No output
          </div>
        )}

        {/* Expand/collapse button */}
        {isLong && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-2 py-1 flex items-center justify-center gap-1 text-[10px] font-medium text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 bg-gray-50 dark:bg-zinc-800 border-t border-gray-200 dark:border-zinc-700 transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                Show all ({outputLines.length} lines)
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
