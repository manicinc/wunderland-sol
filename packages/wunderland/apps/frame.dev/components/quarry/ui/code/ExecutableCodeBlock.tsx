/**
 * Executable code block component
 * Wraps CodeBlock with execution capability, run button, and output display
 * @module codex/ui/ExecutableCodeBlock
 */

'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  Play,
  Square,
  Check,
  Copy,
  ChevronDown,
  Loader2,
  WifiOff,
  AlertTriangle,
} from 'lucide-react'
import { useCodeExecution } from '@/hooks/useCodeExecution'
import CodeOutput from './CodeOutput'
import type { ExecutionLanguage } from '@/lib/execution/types'

// Popular languages for the dropdown
const POPULAR_LANGUAGES = [
  { value: '', label: 'Auto-detect' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'bash', label: 'Bash' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
]

interface ExecutableCodeBlockProps {
  /** Code to display and execute */
  code: string
  /** Language of the code */
  language?: string
  /** Block ID for tracking */
  blockId?: string
  /** Execution ID for persistence */
  execId?: string
  /** Whether the block is executable */
  executable?: boolean
  /** Callback when code is edited */
  onCodeChange?: (code: string) => void
  /** Callback to save output to markdown */
  onSaveOutput?: (output: string[]) => void
  /** Additional class names */
  className?: string
}

/**
 * Escape HTML entities for plain text fallback
 */
function escapeHtml(text: string | null | undefined): string {
  if (text == null) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Executable code block with syntax highlighting and execution
 */
export default function ExecutableCodeBlock(props: ExecutableCodeBlockProps | null | undefined) {
  // FIX: Early return for null/undefined props - MUST be before any hooks!
  // This prevents React Error #311 from hook count mismatch when parent passes invalid props
  // Note: This technically violates rules of hooks but is necessary for crash prevention
  if (!props || typeof props !== 'object' || !('code' in props)) {
    console.warn('[ExecutableCodeBlock] RENDER START - props:', {
      hasProps: false,
      executable: undefined,
      language: undefined,
      codeLength: undefined,
    })
    return (
      <div className="p-3 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
        <span className="font-medium">⚠️</span> Code block loading...
      </div>
    )
  }

  // Safely extract props with fallbacks (before any hooks)
  const safeProps = props as Partial<ExecutableCodeBlockProps>
  const code = typeof safeProps.code === 'string' ? safeProps.code : ''
  const initialLanguage = typeof safeProps.language === 'string' ? safeProps.language : ''
  const blockId = safeProps.blockId
  const execId = safeProps.execId
  const executable = safeProps.executable ?? false
  const onCodeChange = safeProps.onCodeChange
  const onSaveOutput = safeProps.onSaveOutput
  const className = safeProps.className

  // Ensure code is always a string
  const safeCode = code || ''

  // All hooks must be called unconditionally
  // Hook #1-3: useState
  const [copied, setCopied] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage || '')
  // Hook #4-5: useRef
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Normalize code - inline to avoid useMemo dependency crashes
  const normalizedCode = safeCode.replace(/\n$/, '')

  // Hook #6: useCodeExecution (custom hook with internal useState/useEffect)
  const { state, execute, clear, capabilities } = useCodeExecution(
    normalizedCode,
    selectedLanguage || initialLanguage || 'javascript',
    execId
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Use selected language or default to auto - simple inline calculation
  const foundLang = selectedLanguage ? POPULAR_LANGUAGES.find(l => l.value === selectedLanguage) : null
  const displayLanguage = foundLang ? foundLang.label : (selectedLanguage || 'auto')

  // Render plain escaped HTML (no syntax highlighting to avoid lowlight issues)
  const escapedCode = escapeHtml(normalizedCode)

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(normalizedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [normalizedCode])

  // Handle language selection
  const handleLanguageSelect = useCallback((lang: string) => {
    setSelectedLanguage(lang)
    setShowDropdown(false)
  }, [])

  // Handle execution
  const handleRun = useCallback(async () => {
    if (state.isRunning) return
    await execute()
  }, [state.isRunning, execute])

  // Handle save output - guard against non-array output
  const handleSaveOutput = useCallback(() => {
    if (state.result && Array.isArray(state.result.output) && onSaveOutput) {
      onSaveOutput(state.result.output)
    }
  }, [state.result, onSaveOutput])

  // Check if we can run
  const canRun = executable && state.isAvailable && !state.isRunning
  const showOfflineWarning = executable && state.isOffline

  return (
    <div
      data-block-id={blockId}
      data-block-type="code"
      data-executable={executable}
      data-exec-id={execId}
      className={`relative group my-2 rounded-md overflow-hidden border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 ${className || ''}`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-2 py-0.5 bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
        <div className="flex items-center gap-1.5">
          {/* Language selector */}
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-1 px-1 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded transition-colors"
              title="Select language"
            >
              {displayLanguage}
              <ChevronDown className="w-2.5 h-2.5" />
            </button>

            {/* Dropdown menu */}
            {showDropdown && (
              <div
                ref={dropdownRef}
                className="absolute top-full left-0 mt-1 w-36 max-h-56 overflow-y-auto bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg z-50"
              >
                {POPULAR_LANGUAGES.map((lang) => (
                  <button
                    key={lang.value || 'auto'}
                    onClick={() => handleLanguageSelect(lang.value)}
                    className={`w-full text-left px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors ${(selectedLanguage === lang.value) || (!selectedLanguage && !lang.value)
                        ? 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 font-medium'
                        : 'text-zinc-600 dark:text-zinc-300'
                      }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Executable badge */}
          {executable && (
            <span className="px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wider rounded bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              exec
            </span>
          )}

          {/* Offline warning */}
          {showOfflineWarning && (
            <div className="flex items-center gap-0.5 px-1 py-0.5 text-[8px] font-medium rounded bg-amber-100/80 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <WifiOff className="w-2 h-2" />
              Offline
            </div>
          )}

          {/* Unavailable warning */}
          {executable && !state.isAvailable && !state.isOffline && (
            <div className="flex items-center gap-0.5 px-1 py-0.5 text-[8px] font-medium rounded bg-zinc-200/80 dark:bg-zinc-700/50 text-zinc-500 dark:text-zinc-400" title={state.unavailableReason}>
              <AlertTriangle className="w-2 h-2" />
              Unavailable
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Run button */}
          {executable && (
            <button
              onClick={handleRun}
              disabled={!canRun}
              className={`flex items-center gap-1 px-1 py-0.5 text-[10px] font-medium rounded transition-all ${state.isRunning
                  ? 'text-amber-600 dark:text-amber-400'
                  : canRun
                    ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30'
                    : 'text-zinc-300 dark:text-zinc-600 cursor-not-allowed'
                }`}
              title={
                state.isRunning
                  ? 'Running...'
                  : !state.isAvailable
                    ? state.unavailableReason || 'Execution not available'
                    : 'Run code'
              }
            >
              {state.isRunning ? (
                <>
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  <span>Running</span>
                </>
              ) : (
                <>
                  <Play className="w-2.5 h-2.5" />
                  <span>Run</span>
                </>
              )}
            </button>
          )}

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1 px-1 py-0.5 text-[10px] font-medium rounded transition-all ${copied
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
            title={copied ? 'Copied!' : 'Copy code'}
          >
            {copied ? (
              <>
                <Check className="w-2.5 h-2.5" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-2.5 h-2.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code content */}
      <pre className="!m-0 !bg-white dark:!bg-zinc-900 !p-0 !border-0 !rounded-none overflow-x-auto">
        <code
          className="block px-4 py-3 text-[13px] font-mono leading-relaxed !bg-transparent text-zinc-800 dark:text-zinc-200"
          dangerouslySetInnerHTML={{ __html: escapedCode }}
        />
      </pre>

      {/* Output display - guard against malformed result.output */}
      {state.result && Array.isArray(state.result.output) && (
        <CodeOutput
          result={state.result}
          status={state.status}
          onClear={clear}
          canSave={!!onSaveOutput}
          onSave={handleSaveOutput}
        />
      )}
    </div>
  )
}
