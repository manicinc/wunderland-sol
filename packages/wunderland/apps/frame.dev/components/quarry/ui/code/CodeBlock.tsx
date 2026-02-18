/**
 * Code block component with syntax highlighting, copy button, and language selector
 * Uses lowlight for highlighting (same as TipTap code-block-lowlight)
 *
 * PERFORMANCE: Lowlight is lazy-loaded on first code block render
 * - Reduces initial bundle size by ~200KB
 * - Shows plain code immediately, adds highlighting when loaded
 *
 * ERROR HANDLING: Wraps rendering in error boundary to prevent crashes
 * - Catches "Cannot read properties of undefined (reading 'length')" errors
 * - Falls back to plain text rendering on error
 *
 * FIX v2.4.0: Removed lazy-loading of ExecutableCodeBlock to fix React #311
 * - Custom lazy-loading caused hook count mismatches between renders
 * - ExecutableCodeBlock is now imported directly (adds ~10KB but fixes crashes)
 *
 * @module codex/ui/CodeBlock
 * @version 2.4.0 - 2026-01-06 remove lazy loading to fix React #311
 */

'use client'

import React, { useState, useCallback, useRef, useEffect, Component, type ReactNode, type ErrorInfo } from 'react'
import { Check, Copy, ChevronDown } from 'lucide-react'
import ExecutableCodeBlock from './ExecutableCodeBlock'

// ============================================================================
// ERROR BOUNDARY for CodeBlock
// Catches runtime errors in code rendering and displays fallback
// ============================================================================

interface CodeBlockErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface CodeBlockErrorBoundaryProps {
  children: ReactNode
  code: string
  language?: string
}

class CodeBlockErrorBoundary extends Component<CodeBlockErrorBoundaryProps, CodeBlockErrorBoundaryState> {
  constructor(props: CodeBlockErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): CodeBlockErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[CodeBlock] Error caught in boundary:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      code: this.props.code?.substring(0, 100) + '...',
      language: this.props.language,
    })
  }

  render() {
    if (this.state.hasError) {
      // Fallback: render plain text code block
      return (
        <div className="relative group my-2 rounded-md overflow-hidden border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
          <div className="px-2 py-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 border-b border-amber-200 dark:border-amber-700">
            ⚠️ Code rendering error - showing plain text
          </div>
          <pre className="!m-0 !bg-white dark:!bg-zinc-900 !p-0.5 !border-0 !rounded-none overflow-x-auto">
            <code className="block px-3 py-2.5 text-[13px] font-mono leading-relaxed !bg-transparent text-zinc-800 dark:text-zinc-200">
              {this.props.code || ''}
            </code>
          </pre>
        </div>
      )
    }

    return this.props.children
  }
}

// Lazy-loaded lowlight instance (initialized on first use)
let lowlightInstance: any = null
let lowlightPromise: Promise<any> | null = null

/**
 * Initialize lowlight lazily - only loads when first code block renders
 * Returns cached instance if already loaded
 */
async function getLowlight() {
  // Debug: Log to verify new version is running
  if (typeof window !== 'undefined' && !(window as any).__codeblock_version_logged) {
    console.log('[CodeBlock] v2.4.0 - direct import, no lazy loading')
    ;(window as any).__codeblock_version_logged = true
  }
  
  if (lowlightInstance) return lowlightInstance

  if (!lowlightPromise) {
    lowlightPromise = (async () => {
      const [{ createLowlight, common }, { toHtml }] = await Promise.all([
        import('lowlight'),
        import('hast-util-to-html')
      ])
      lowlightInstance = { lowlight: createLowlight(common), toHtml }
      return lowlightInstance
    })()
  }

  return lowlightPromise
}

// Popular languages for the dropdown (subset of common)
const POPULAR_LANGUAGES = [
  { value: '', label: 'Auto-detect' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'php', label: 'PHP' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'bash', label: 'Bash/Shell' },
  { value: 'sql', label: 'SQL' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'xml', label: 'XML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'diff', label: 'Diff' },
  { value: 'plaintext', label: 'Plain Text' },
]

interface CodeBlockProps {
  code: string
  language?: string
  blockId?: string
  /** Execution ID for persistence (from remark plugin) */
  execId?: string
  /** Whether this code block is executable */
  executable?: boolean
  /** Callback when code is edited (for executable blocks) */
  onCodeChange?: (code: string) => void
  /** Callback to save output to markdown (for executable blocks) */
  onSaveOutput?: (output: string[]) => void
  className?: string
}

/**
 * Syntax-highlighted code block with copy button and language selector
 * PERFORMANCE: Uses lazy-loaded lowlight - shows plain code first, then highlights
 *
 * When `executable` is true, renders ExecutableCodeBlock with run capability
 */
export default function CodeBlock(props: CodeBlockProps | null | undefined) {
  // Safely extract props with fallbacks (before any hooks)
  const safeProps = (props && typeof props === 'object') ? props : {} as Partial<CodeBlockProps>
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

  // ALL HOOKS MUST BE DECLARED AT THE TOP - React rules of hooks
  // Hook #1-5: useState (reduced from 6 - removed lazy-load state)
  const [copied, setCopied] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage || '')
  const [highlighter, setHighlighter] = useState<any>(null)
  const [isHighlightReady, setIsHighlightReady] = useState(false)
  // Hook #6-7: useRef
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Load lowlight lazily on mount
  useEffect(() => {
    let mounted = true
    getLowlight().then((hl) => {
      if (mounted) {
        setHighlighter(hl)
        setIsHighlightReady(true)
      }
    })
    return () => { mounted = false }
  }, [])

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

  // Normalize code (remove trailing newline) - inline to avoid useMemo dependency crashes
  const normalizedCode = safeCode.replace(/\n$/, '')

  // Validate highlighter has expected structure before use
  // This prevents errors when React compares hook dependencies with malformed objects
  const hasValidHighlighter = isHighlightReady && 
    highlighter && 
    typeof highlighter.lowlight?.highlight === 'function' &&
    typeof highlighter.lowlight?.highlightAuto === 'function' &&
    typeof highlighter.toHtml === 'function'

  // State for detected language and highlighted HTML
  // Using useState + useEffect instead of useMemo to avoid React's internal dependency 
  // array comparison which can crash with "Cannot read properties of undefined (reading 'length')"
  const [detectedLanguage, setDetectedLanguage] = useState('')
  const [highlightedHtml, setHighlightedHtml] = useState(() => escapeHtml(normalizedCode))

  // Auto-detect language when highlighter is ready
  useEffect(() => {
    if (selectedLanguage && selectedLanguage !== 'plaintext') {
      setDetectedLanguage(selectedLanguage)
      return
    }

    if (!hasValidHighlighter) {
      setDetectedLanguage('')
      return
    }

    // Try to auto-detect
    try {
      const result = highlighter.lowlight.highlightAuto(normalizedCode)
      // Only use detected language if result is valid and has confidence data
      if (result && result.data && (result.data as any).language) {
        setDetectedLanguage((result.data as any).language)
        return
      }
    } catch {
      // Ignore detection errors - will fall back to no language
    }

    setDetectedLanguage('')
  }, [normalizedCode, selectedLanguage, hasValidHighlighter, highlighter])

  // Get highlighted HTML (with fallback to plain text while loading)
  useEffect(() => {
    if (!normalizedCode) {
      setHighlightedHtml('')
      return
    }

    // If highlighter not ready or invalid, show plain escaped text
    if (!hasValidHighlighter) {
      setHighlightedHtml(escapeHtml(normalizedCode))
      return
    }

    try {
      let result
      if (detectedLanguage && detectedLanguage !== 'plaintext') {
        // Try to highlight with specified/detected language
        try {
          result = highlighter.lowlight.highlight(detectedLanguage, normalizedCode)
        } catch {
          // Language not registered, fall back to auto
          result = highlighter.lowlight.highlightAuto(normalizedCode)
        }
      } else {
        // Auto-detect
        result = highlighter.lowlight.highlightAuto(normalizedCode)
      }
      // Guard against malformed result from lowlight - check children is valid array
      if (!result || !result.children || !Array.isArray(result.children)) {
        setHighlightedHtml(escapeHtml(normalizedCode))
        return
      }
      // Wrap toHtml in separate try-catch - it can throw on malformed HAST nodes
      try {
        setHighlightedHtml(highlighter.toHtml(result))
      } catch (toHtmlErr) {
        console.warn('[CodeBlock] toHtml error, falling back to plain text:', toHtmlErr)
        setHighlightedHtml(escapeHtml(normalizedCode))
      }
    } catch (err) {
      // Fallback to plain text on any error
      console.warn('[CodeBlock] Highlight error, falling back to plain text:', err)
      setHighlightedHtml(escapeHtml(normalizedCode))
    }
  }, [normalizedCode, detectedLanguage, hasValidHighlighter, highlighter])

  // Display language name - simple inline calculation
  const displayLang = selectedLanguage || detectedLanguage
  const foundLang = displayLang ? POPULAR_LANGUAGES.find(l => l.value === displayLang) : null
  const displayLanguage = foundLang ? foundLang.label : (displayLang || 'auto')

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

  // If executable, render ExecutableCodeBlock directly (no lazy loading)
  // This avoids React error #311 caused by hook count changes during lazy load
  if (executable) {
    return (
      <CodeBlockErrorBoundary code={safeCode} language={initialLanguage}>
        <ExecutableCodeBlock
        code={safeCode}
        language={initialLanguage}
        blockId={blockId}
        execId={execId}
        executable={true}
        onCodeChange={onCodeChange}
        onSaveOutput={onSaveOutput}
        className={className}
      />
      </CodeBlockErrorBoundary>
    )
  }

  return (
    <CodeBlockErrorBoundary code={safeCode} language={initialLanguage}>
    <div
      data-block-id={blockId}
      data-block-type="code"
      className={`relative group my-2 rounded-md overflow-hidden border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 ${className || ''}`}
    >
      {/* Header bar with language selector and copy button */}
      <div className="flex items-center justify-between px-2 py-0.5 bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
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
              className="absolute top-full left-0 mt-1 w-40 max-h-56 overflow-y-auto bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg z-50"
            >
              {POPULAR_LANGUAGES.map((lang) => (
                <button
                  key={lang.value || 'auto'}
                  onClick={() => handleLanguageSelect(lang.value)}
                  className={`w-full text-left px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors ${
                    (selectedLanguage === lang.value) || (!selectedLanguage && !lang.value)
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

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1 px-1 py-0.5 text-[10px] font-medium rounded transition-all ${
            copied
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

      {/* Code content */}
      <pre className="!m-0 !bg-white dark:!bg-zinc-900 !p-0.5 !border-0 !rounded-none overflow-x-auto">
        <code
          className="block px-3 py-2.5 text-[13px] font-mono leading-relaxed hljs !bg-transparent"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      </pre>
    </div>
    </CodeBlockErrorBoundary>
  )
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
