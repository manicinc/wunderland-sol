/**
 * Tiptap WYSIWYG Editor - Enhanced
 * @module codex/ui/TiptapEditor
 *
 * @remarks
 * Full-featured WYSIWYG editor with:
 * - Bubble menu for text formatting
 * - Slash commands for quick insertion
 * - Syntax highlighted code blocks
 * - Image support with drag & drop
 * - Task lists
 * - Tables
 * - Custom styled to match Frame design system
 */

'use client'

import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import { motion, AnimatePresence } from 'framer-motion'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Typography from '@tiptap/extension-typography'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TextAlign from '@tiptap/extension-text-align'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
// REMOVED: import { common, createLowlight } from 'lowlight' - now loaded async
import type { ThemeName } from '@/types/theme'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  Link2, Highlighter, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare,
  Quote, Minus, Image as ImageIcon, Code2, Undo, Redo, Table2,
  Subscript as SubscriptIcon, Superscript as SuperscriptIcon,
  Plus, Bookmark, X, BookOpen, Globe, Search, BookMarked, Languages,
  Sparkles, Keyboard, Hash,
} from 'lucide-react'
import type { HighlightColor } from '@/lib/localStorage'
import dynamic from 'next/dynamic'
import { detectCitationType } from '@/lib/citations'
import type { Citation } from '@/lib/citations/types'
import { FocusLineExtension } from './FocusLineExtension'
import { SlashCommandExtension, deleteSlashQuery } from './SlashCommandExtension'

// Custom extensions for enhanced content
import { MermaidExtension } from './extensions/MermaidExtension'
import { LatexInlineExtension, LatexBlockExtension } from './extensions/LatexExtension'
import { CalloutExtension } from './extensions/CalloutExtension'
import { FormulaExtension } from './extensions/FormulaExtension'
import { VideoExtension } from './extensions/VideoExtension'
import { AudioExtension } from './extensions/AudioExtension'
import { EmbedExtension } from './extensions/EmbedExtension'
import { ToggleExtension } from './extensions/ToggleExtension'
import { TextColorExtension } from './extensions/TextColorExtension'
import { TextStyle } from '@tiptap/extension-text-style'
import { DebouncedMarkdownConverter, htmlToMarkdownSync, markdownToHtmlAsync, markdownToHtmlSync } from '@/lib/editor/asyncMarkdownConverter'

// Dynamic import RadialMediaMenu to avoid SSR issues
const RadialMediaMenu = dynamic(() => import('../misc/RadialMediaMenu'), { ssr: false })
const CitationInput = dynamic(() => import('../citations/CitationInput'), { ssr: false })
const CitationPastePopup = dynamic(
  () => import('../citations/CitationInput').then((mod) => mod.CitationPastePopup),
  { ssr: false }
)
const ResearchPanel = dynamic(() => import('../research/ResearchPanel'), { ssr: false })
const AISelectionMenu = dynamic(() => import('../ai/AISelectionMenu'), { ssr: false })
const AISelectionPreview = dynamic(() => import('../ai/AISelectionPreview'), { ssr: false })
const TableMenu = dynamic(() => import('./menus/TableMenu'), { ssr: false })
const SlashCommandMenu = dynamic(() => import('./menus/SlashCommandMenu'), { ssr: false })
const CommandPalette = dynamic(() => import('./menus/CommandPalette'), { ssr: false })

import { type SelectionAction, performSelectionAction, SELECTION_ACTIONS } from '@/lib/ai/selectionActions'
import { hasAnyLLMKey } from '@/lib/llm'
import { FloatingBubbleMenu } from '../editor/FloatingBubbleMenu'
import { InlineTagEditor } from '../editor/InlineTagEditor'
import { getAllBlockTags, updateBlockTags, getBlockById } from '@/lib/blockDatabase'

// ============================================================================
// ASYNC EXTENSION LOADING
// ============================================================================
// Lowlight with 'common' languages is ~100KB+ of JS to parse
// Loading it synchronously blocks the main thread and causes freezing
// Instead, we load it asynchronously and use a promise-based cache

type LowlightType = ReturnType<Awaited<typeof import('lowlight')>['createLowlight']>

// Module-level promise for async extension loading
let extensionsPromise: Promise<ReturnType<typeof createEditorExtensionsSync>> | null = null
let cachedExtensions: ReturnType<typeof createEditorExtensionsSync> | null = null
let lowlightInstance: LowlightType | null = null

// Async lowlight loader - runs once on first editor mount
async function loadLowlightAsync(): Promise<LowlightType> {
  if (lowlightInstance) return lowlightInstance

  try {
    console.log('[TiptapEditor] Starting lowlight import...')
    const start = performance.now()
    const { common, createLowlight } = await import('lowlight')
    console.log('[TiptapEditor] Lowlight imported in', (performance.now() - start).toFixed(1), 'ms')
    lowlightInstance = createLowlight(common)
    console.log('[TiptapEditor] Lowlight initialized in', (performance.now() - start).toFixed(1), 'ms total')
    return lowlightInstance
  } catch (err) {
    console.error('[TiptapEditor] Failed to load lowlight:', err)
    throw err
  }
}

// Pre-warm extensions on module load (non-blocking)
// This starts loading immediately when the module is imported
if (typeof window !== 'undefined') {
  // Start loading in background - don't await, just kick it off
  setTimeout(() => {
    if (!extensionsPromise) {
      extensionsPromise = loadExtensionsAsync()
    }
  }, 0)
}

// Async extension loader
async function loadExtensionsAsync() {
  if (cachedExtensions) return cachedExtensions

  const lowlight = await loadLowlightAsync()
  cachedExtensions = createEditorExtensionsSync(lowlight)

  return cachedExtensions
}

// Hook for components to get extensions (suspends until ready)
function useExtensionsAsync() {
  const [extensions, setExtensions] = React.useState<ReturnType<typeof createEditorExtensionsSync> | null>(
    cachedExtensions
  )
  const [isLoading, setIsLoading] = React.useState(!cachedExtensions)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    console.log('[TiptapEditor] useExtensionsAsync - cachedExtensions:', !!cachedExtensions, 'isLoading:', isLoading)

    if (cachedExtensions) {
      setExtensions(cachedExtensions)
      setIsLoading(false)
      return
    }

    if (!extensionsPromise) {
      console.log('[TiptapEditor] Starting extension loading...')
      extensionsPromise = loadExtensionsAsync()
    }

    // Safety timeout - if extensions don't load in 5s, something is wrong
    const timeout = setTimeout(() => {
      if (!cachedExtensions) {
        console.error('[TiptapEditor] Extension loading timed out after 5s')
        setError(new Error('Extension loading timed out'))
        setIsLoading(false)
      }
    }, 5000)

    extensionsPromise
      .then(exts => {
        clearTimeout(timeout)
        setExtensions(exts)
        setIsLoading(false)
      })
      .catch(err => {
        clearTimeout(timeout)
        console.error('[TiptapEditor] Failed to load extensions:', err)
        setError(err)
        setIsLoading(false)
      })

    return () => clearTimeout(timeout)
  }, [])

  return { extensions, isLoading, error }
}

// Sync fallback for when lowlight isn't loaded yet (uses basic CodeBlock)
const getLowlightSync = () => lowlightInstance

/**
 * Safely configure an extension, returning undefined if the extension is undefined.
 * This handles ESM/CJS interop issues where tree-shaking might result in undefined imports.
 */
const safeConfigureExtension = (
  name: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extension: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => {
  if (!extension) {
    console.error(`[TiptapEditor] Core extension ${name} is undefined - skipping`)
    return undefined
  }
  if (options !== undefined && typeof extension.configure === 'function') {
    try {
      return extension.configure(options)
    } catch (err) {
      console.error(`[TiptapEditor] Failed to configure ${name}:`, err)
      return undefined
    }
  }
  return extension
}

/**
 * Create Tiptap extensions array (synchronous version).
 * Takes pre-loaded lowlight instance to avoid blocking main thread.
 * Extensions are created fresh for each editor instance to prevent
 * duplicate extension registration issues with React StrictMode,
 * hot reloads, or component remounts.
 *
 * IMPORTANT: All extension configurations are wrapped with safeConfigureExtension()
 * to handle ESM interop issues in Next.js static export where imports might be undefined.
 */
const createEditorExtensionsSync = (lowlight: LowlightType | null) => {
  // Build extensions array with defensive checks for EVERY extension
  // Any extension that fails to load/configure will be filtered out
  const rawExtensions = [
    // Core StarterKit
    safeConfigureExtension('StarterKit', StarterKit, {
      codeBlock: !lowlight, // Use basic codeBlock if lowlight not loaded yet
      link: false, // Added manually with custom HTMLAttributes
      underline: false, // Added manually
      heading: {
        levels: [1, 2, 3, 4],
      },
    }),
    // Code block with syntax highlighting (only if lowlight is ready)
    lowlight ? safeConfigureExtension('CodeBlockLowlight', CodeBlockLowlight, {
      lowlight,
      defaultLanguage: 'typescript',
    }) : null,
    // Placeholder text
    safeConfigureExtension('Placeholder', Placeholder, {
      placeholder: ({ node }: { node: { type: { name: string } } }) => {
        if (node.type.name === 'heading') {
          return 'Heading...'
        }
        return 'Start writing... Use / for commands'
      },
      emptyEditorClass: 'editor-empty',
      emptyNodeClass: 'node-empty',
    }),
    // Images
    safeConfigureExtension('Image', Image, {
      HTMLAttributes: {
        class: 'rounded-lg max-w-full h-auto shadow-lg my-4',
      },
      allowBase64: true,
    }),
    // Links
    safeConfigureExtension('Link', Link, {
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-cyan-500 hover:text-cyan-400 underline decoration-cyan-500/30 hover:decoration-cyan-500/60 transition-colors',
      },
    }),
    // Task lists
    safeConfigureExtension('TaskList', TaskList, {
      HTMLAttributes: {
        class: 'not-prose pl-0 list-none',
      },
    }),
    safeConfigureExtension('TaskItem', TaskItem, {
      nested: true,
      HTMLAttributes: {
        class: 'flex items-start gap-2 my-1',
      },
    }),
    // Typography (no config needed)
    safeConfigureExtension('Typography', Typography),
    // Highlight
    safeConfigureExtension('Highlight', Highlight, {
      multicolor: true,
      HTMLAttributes: {
        class: 'bg-yellow-200 dark:bg-yellow-900/50 px-1 rounded',
      },
    }),
    // Text formatting (no config needed)
    safeConfigureExtension('Underline', Underline),
    safeConfigureExtension('Subscript', Subscript),
    safeConfigureExtension('Superscript', Superscript),
    // Text alignment
    safeConfigureExtension('TextAlign', TextAlign, {
      types: ['heading', 'paragraph'],
    }),
    // Focus line highlighting (iA Writer style)
    safeConfigureExtension('FocusLineExtension', FocusLineExtension, {
      enabled: true,
      mode: 'paragraph',
    }),
    // Tables
    safeConfigureExtension('Table', Table, {
      resizable: true,
      HTMLAttributes: {
        class: 'border-collapse table-auto w-full my-4',
      },
    }),
    safeConfigureExtension('TableRow', TableRow, {
      HTMLAttributes: {
        class: 'border-b border-zinc-200 dark:border-zinc-700',
      },
    }),
    safeConfigureExtension('TableHeader', TableHeader, {
      HTMLAttributes: {
        class: 'border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-left font-semibold text-sm',
      },
    }),
    safeConfigureExtension('TableCell', TableCell, {
      HTMLAttributes: {
        class: 'border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm',
      },
    }),
    // Custom extensions for enhanced content
    safeConfigureExtension('MermaidExtension', MermaidExtension),
    safeConfigureExtension('LatexInlineExtension', LatexInlineExtension),
    safeConfigureExtension('LatexBlockExtension', LatexBlockExtension),
    safeConfigureExtension('CalloutExtension', CalloutExtension),
    safeConfigureExtension('FormulaExtension', FormulaExtension),
    safeConfigureExtension('VideoExtension', VideoExtension),
    safeConfigureExtension('AudioExtension', AudioExtension),
    safeConfigureExtension('EmbedExtension', EmbedExtension),
    // Toggle blocks (collapsible)
    safeConfigureExtension('ToggleExtension', ToggleExtension),
    // Text styling (required for TextColorExtension)
    safeConfigureExtension('TextStyle', TextStyle),
    safeConfigureExtension('TextColorExtension', TextColorExtension),
  ]

  // Filter out any undefined extensions (from failed imports or configuration)
  const extensions = rawExtensions.filter((ext): ext is NonNullable<typeof ext> => ext != null)

  if (extensions.length < rawExtensions.length) {
    console.warn('[TiptapEditor] Some extensions failed to load - editor may have reduced functionality')
  }
  return extensions
}

// DEPRECATED: Use useExtensionsAsync() hook instead
// This is kept for backward compatibility but will block main thread
const getEditorExtensions = () => {
  // If extensions are already cached, return them
  if (cachedExtensions) return cachedExtensions
  // Otherwise create with whatever lowlight state we have (may be null)
  return createEditorExtensionsSync(lowlightInstance)
}

/**
 * Extract frontmatter from markdown content
 * Returns the frontmatter (with delimiters) and the body separately
 */
function parseFrontmatter(content: string): { frontmatter: string; body: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n?/
  const match = content.match(frontmatterRegex)

  if (match) {
    return {
      frontmatter: match[0],
      body: content.slice(match[0].length),
    }
  }

  return { frontmatter: '', body: content }
}

/**
 * Re-combine frontmatter with edited body
 */
function combineFrontmatter(frontmatter: string, body: string): string {
  if (!frontmatter) return body
  // Ensure proper newline after frontmatter
  const normalizedFrontmatter = frontmatter.endsWith('\n') ? frontmatter : frontmatter + '\n'
  return normalizedFrontmatter + body
}

/** Highlight creation data passed from double-click */
export interface HighlightCreationData {
  content: string
  selectionType: 'text' | 'block'
  startOffset?: number
  endOffset?: number
  blockId?: string
}

interface TiptapEditorProps {
  /** Initial content (markdown) */
  content: string
  /** Content change callback */
  onChange: (markdown: string) => void
  /** Current theme */
  theme?: ThemeName
  /** Editor ref for external control */
  editorRef?: React.MutableRefObject<Editor | null>
  /** File path for highlight source attribution */
  filePath?: string
  /** Callback when user wants to create a highlight from selected text */
  onCreateHighlight?: (data: HighlightCreationData & { color: HighlightColor }) => void
  /** Callback when user adds a citation */
  onAddCitation?: (citation: Citation, format: 'inline' | 'card' | 'reference') => void
  /** Editor variant: 'toolbar' shows fixed toolbar, 'minimal' uses floating bubble menu only */
  variant?: 'toolbar' | 'minimal'
}

// Internal props for the core editor component (requires pre-loaded extensions)
interface TiptapEditorCoreProps extends TiptapEditorProps {
  /** Pre-loaded editor extensions (required - must be fully loaded) */
  extensions: ReturnType<typeof createEditorExtensionsSync>
}

interface MenuButtonProps {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  children: React.ReactNode
  title: string
  isDark: boolean
}

// Memoized menu button to prevent unnecessary re-renders during typing
const MenuButton = React.memo(({ onClick, isActive, disabled, children, title, isDark }: MenuButtonProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={title}
    className={`
      p-1.5 rounded-md transition-all duration-150 touch-manipulation
      min-h-[44px] min-w-[44px] flex items-center justify-center
      ${isActive
        ? isDark
          ? 'bg-cyan-600/30 text-cyan-400'
          : 'bg-cyan-100 text-cyan-700'
        : isDark
          ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
          : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
      }
      ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
    `}
  >
    {children}
  </button>
))
MenuButton.displayName = 'MenuButton'

// Memoized divider component
const MenuDivider = React.memo(({ isDark }: { isDark: boolean }) => (
  <div className={`w-px h-4 mx-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
))
MenuDivider.displayName = 'MenuDivider'

/**
 * Keyboard shortcut row component for shortcuts modal
 */
function ShortcutRow({
  label,
  shortcut,
  isDark,
  description
}: {
  label: string
  shortcut: string
  isDark: boolean
  description?: string
}) {
  return (
    <div className={`flex items-center justify-between py-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
      <div>
        <span className="text-sm">{label}</span>
        {description && (
          <span className={`ml-2 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>({description})</span>
        )}
      </div>
      <kbd className={`
        px-2 py-1 rounded text-xs font-mono
        ${isDark ? 'bg-zinc-800 text-zinc-300 border border-zinc-700' : 'bg-zinc-100 text-zinc-600 border border-zinc-200'}
      `}>
        {shortcut}
      </kbd>
    </div>
  )
}

/**
 * Rich text editor powered by Tiptap
 *
 * @remarks
 * - WYSIWYG editing with markdown support
 * - Bubble menu for text formatting
 * - Floating menu for block insertion
 * - Keyboard shortcuts (Cmd+B, Cmd+I, etc.)
 * - Code blocks with syntax highlighting
 * - Task lists, typography, and more
 */
// Highlight color palette
const HIGHLIGHT_COLORS: { color: HighlightColor; bg: string; label: string }[] = [
  { color: 'yellow', bg: 'bg-yellow-400', label: 'Yellow' },
  { color: 'green', bg: 'bg-green-400', label: 'Green' },
  { color: 'blue', bg: 'bg-blue-400', label: 'Blue' },
  { color: 'pink', bg: 'bg-pink-400', label: 'Pink' },
  { color: 'purple', bg: 'bg-purple-400', label: 'Purple' },
  { color: 'orange', bg: 'bg-orange-400', label: 'Orange' },
]

/**
 * Core editor component - requires pre-loaded extensions
 * Use TiptapEditor (the default export) which handles async loading
 */
function TiptapEditorCore({
  content,
  onChange,
  theme = 'light',
  editorRef,
  filePath,
  onCreateHighlight,
  onAddCitation,
  variant = 'toolbar',
  extensions: baseExtensions,
}: TiptapEditorCoreProps) {
  console.log('[TiptapEditor] Component rendering, content length:', content?.length || 0)
  const isDark = theme.includes('dark')
  const [linkUrl, setLinkUrl] = useState('')
  const [showLinkInput, setShowLinkInput] = useState(false)

  // Frontmatter state - store separately from editable content
  const [storedFrontmatter, setStoredFrontmatter] = useState('')
  const initialBodyRef = useRef<string>('')

  // Flag to prevent infinite content sync loop
  // When true, onUpdate will skip calling onChange
  const isSettingContentRef = useRef(false)
  const contentHashRef = useRef<string>('')

  // Refs for stable callbacks (avoid stale closures in useEditor)
  const storedFrontmatterRef = useRef(storedFrontmatter)
  const onChangeRef = useRef(onChange)
  storedFrontmatterRef.current = storedFrontmatter
  onChangeRef.current = onChange

  // Simple hash function for content comparison
  // Optimized for large docs: sample first/last 2000 chars + length
  const hashContent = (content: string): string => {
    const len = content.length
    // For large docs, sample beginning + end + use length as part of hash
    const sample = len > 5000
      ? content.slice(0, 2000) + content.slice(-2000) + len.toString()
      : content
    const normalized = sample.replace(/\s+/g, ' ').trim()
    let hash = 0
    for (let i = 0; i < normalized.length; i++) {
      hash = ((hash << 5) - hash) + normalized.charCodeAt(i)
      hash |= 0 // Convert to 32bit integer
    }
    return hash.toString(36)
  }

  // Debounced markdown converter - prevents UI freezing on large documents
  const markdownConverterRef = useRef<DebouncedMarkdownConverter | null>(null)
  if (!markdownConverterRef.current) {
    markdownConverterRef.current = new DebouncedMarkdownConverter(300)
  }

  // Radial menu state
  const [radialMenuOpen, setRadialMenuOpen] = useState(false)
  const [radialMenuPosition, setRadialMenuPosition] = useState<{ x: number; y: number } | null>(null)

  // Highlight popup state
  const [highlightPopup, setHighlightPopup] = useState<{
    show: boolean
    x: number
    y: number
    text: string
    startOffset: number
    endOffset: number
  } | null>(null)
  const popupTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Inline tag editor state
  const [inlineTagEditor, setInlineTagEditor] = useState<{
    position: { x: number; y: number }
    selectedText: string
    blockId?: string
  } | null>(null)
  const [existingTags, setExistingTags] = useState<string[]>([])

  // Citation popup state
  const [citationPopup, setCitationPopup] = useState<{
    input: string
    position: { x: number; y: number }
  } | null>(null)
  const [showCitationModal, setShowCitationModal] = useState(false)
  const [citationModalInitialValue, setCitationModalInitialValue] = useState('')
  const citationPopupTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Research panel state
  const [showResearchPanel, setShowResearchPanel] = useState(false)
  const [researchQuery, setResearchQuery] = useState('')

  // Keyboard shortcuts modal state
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)

  // Slash command menu state
  const [slashMenuState, setSlashMenuState] = useState<{
    isOpen: boolean
    coords: { x: number; y: number }
    query: string
  }>({ isOpen: false, coords: { x: 0, y: 0 }, query: '' })

  // Command palette state (Cmd+K)
  const [showCommandPalette, setShowCommandPalette] = useState(false)

  // Refs for slash command callbacks (needed for stable extension configuration)
  const slashMenuStateRef = useRef(slashMenuState)
  slashMenuStateRef.current = slashMenuState

  // AI Selection state
  const [aiMenuState, setAiMenuState] = useState<{
    show: boolean
    selectedText: string
    position: { top: number; left: number } | null
  }>({ show: false, selectedText: '', position: null })
  const [aiPreviewState, setAiPreviewState] = useState<{
    show: boolean
    originalText: string
    transformedText: string
    action: SelectionAction
    isLoading: boolean
    error?: string
  }>({ show: false, originalText: '', transformedText: '', action: 'improve', isLoading: false })
  const [activeAIAction, setActiveAIAction] = useState<SelectionAction | null>(null)
  const hasLLMKey = useMemo(() => hasAnyLLMKey(), [])

  // Parse frontmatter synchronously (fast operation)
  const { frontmatter: parsedFrontmatter, body: parsedBody } = useMemo(() => {
    try {
      return parseFrontmatter(content || '')
    } catch (error) {
      console.error('[TiptapEditor] Failed to parse frontmatter:', error)
      return { frontmatter: '', body: content || '' }
    }
  }, [content])

  // Convert markdown to HTML for editor (simple sync approach)
  const htmlBody = useMemo(() => {
    console.log('[TiptapEditor] Starting markdown conversion, length:', parsedBody.length)
    const start = performance.now()
    const result = markdownToHtmlSync(parsedBody)
    console.log('[TiptapEditor] Conversion done in', (performance.now() - start).toFixed(1), 'ms, HTML length:', result.length)
    return result
  }, [parsedBody])
  const isConvertingMarkdown = false

  // Store frontmatter when it changes (but don't re-run on every render)
  useEffect(() => {
    if (parsedFrontmatter !== storedFrontmatter) {
      setStoredFrontmatter(parsedFrontmatter)
      initialBodyRef.current = parsedBody
      // Initialize content hash to prevent false change detection
      contentHashRef.current = hashContent(parsedBody)
    }
  }, [parsedFrontmatter, parsedBody, storedFrontmatter])

  // Stable callback refs for SlashCommandExtension
  const slashCallbacksRef = useRef({
    onActivate: (coords: { x: number; y: number }) => {
      setSlashMenuState({ isOpen: true, coords, query: '' })
    },
    onDeactivate: () => {
      setSlashMenuState(prev => ({ ...prev, isOpen: false, query: '' }))
    },
    onQueryChange: (query: string) => {
      setSlashMenuState(prev => ({ ...prev, query }))
    },
    onSelect: () => {
      // Selection handled by SlashCommandMenu component
    },
  })

  // Build final extensions array with SlashCommandExtension
  // baseExtensions is already loaded (passed as prop from wrapper)
  const extensions = useMemo(() => {
    // Add SlashCommandExtension with callbacks
    const slashExt = SlashCommandExtension.configure({
      onActivate: (coords) => slashCallbacksRef.current.onActivate(coords),
      onDeactivate: () => slashCallbacksRef.current.onDeactivate(),
      onQueryChange: (query) => slashCallbacksRef.current.onQueryChange(query),
      onSelect: () => slashCallbacksRef.current.onSelect(),
    })

    return [...baseExtensions, slashExt]
  }, [baseExtensions])
  // Track which editor instance had initial content set
  // This handles React StrictMode which creates new editor instances on remount
  const initialContentEditorRef = useRef<Editor | null>(null)

  const editor = useEditor({
    extensions, // Extensions are always valid (never null/empty)
    content: htmlBody, // Set content directly - no useEffect needed
    immediatelyRender: false, // Defer rendering to prevent main thread blocking
    editorProps: {
      attributes: {
        class: [
          'prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none',
          'focus:outline-none p-6 sm:p-8 lg:p-10 min-h-[400px] h-full',
          // Custom prose styles - proper spacing and line height
          'prose-headings:font-display prose-headings:font-bold prose-headings:mt-8 prose-headings:mb-4',
          'prose-h1:text-2xl sm:prose-h1:text-3xl prose-h2:text-xl sm:prose-h2:text-2xl prose-h3:text-lg sm:prose-h3:text-xl',
          'prose-p:leading-relaxed prose-p:mb-4 prose-p:mt-0',
          'prose-a:text-cyan-500 prose-a:no-underline hover:prose-a:underline',
          'prose-code:text-sm prose-code:bg-zinc-100 dark:prose-code:bg-zinc-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded',
          'prose-pre:bg-zinc-900 prose-pre:text-zinc-100 prose-pre:rounded-xl prose-pre:shadow-lg',
          'prose-blockquote:border-l-cyan-500 prose-blockquote:bg-cyan-50/50 dark:prose-blockquote:bg-cyan-950/20 prose-blockquote:rounded-r-lg prose-blockquote:py-1',
          'prose-img:rounded-xl prose-img:shadow-lg',
          'prose-hr:border-zinc-300 dark:prose-hr:border-zinc-700',
          // Theme variants
          theme === 'sepia-light' ? 'bg-[#FCF9F2] text-[#2C1A0C] prose-sepia' : '',
          theme === 'sepia-dark' ? 'bg-[#0E0704] text-[#EDE2D2]' : '',
          theme === 'terminal-light' ? 'bg-[#E8F5E9] text-[#1B5E20] font-mono' : '',
          theme === 'terminal-dark' ? 'bg-[#0D1F0D] text-[#4CAF50] font-mono' : '',
          theme === 'dark' ? 'bg-zinc-900 text-zinc-100' : '',
          theme === 'light' ? 'bg-white text-zinc-900' : '',
        ].filter(Boolean).join(' '),
      },
      handleDrop: (view, event, slice, moved) => {
        // Handle image drops
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0]
          if (file.type.startsWith('image/')) {
            const reader = new FileReader()
            reader.onload = (e) => {
              const result = e.target?.result
              if (typeof result === 'string') {
                editor?.chain().focus().setImage({ src: result }).run()
              }
            }
            reader.readAsDataURL(file)
            return true
          }
        }
        return false
      },
      handlePaste: (view, event, slice) => {
        // Handle image paste
        const items = event.clipboardData?.items
        if (items) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i]
            if (item.type.startsWith('image/')) {
              const file = item.getAsFile()
              if (file) {
                const reader = new FileReader()
                reader.onload = (e) => {
                  const result = e.target?.result
                  if (typeof result === 'string') {
                    editor?.chain().focus().setImage({ src: result }).run()
                  }
                }
                reader.readAsDataURL(file)
                return true
              }
            }
          }
        }

        // Handle citation paste (DOI, arXiv, etc.)
        const text = event.clipboardData?.getData('text/plain')?.trim()
        if (text) {
          const citationType = detectCitationType(text)
          // Show citation popup for identifiable citation types
          if (citationType !== 'text') {
            // Clear any existing timeout
            if (citationPopupTimeoutRef.current) {
              clearTimeout(citationPopupTimeoutRef.current)
            }
            // Get cursor position for popup
            const coords = view.coordsAtPos(view.state.selection.from)
            setCitationPopup({
              input: text,
              position: { x: coords.left, y: coords.bottom },
            })
            // Auto-dismiss popup after 5 seconds
            citationPopupTimeoutRef.current = setTimeout(() => {
              setCitationPopup(null)
            }, 5000)
            // Don't prevent default - let the text be pasted
          }
        }

        return false
      },
    },
    onUpdate: ({ editor }) => {
      // Skip if we're programmatically setting content (prevents infinite loop)
      if (isSettingContentRef.current) {
        return
      }

      // Convert HTML to Markdown using debounced converter
      // This prevents UI freezing on large documents
      const html = editor.getHTML()

      markdownConverterRef.current?.convert(html, (result) => {
        // Check if content actually changed (using hash to handle whitespace normalization)
        const newHash = hashContent(result.markdown)
        if (newHash === contentHashRef.current) {
          return // Content hasn't meaningfully changed
        }
        contentHashRef.current = newHash

        // Re-combine with stored frontmatter before saving (use refs for latest values)
        const fullMarkdown = combineFrontmatter(storedFrontmatterRef.current, result.markdown)
        onChangeRef.current(fullMarkdown)
      })
    },
  }, []) // Empty deps - editor initializes once, refs provide latest values

  console.log('[TiptapEditor] useEditor returned, editor exists:', !!editor)

  // Set initial content once when editor is ready
  // useEditor's content prop doesn't reliably update, so we set it manually
  // Track by editor instance to handle React StrictMode remounts
  useEffect(() => {
    if (!editor || !htmlBody) return
    // Skip if we already set content on THIS editor instance
    if (initialContentEditorRef.current === editor) return

    console.log('[TiptapEditor] Setting initial content, length:', htmlBody.length)
    isSettingContentRef.current = true
    editor.commands.setContent(htmlBody)
    initialContentEditorRef.current = editor
    initialBodyRef.current = parsedBody
    contentHashRef.current = hashContent(parsedBody)
    isSettingContentRef.current = false
  }, [editor, htmlBody, parsedBody])

  // Update editor ref
  useEffect(() => {
    if (editorRef) {
      editorRef.current = editor
    }
  }, [editor, editorRef])

  // Update content when prop changes (but don't create infinite loop)
  useEffect(() => {
    // Skip if initial content hasn't been set yet (handled by separate effect)
    if (!editor || htmlBody === null || initialContentEditorRef.current !== editor) return

    // Compare using hash to avoid false positives from whitespace differences
    const incomingHash = hashContent(parsedBody)
    const currentHash = hashContent(initialBodyRef.current)

    if (incomingHash !== currentHash) {
      console.log('[TiptapEditor] Content changed, updating editor (' + parsedBody.length + ' chars)')
      // Set flag to prevent onUpdate from triggering onChange
      isSettingContentRef.current = true
      const startTime = performance.now()
      editor.commands.setContent(htmlBody)
      console.log('[TiptapEditor] setContent done in ' + (performance.now() - startTime).toFixed(1) + 'ms')
      initialBodyRef.current = parsedBody
      contentHashRef.current = incomingHash

      // Clear flag after a short delay to allow editor to settle
      requestAnimationFrame(() => {
        isSettingContentRef.current = false
      })
    }
  }, [parsedBody, htmlBody, editor])

  // Cleanup markdown converter on unmount
  useEffect(() => {
    return () => {
      markdownConverterRef.current?.cancel()
    }
  }, [])

  const setLink = useCallback(() => {
    if (!editor) return

    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run()
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    }
    setShowLinkInput(false)
    setLinkUrl('')
  }, [editor, linkUrl])

  const addImage = useCallback(() => {
    const url = window.prompt('Enter image URL:')
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  // Open citation modal (keyboard shortcut: Cmd/Ctrl+Shift+C)
  const openCitationModal = useCallback(() => {
    setShowCitationModal(true)
  }, [])

  // Open research panel (keyboard shortcut: Cmd/Ctrl+Shift+R)
  const openResearchPanel = useCallback(() => {
    // Get selected text as research query
    const selectedText = editor?.state.selection
      ? editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
        ' '
      )
      : ''
    setResearchQuery(selectedText)
    setShowResearchPanel(true)
  }, [editor])

  // Open AI menu for selected text
  const openAIMenu = useCallback((text: string) => {
    if (!editor) return
    const view = editor.view
    const { from, to } = editor.state.selection
    const start = view.coordsAtPos(from)
    const end = view.coordsAtPos(to)
    const left = (start.left + end.left) / 2
    const top = end.bottom + 10

    setAiMenuState({
      show: true,
      selectedText: text,
      position: { top, left },
    })
  }, [editor])

  // Handle AI action on selected text
  const handleAIAction = useCallback(async (action: SelectionAction, options?: { language?: string }) => {
    if (!editor || !aiMenuState.selectedText) return

    const { from, to } = editor.state.selection
    const textBefore = editor.state.doc.textBetween(Math.max(0, from - 200), from, ' ')
    const textAfter = editor.state.doc.textBetween(to, Math.min(editor.state.doc.content.size, to + 200), ' ')

    // Close menu and show preview in loading state
    setAiMenuState({ show: false, selectedText: '', position: null })
    setActiveAIAction(action)
    setAiPreviewState({
      show: true,
      originalText: aiMenuState.selectedText,
      transformedText: '',
      action,
      isLoading: true,
    })

    try {
      const result = await performSelectionAction({
        selectedText: aiMenuState.selectedText,
        action,
        context: { textBefore, textAfter },
        language: options?.language,
      })

      if (result.success && result.transformed) {
        setAiPreviewState(prev => ({
          ...prev,
          transformedText: result.transformed,
          isLoading: false,
        }))
      } else {
        setAiPreviewState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Transformation failed',
        }))
      }
    } catch (err) {
      setAiPreviewState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to transform text',
      }))
    }
    setActiveAIAction(null)
  }, [editor, aiMenuState.selectedText])

  // Accept AI transformation
  const handleAcceptTransform = useCallback((text: string) => {
    if (!editor) return

    // Replace selected text with transformed text
    editor.chain().focus().deleteSelection().insertContent(text).run()

    // Clear preview state
    setAiPreviewState({
      show: false,
      originalText: '',
      transformedText: '',
      action: 'improve',
      isLoading: false,
    })
  }, [editor])

  // Reject AI transformation
  const handleRejectTransform = useCallback(() => {
    setAiPreviewState({
      show: false,
      originalText: '',
      transformedText: '',
      action: 'improve',
      isLoading: false,
    })
  }, [])

  // Retry AI transformation
  const handleRetryTransform = useCallback((action?: SelectionAction) => {
    if (!aiPreviewState.originalText) return

    // Re-select the original text in editor if possible
    // Then trigger new action
    const actionToUse = action || aiPreviewState.action
    setAiMenuState({
      show: false,
      selectedText: aiPreviewState.originalText,
      position: null,
    })

    // Small delay to let state settle
    setTimeout(() => {
      handleAIAction(actionToUse)
    }, 50)
  }, [aiPreviewState.originalText, aiPreviewState.action, handleAIAction])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+Shift+C to open citation modal
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'c') {
        e.preventDefault()
        openCitationModal()
      }
      // Cmd/Ctrl+Shift+R to open research panel
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'r') {
        e.preventDefault()
        openResearchPanel()
      }
      // Cmd/Ctrl+Shift+A to open AI menu
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'a') {
        e.preventDefault()
        if (editor && hasLLMKey) {
          const { from, to } = editor.state.selection
          if (from !== to) {
            const selectedText = editor.state.doc.textBetween(from, to, ' ')
            if (selectedText) openAIMenu(selectedText)
          }
        }
      }
      // Cmd/Ctrl+K to open command palette (override default link behavior when no selection)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && !e.shiftKey) {
        // Only open command palette if no text is selected (otherwise let link input work)
        if (editor) {
          const { from, to } = editor.state.selection
          if (from === to) {
            e.preventDefault()
            setShowCommandPalette(true)
          }
        }
      }
      // Cmd/Ctrl+/ or Cmd/Ctrl+? to show keyboard shortcuts
      if ((e.metaKey || e.ctrlKey) && (e.key === '/' || e.key === '?')) {
        e.preventDefault()
        setShowKeyboardShortcuts(prev => !prev)
      }
      // Escape to close keyboard shortcuts modal
      if (e.key === 'Escape' && showKeyboardShortcuts) {
        e.preventDefault()
        setShowKeyboardShortcuts(false)
        requestAnimationFrame(() => editor?.commands.focus())
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openCitationModal, openResearchPanel, editor, hasLLMKey, openAIMenu, showKeyboardShortcuts])

  // Open radial menu at a specific position
  const openRadialMenu = useCallback((x: number, y: number) => {
    setRadialMenuPosition({ x, y })
    setRadialMenuOpen(true)
  }, [])

  // Insert markdown content at cursor
  const handleInsertAtCursor = useCallback((markdown: string) => {
    if (!editor) return

    // For images, use setImage command
    const imageMatch = markdown.match(/!\[([^\]]*)\]\(([^)]+)\)/)
    if (imageMatch) {
      editor.chain().focus().setImage({ src: imageMatch[2], alt: imageMatch[1] }).run()
      return
    }

    // For audio/other HTML, insert as raw HTML
    if (markdown.includes('<audio') || markdown.includes('<video')) {
      editor.chain().focus().insertContent(markdown).run()
      return
    }

    // For general markdown, insert as text (Tiptap will handle basic markdown)
    editor.chain().focus().insertContent(markdown).run()
  }, [editor])

  // Handle double-click to show highlight popup
  const handleEditorDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!editor || !onCreateHighlight) return

    // Clear any pending timeout
    if (popupTimeoutRef.current) {
      clearTimeout(popupTimeoutRef.current)
    }

    // Small delay to allow selection to be captured
    popupTimeoutRef.current = setTimeout(() => {
      const selection = window.getSelection()
      const selectedText = selection?.toString().trim()

      if (selectedText && selectedText.length > 0) {
        // Get position for popup - use the mouse position
        const x = e.clientX
        const y = e.clientY - 50 // Position above the click

        // Get selection offsets from the Tiptap selection
        const { from, to } = editor.state.selection

        setHighlightPopup({
          show: true,
          x,
          y,
          text: selectedText,
          startOffset: from,
          endOffset: to,
        })
      }
    }, 50)
  }, [editor, onCreateHighlight])

  // Create highlight with selected color
  const handleSelectHighlightColor = useCallback((color: HighlightColor) => {
    if (!highlightPopup || !onCreateHighlight) return

    onCreateHighlight({
      content: highlightPopup.text,
      selectionType: 'text',
      startOffset: highlightPopup.startOffset,
      endOffset: highlightPopup.endOffset,
      color,
    })

    // Also apply visual highlight in the editor
    if (editor) {
      editor.chain().focus().toggleHighlight().run()
    }

    setHighlightPopup(null)
  }, [highlightPopup, onCreateHighlight, editor])

  // Close highlight popup
  const closeHighlightPopup = useCallback(() => {
    setHighlightPopup(null)
  }, [])

  // Handle citation resolve from popup
  const handleCitationResolve = useCallback(() => {
    if (citationPopup) {
      setCitationModalInitialValue(citationPopup.input)
      setShowCitationModal(true)
      setCitationPopup(null)
    }
  }, [citationPopup])

  // Handle citation insert
  const handleCitationInsert = useCallback((citation: Citation, format: 'inline' | 'card' | 'reference') => {
    if (!editor) return

    if (format === 'inline') {
      // Insert inline citation syntax
      const inlineCite = citation.doi
        ? `[@doi:${citation.doi}]`
        : citation.arxivId
          ? `[@arxiv:${citation.arxivId}]`
          : `[@${citation.authors[0]?.family?.toLowerCase() || 'ref'}${citation.year}]`
      editor.chain().focus().insertContent(inlineCite).run()
    } else if (format === 'card') {
      // Insert a citation block (as a paragraph for now)
      const citationText = `**${citation.title}** - ${citation.authors.map(a => a.family).join(', ')} (${citation.year})`
      editor.chain().focus().insertContent(`\n\n${citationText}\n\n`).run()
    }

    // Call parent callback if provided
    onAddCitation?.(citation, format)
  }, [editor, onAddCitation])

  // Handle slash command selection
  const handleSlashCommand = useCallback((command: { action: (editor: Editor) => void }) => {
    if (!editor) return

    // Delete the "/" and any query text
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storage = (editor.storage as any).slashCommand as { isActive: boolean; query: string; startPos: number } | undefined
    if (storage?.isActive) {
      deleteSlashQuery(
        editor as Parameters<typeof deleteSlashQuery>[0],
        storage,
        '/',
        () => setSlashMenuState(prev => ({ ...prev, isOpen: false, query: '' }))
      )
    }

    // Execute the command
    command.action(editor)
  }, [editor])

  // Fetch existing block tags for inline tag editor
  useEffect(() => {
    getAllBlockTags().then(tags => {
      setExistingTags(tags)
    }).catch(err => {
      console.warn('[TiptapEditor] Failed to load block tags:', err)
    })
  }, [])

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (popupTimeoutRef.current) {
        clearTimeout(popupTimeoutRef.current)
      }
      if (citationPopupTimeoutRef.current) {
        clearTimeout(citationPopupTimeoutRef.current)
      }
    }
  }, [])

  // Show loading state while:
  // 1. Converting markdown (async operation)
  // 2. Editor is still initializing
  // IMPORTANT: Always render something to keep UI interactive (never return null)
  if (isConvertingMarkdown || !editor) {
    return (
      <div className={`flex-1 min-h-0 flex flex-col ${isDark ? 'bg-zinc-900' : 'bg-white'}`}>
        {/* Skeleton toolbar */}
        <div className={`flex items-center gap-1 px-3 py-2 border-b ${isDark ? 'bg-zinc-800/80 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
          <div className={`h-7 w-32 rounded animate-pulse ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
          <div className={`h-7 w-24 rounded animate-pulse ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
          <div className={`h-7 w-20 rounded animate-pulse ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
        </div>
        {/* Skeleton content area with message for large docs */}
        <div className="flex-1 p-6 sm:p-8 lg:p-10">
          {isConvertingMarkdown && (
            <div className={`text-center py-8 mb-6 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              <div className="inline-block animate-spin w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-3" />
              <p className="text-sm">Converting large document...</p>
            </div>
          )}
          <div className={`h-8 w-3/4 rounded mb-4 animate-pulse ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`} />
          <div className={`h-4 w-full rounded mb-2 animate-pulse ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`} />
          <div className={`h-4 w-5/6 rounded mb-2 animate-pulse ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`} />
          <div className={`h-4 w-4/5 rounded mb-6 animate-pulse ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`} />
          <div className={`h-4 w-full rounded mb-2 animate-pulse ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`} />
          <div className={`h-4 w-2/3 rounded animate-pulse ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`} />
        </div>
      </div>
    )
  }

  return (
    <div className={`flex-1 min-h-0 flex flex-col overflow-hidden relative ${isDark ? 'bg-zinc-900' : 'bg-white'}`}>
      {/* Fixed Formatting Toolbar - only for toolbar variant */}
      {variant === 'toolbar' && (
        <>
          <div className={`
        flex items-center gap-0.5 px-3 py-2 border-b flex-wrap select-none
        ${isDark ? 'bg-zinc-800/80 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}
      `}>
            {/* Undo/Redo */}
            <MenuButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo (Cmd+Z)"
              isDark={isDark}
            >
              <Undo className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo (Cmd+Shift+Z)"
              isDark={isDark}
            >
              <Redo className="w-4 h-4" />
            </MenuButton>

            <MenuDivider isDark={isDark} />

            {/* Headings */}
            <MenuButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive('heading', { level: 1 })}
              title="Heading 1 (Cmd+Alt+1)"
              isDark={isDark}
            >
              <Heading1 className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
              title="Heading 2 (Cmd+Alt+2)"
              isDark={isDark}
            >
              <Heading2 className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor.isActive('heading', { level: 3 })}
              title="Heading 3 (Cmd+Alt+3)"
              isDark={isDark}
            >
              <Heading3 className="w-4 h-4" />
            </MenuButton>

            <MenuDivider isDark={isDark} />

            {/* Text Formatting */}
            <MenuButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Bold (Cmd+B)"
              isDark={isDark}
            >
              <Bold className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italic (Cmd+I)"
              isDark={isDark}
            >
              <Italic className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive('underline')}
              title="Underline (Cmd+U)"
              isDark={isDark}
            >
              <UnderlineIcon className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
              title="Strikethrough"
              isDark={isDark}
            >
              <Strikethrough className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive('code')}
              title="Inline Code (Cmd+E)"
              isDark={isDark}
            >
              <Code className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              isActive={editor.isActive('highlight')}
              title="Highlight"
              isDark={isDark}
            >
              <Highlighter className="w-4 h-4" />
            </MenuButton>

            <MenuDivider isDark={isDark} />

            {/* Sub/Superscript */}
            <MenuButton
              onClick={() => editor.chain().focus().toggleSubscript().run()}
              isActive={editor.isActive('subscript')}
              title="Subscript"
              isDark={isDark}
            >
              <SubscriptIcon className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
              isActive={editor.isActive('superscript')}
              title="Superscript"
              isDark={isDark}
            >
              <SuperscriptIcon className="w-4 h-4" />
            </MenuButton>

            <MenuDivider isDark={isDark} />

            {/* Lists */}
            <MenuButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              title="Bullet List"
              isDark={isDark}
            >
              <List className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              title="Numbered List"
              isDark={isDark}
            >
              <ListOrdered className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              isActive={editor.isActive('taskList')}
              title="Task List"
              isDark={isDark}
            >
              <CheckSquare className="w-4 h-4" />
            </MenuButton>

            <MenuDivider isDark={isDark} />

            {/* Blocks */}
            <MenuButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              title="Blockquote"
              isDark={isDark}
            >
              <Quote className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              isActive={editor.isActive('codeBlock')}
              title="Code Block"
              isDark={isDark}
            >
              <Code2 className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Horizontal Rule"
              isDark={isDark}
            >
              <Minus className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              title="Insert Table (3x3)"
              isDark={isDark}
            >
              <Table2 className="w-4 h-4" />
            </MenuButton>

            <MenuDivider isDark={isDark} />

            {/* Alignment */}
            <MenuButton
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              isActive={editor.isActive({ textAlign: 'left' })}
              title="Align Left"
              isDark={isDark}
            >
              <AlignLeft className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              isActive={editor.isActive({ textAlign: 'center' })}
              title="Align Center"
              isDark={isDark}
            >
              <AlignCenter className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              isActive={editor.isActive({ textAlign: 'right' })}
              title="Align Right"
              isDark={isDark}
            >
              <AlignRight className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              isActive={editor.isActive({ textAlign: 'justify' })}
              title="Justify"
              isDark={isDark}
            >
              <AlignJustify className="w-4 h-4" />
            </MenuButton>

            <MenuDivider isDark={isDark} />

            {/* Insert */}
            <MenuButton
              onClick={() => setShowLinkInput(!showLinkInput)}
              isActive={editor.isActive('link')}
              title="Insert Link (Cmd+K)"
              isDark={isDark}
            >
              <Link2 className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={addImage}
              title="Insert Image"
              isDark={isDark}
            >
              <ImageIcon className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={openCitationModal}
              title="Add Citation (Cmd+Shift+C)"
              isDark={isDark}
            >
              <BookOpen className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              onClick={() => {
                // Get selected text as research query
                const selectedText = editor?.state.selection
                  ? editor.state.doc.textBetween(
                    editor.state.selection.from,
                    editor.state.selection.to,
                    ' '
                  )
                  : ''
                setResearchQuery(selectedText)
                setShowResearchPanel(true)
              }}
              title="Web Research (Cmd+Shift+R)"
              isDark={isDark}
            >
              <Globe className="w-4 h-4" />
            </MenuButton>
          </div>

          {/* Link Input */}
          {showLinkInput && (
            <div className={`
          flex items-center gap-2 px-3 py-2 border-b
          ${isDark ? 'bg-zinc-800/60 border-zinc-700' : 'bg-zinc-100 border-zinc-200'}
        `}>
              <Link2 className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setLink()}
                placeholder="Enter URL..."
                className={`
              flex-1 px-2 py-1 text-sm rounded border bg-transparent
              ${isDark
                    ? 'border-zinc-600 text-zinc-200 placeholder-zinc-500 focus:border-cyan-500'
                    : 'border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-cyan-500'}
              focus:outline-none focus:ring-1 focus:ring-cyan-500/30
            `}
                autoFocus
              />
              <button
                onClick={setLink}
                className={`
              px-3 py-1 text-xs font-medium rounded
              ${isDark
                    ? 'bg-cyan-600 text-white hover:bg-cyan-500'
                    : 'bg-cyan-500 text-white hover:bg-cyan-600'}
            `}
              >
                Apply
              </button>
              <button
                onClick={() => { setShowLinkInput(false); setLinkUrl('') }}
                className={`
              px-2 py-1 text-xs font-medium rounded
              ${isDark
                    ? 'text-zinc-400 hover:text-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-700'}
            `}
              >
                Cancel
              </button>
            </div>
          )}
          {/* End toolbar variant conditional */}
        </>
      )}

      {/* Editor Content */}
      <div
        className="flex-1 min-h-0 overflow-y-auto relative group/editor"
        onDoubleClick={handleEditorDoubleClick}
      >
        <EditorContent editor={editor} className="min-h-full h-auto [&>.ProseMirror]:min-h-full [&>.ProseMirror]:h-auto [&>.ProseMirror]:outline-none" />

        {/* Floating Bubble Menu (for minimal variant) */}
        {variant === 'minimal' && (
          <FloatingBubbleMenu
            editor={editor}
            theme={theme}
            enableAI={hasLLMKey}
            onAIAction={handleAIAction}
            onTagAction={(selectedText, position) => {
              setInlineTagEditor({ selectedText, position })
            }}
          />
        )}

        {/* Table Menu (shows when cursor is in a table) */}
        {editor.isActive('table') && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
            <TableMenu editor={editor} isDark={isDark} />
          </div>
        )}

        {/* Text Context Menu (double-click popup) */}
        <AnimatePresence>
          {highlightPopup?.show && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ duration: 0.15 }}
              className={`
                fixed z-50 flex flex-col gap-2 p-2.5 rounded-xl shadow-xl border
                ${isDark
                  ? 'bg-zinc-800 border-zinc-700'
                  : 'bg-white border-zinc-200'
                }
              `}
              style={{
                left: Math.max(10, Math.min(highlightPopup.x - 100, window.innerWidth - 220)),
                top: Math.max(10, highlightPopup.y),
              }}
            >
              {/* Quick Actions Row */}
              <div className="flex items-center gap-1">
                {/* AI Actions */}
                {hasLLMKey && (
                  <button
                    onClick={() => {
                      openAIMenu(highlightPopup.text)
                      closeHighlightPopup()
                    }}
                    className={`
                      flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                      transition-colors
                      ${isDark
                        ? 'bg-gradient-to-r from-cyan-900/60 to-violet-900/60 text-cyan-300 hover:from-cyan-900/80 hover:to-violet-900/80'
                        : 'bg-gradient-to-r from-cyan-50 to-violet-50 text-cyan-700 hover:from-cyan-100 hover:to-violet-100'
                      }
                    `}
                    title="AI Actions (Cmd+Shift+A)"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    AI
                  </button>
                )}

                {/* Research */}
                <button
                  onClick={() => {
                    setResearchQuery(highlightPopup.text)
                    setShowResearchPanel(true)
                    closeHighlightPopup()
                  }}
                  className={`
                    flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                    transition-colors
                    ${isDark
                      ? 'bg-cyan-900/40 text-cyan-300 hover:bg-cyan-900/60'
                      : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
                    }
                  `}
                  title="Research this text"
                >
                  <Search className="w-3.5 h-3.5" />
                  Research
                </button>

                {/* Define */}
                <button
                  onClick={() => {
                    setResearchQuery(`define: ${highlightPopup.text}`)
                    setShowResearchPanel(true)
                    closeHighlightPopup()
                  }}
                  className={`
                    flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                    transition-colors
                    ${isDark
                      ? 'bg-violet-900/40 text-violet-300 hover:bg-violet-900/60'
                      : 'bg-violet-50 text-violet-700 hover:bg-violet-100'
                    }
                  `}
                  title="Look up definition"
                >
                  <BookMarked className="w-3.5 h-3.5" />
                  Define
                </button>

                {/* Thesaurus */}
                <button
                  onClick={() => {
                    setResearchQuery(`synonyms for: ${highlightPopup.text}`)
                    setShowResearchPanel(true)
                    closeHighlightPopup()
                  }}
                  className={`
                    flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                    transition-colors
                    ${isDark
                      ? 'bg-emerald-900/40 text-emerald-300 hover:bg-emerald-900/60'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }
                  `}
                  title="Find synonyms"
                >
                  <Languages className="w-3.5 h-3.5" />
                  Thesaurus
                </button>

                {/* Tag */}
                <button
                  onClick={() => {
                    setInlineTagEditor({
                      selectedText: highlightPopup.text,
                      position: { x: highlightPopup.x, y: highlightPopup.y },
                    })
                    closeHighlightPopup()
                  }}
                  className={`
                    flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                    transition-colors
                    ${isDark
                      ? 'bg-cyan-900/40 text-cyan-300 hover:bg-cyan-900/60'
                      : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
                    }
                  `}
                  title="Add block tag"
                >
                  <Hash className="w-3.5 h-3.5" />
                  Tag
                </button>

                {/* Close button */}
                <button
                  onClick={closeHighlightPopup}
                  className={`
                    p-1.5 rounded-lg transition-colors ml-auto
                    ${isDark
                      ? 'hover:bg-zinc-700 text-zinc-400'
                      : 'hover:bg-zinc-100 text-zinc-500'
                    }
                  `}
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Highlight Colors Row */}
              {onCreateHighlight && (
                <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-200 dark:border-zinc-700">
                  <Bookmark className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                  <span className={`text-[10px] font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Highlight:
                  </span>
                  {HIGHLIGHT_COLORS.map(({ color, bg, label }) => (
                    <button
                      key={color}
                      onClick={() => handleSelectHighlightColor(color)}
                      className={`
                        w-5 h-5 rounded-full ${bg}
                        hover:scale-110 hover:ring-2 hover:ring-offset-1
                        ${isDark ? 'hover:ring-offset-zinc-800' : 'hover:ring-offset-white'}
                        hover:ring-${color}-500
                        transition-transform
                      `}
                      title={label}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Medium-style floating Add Button - always visible in corner */}
        <button
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            openRadialMenu(rect.left + rect.width / 2, rect.top - 10)
          }}
          className={`
            fixed bottom-24 right-8 z-20
            w-12 h-12 rounded-full
            flex items-center justify-center
            transition-all duration-200
            shadow-lg hover:shadow-xl hover:scale-110 active:scale-95
            ${isDark
              ? 'bg-gradient-to-br from-cyan-600 to-emerald-600 text-white hover:from-cyan-500 hover:to-emerald-500'
              : 'bg-gradient-to-br from-cyan-500 to-emerald-500 text-white hover:from-cyan-600 hover:to-emerald-600'
            }
          `}
          title="Add media block (Image, Voice, Camera, Canvas)"
        >
          <Plus className="w-6 h-6" />
        </button>

      </div>

      {/* Radial Media Menu */}
      <RadialMediaMenu
        isOpen={radialMenuOpen}
        onClose={() => setRadialMenuOpen(false)}
        anchorPosition={radialMenuPosition}
        anchorMode="cursor"
        onInsertAtCursor={handleInsertAtCursor}
        theme={theme}
      />

      {/* Citation Paste Popup */}
      <AnimatePresence>
        {citationPopup && (
          <CitationPastePopup
            input={citationPopup.input}
            position={citationPopup.position}
            onResolve={handleCitationResolve}
            onDismiss={() => setCitationPopup(null)}
            theme={theme}
          />
        )}
      </AnimatePresence>

      {/* Citation Input Modal */}
      <CitationInput
        isOpen={showCitationModal}
        onClose={() => {
          setShowCitationModal(false)
          setCitationModalInitialValue('')
          // Restore focus to editor after modal closes
          requestAnimationFrame(() => editor?.commands.focus())
        }}
        onInsert={handleCitationInsert}
        theme={theme}
        initialValue={citationModalInitialValue}
      />

      {/* Research Panel */}
      <ResearchPanel
        isOpen={showResearchPanel}
        onClose={() => {
          setShowResearchPanel(false)
          setResearchQuery('')
          // Restore focus to editor after panel closes
          requestAnimationFrame(() => editor?.commands.focus())
        }}
        theme={theme}
        defaultQuery={researchQuery}
        onInsertResult={(result, format) => {
          if (!editor) return
          if (format === 'link') {
            editor.chain().focus().setLink({ href: result.url }).insertContent(result.title).run()
          } else if (format === 'markdown') {
            const md = `\n\n**[${result.title}](${result.url})**\n${result.snippet}\n\n`
            editor.chain().focus().insertContent(md).run()
          }
        }}
        onAddCitation={handleCitationInsert}
      />

      {/* AI Selection Menu */}
      <AnimatePresence>
        {aiMenuState.show && aiMenuState.position && (
          <AISelectionMenu
            selectedText={aiMenuState.selectedText}
            onAction={handleAIAction}
            onClose={() => setAiMenuState({ show: false, selectedText: '', position: null })}
            isDark={isDark}
            isLoading={activeAIAction !== null}
            activeAction={activeAIAction}
            position={aiMenuState.position}
          />
        )}
      </AnimatePresence>

      {/* AI Selection Preview */}
      <AnimatePresence>
        {aiPreviewState.show && (
          <AISelectionPreview
            originalText={aiPreviewState.originalText}
            transformedText={aiPreviewState.transformedText}
            action={aiPreviewState.action}
            isLoading={aiPreviewState.isLoading}
            onAccept={handleAcceptTransform}
            onReject={handleRejectTransform}
            onRetry={handleRetryTransform}
            isDark={isDark}
            error={aiPreviewState.error}
          />
        )}
      </AnimatePresence>

      {/* Slash Command Menu */}
      <SlashCommandMenu
        editor={editor}
        isOpen={slashMenuState.isOpen}
        coords={slashMenuState.coords}
        query={slashMenuState.query}
        onClose={() => setSlashMenuState(prev => ({ ...prev, isOpen: false }))}
        onSelect={handleSlashCommand}
        isDark={isDark}
      />

      {/* Inline Tag Editor */}
      {inlineTagEditor && (
        <InlineTagEditor
          position={inlineTagEditor.position}
          selectedText={inlineTagEditor.selectedText}
          onAddTag={async (tag, selectedText) => {
            console.log('[TiptapEditor] Adding block tag:', tag, 'to text:', selectedText)

            // Add tag to existingTags if it's new
            if (!existingTags.includes(tag)) {
              setExistingTags(prev => [...prev, tag].sort())
            }

            // Note: Full block tagging requires knowing the blockId from parsed markdown
            // For now, we log and close. Block database integration for specific blocks
            // would need markdown block parsing to identify which block contains this text

            setInlineTagEditor(null)
          }}
          onClose={() => setInlineTagEditor(null)}
          existingTags={existingTags}
          theme={theme}
        />
      )}

      {/* Command Palette (Cmd+K) */}
      <CommandPalette
        editor={editor}
        isOpen={showCommandPalette}
        onClose={() => {
          setShowCommandPalette(false)
          requestAnimationFrame(() => editor?.commands.focus())
        }}
        isDark={isDark}
      />

      {/* Keyboard Shortcuts Modal */}
      <AnimatePresence>
        {showKeyboardShortcuts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50"
            onClick={() => {
              setShowKeyboardShortcuts(false)
              requestAnimationFrame(() => editor?.commands.focus())
            }}
          >
            <div className={`absolute inset-0 ${isDark ? 'bg-black/60' : 'bg-black/40'}`} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className={`
                relative w-full max-w-lg mx-4 rounded-xl shadow-2xl overflow-hidden
                ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'}
              `}
            >
              {/* Header */}
              <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <div className="flex items-center gap-2">
                  <Keyboard className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                  <h3 className={`font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Keyboard Shortcuts</h3>
                </div>
                <button
                  onClick={() => {
                    setShowKeyboardShortcuts(false)
                    requestAnimationFrame(() => editor?.commands.focus())
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Shortcuts List */}
              <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-4">
                  {/* Text Formatting */}
                  <div>
                    <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      Text Formatting
                    </h4>
                    <div className="space-y-1.5">
                      <ShortcutRow label="Bold" shortcut="⌘B" isDark={isDark} />
                      <ShortcutRow label="Italic" shortcut="⌘I" isDark={isDark} />
                      <ShortcutRow label="Underline" shortcut="⌘U" isDark={isDark} />
                      <ShortcutRow label="Strikethrough" shortcut="⌘⇧X" isDark={isDark} />
                      <ShortcutRow label="Inline Code" shortcut="⌘E" isDark={isDark} />
                    </div>
                  </div>

                  {/* Headings */}
                  <div>
                    <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      Headings
                    </h4>
                    <div className="space-y-1.5">
                      <ShortcutRow label="Heading 1" shortcut="⌘⌥1" isDark={isDark} />
                      <ShortcutRow label="Heading 2" shortcut="⌘⌥2" isDark={isDark} />
                      <ShortcutRow label="Heading 3" shortcut="⌘⌥3" isDark={isDark} />
                    </div>
                  </div>

                  {/* Lists & Blocks */}
                  <div>
                    <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      Lists & Blocks
                    </h4>
                    <div className="space-y-1.5">
                      <ShortcutRow label="Bullet List" shortcut="⌘⇧8" isDark={isDark} />
                      <ShortcutRow label="Numbered List" shortcut="⌘⇧7" isDark={isDark} />
                      <ShortcutRow label="Task List" shortcut="⌘⇧9" isDark={isDark} />
                      <ShortcutRow label="Blockquote" shortcut="⌘⇧B" isDark={isDark} />
                      <ShortcutRow label="Code Block" shortcut="⌘⌥C" isDark={isDark} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div>
                    <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      Actions
                    </h4>
                    <div className="space-y-1.5">
                      <ShortcutRow label="Command Palette" shortcut="⌘K" isDark={isDark} description="Quick actions" />
                      <ShortcutRow label="Slash Commands" shortcut="/" isDark={isDark} description="At line start" />
                      <ShortcutRow label="Undo" shortcut="⌘Z" isDark={isDark} />
                      <ShortcutRow label="Redo" shortcut="⌘⇧Z" isDark={isDark} />
                    </div>
                  </div>

                  {/* Special Features */}
                  <div>
                    <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      Special Features
                    </h4>
                    <div className="space-y-1.5">
                      <ShortcutRow label="Add Citation" shortcut="⌘⇧C" isDark={isDark} />
                      <ShortcutRow label="Web Research" shortcut="⌘⇧R" isDark={isDark} />
                      <ShortcutRow label="AI Actions" shortcut="⌘⇧A" isDark={isDark} description="Requires text selection" />
                      <ShortcutRow label="Show Shortcuts" shortcut="⌘/" isDark={isDark} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className={`px-5 py-3 border-t text-center ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'}`}>
                <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Press <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-200 text-zinc-600'}`}>Esc</kbd> or <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-200 text-zinc-600'}`}>⌘/</kbd> to close
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor Styles */}
      <style jsx global>{`
        /* Placeholder styling */
        .ProseMirror .editor-empty:first-child::before,
        .ProseMirror .node-empty::before {
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
          color: ${isDark ? 'rgb(113, 113, 122)' : 'rgb(161, 161, 170)'};
        }
        
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
          color: ${isDark ? 'rgb(113, 113, 122)' : 'rgb(161, 161, 170)'};
        }
        
        /* Task list checkbox styling */
        .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding: 0;
        }
        
        .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }
        
        .ProseMirror ul[data-type="taskList"] li > label {
          flex: 0 0 auto;
          margin-top: 0.25rem;
          cursor: pointer;
        }
        
        .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"] {
          width: 1rem;
          height: 1rem;
          accent-color: rgb(6, 182, 212);
          cursor: pointer;
        }
        
        .ProseMirror ul[data-type="taskList"] li > div {
          flex: 1 1 auto;
        }
        
        /* Code block styling */
        .ProseMirror pre {
          background: ${isDark ? 'rgb(24, 24, 27)' : 'rgb(24, 24, 27)'};
          border-radius: 0.75rem;
          padding: 1rem;
          overflow-x: auto;
        }
        
        .ProseMirror pre code {
          background: transparent;
          padding: 0;
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace;
          font-size: 0.875rem;
          line-height: 1.6;
        }
        
        /* Selection styling */
        .ProseMirror ::selection {
          background: ${isDark ? 'rgba(6, 182, 212, 0.3)' : 'rgba(6, 182, 212, 0.2)'};
        }
        
        /* Image styling */
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.75rem;
          margin: 1rem 0;
        }
        
        .ProseMirror img.ProseMirror-selectednode {
          outline: 3px solid rgb(6, 182, 212);
          outline-offset: 2px;
        }
        
        /* Horizontal rule styling */
        .ProseMirror hr {
          border: none;
          border-top: 2px solid ${isDark ? 'rgb(63, 63, 70)' : 'rgb(228, 228, 231)'};
          margin: 2rem 0;
        }
        
        /* Link styling in editor */
        .ProseMirror a {
          color: rgb(6, 182, 212);
          text-decoration: underline;
          text-underline-offset: 2px;
          cursor: pointer;
        }
        
        .ProseMirror a:hover {
          color: rgb(34, 211, 238);
        }
        
        /* Focus styling */
        .ProseMirror:focus {
          outline: none;
        }

        /* Paragraph styling - ensure proper spacing between paragraphs */
        .ProseMirror p {
          margin-bottom: 1em;
          line-height: 1.75;
        }

        .ProseMirror p:last-child {
          margin-bottom: 0;
        }

        /* List styling */
        .ProseMirror ul,
        .ProseMirror ol {
          margin-bottom: 1em;
          padding-left: 1.5em;
        }

        .ProseMirror li {
          margin-bottom: 0.5em;
          line-height: 1.6;
        }

        .ProseMirror li p {
          margin-bottom: 0.25em;
        }

        /* Blockquote styling */
        .ProseMirror blockquote {
          border-left: 4px solid rgb(6, 182, 212);
          padding-left: 1rem;
          margin-left: 0;
          font-style: italic;
          background: ${isDark ? 'rgba(6, 182, 212, 0.05)' : 'rgba(6, 182, 212, 0.05)'};
          border-radius: 0 0.5rem 0.5rem 0;
          padding: 0.5rem 1rem;
        }
      `}</style>
    </div>
  )
}

/**
 * TiptapEditor - Wrapper component that handles async extension loading
 *
 * This wrapper ensures extensions are fully loaded before rendering the editor,
 * preventing the "Schema is missing its top node type ('doc')" error that occurs
 * when useEditor is called with an empty extensions array.
 */
export default function TiptapEditor(props: TiptapEditorProps) {
  const { extensions, isLoading: extensionsLoading, error } = useExtensionsAsync()
  const isDark = props.theme?.includes('dark') ?? false

  // Show error state if extension loading failed
  if (error) {
    return (
      <div className={`flex-1 min-h-0 flex flex-col items-center justify-center p-8 ${isDark ? 'bg-zinc-900 text-zinc-100' : 'bg-white text-zinc-900'}`}>
        <div className={`text-center max-w-md ${isDark ? 'text-red-400' : 'text-red-600'}`}>
          <p className="text-lg font-medium mb-2">Failed to load editor</p>
          <p className="text-sm opacity-75">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className={`mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
            }`}
          >
            Reload page
          </button>
        </div>
      </div>
    )
  }

  // Show loading skeleton while extensions are loading
  // IMPORTANT: Always render something to keep UI interactive (never return null)
  if (extensionsLoading || !extensions) {
    return (
      <div className={`flex-1 min-h-0 flex flex-col ${isDark ? 'bg-zinc-900' : 'bg-white'}`}>
        {/* Skeleton toolbar */}
        <div className={`flex items-center gap-1 px-3 py-2 border-b ${isDark ? 'bg-zinc-800/80 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
          <div className={`h-7 w-32 rounded animate-pulse ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
          <div className={`h-7 w-24 rounded animate-pulse ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
          <div className={`h-7 w-20 rounded animate-pulse ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
        </div>
        {/* Skeleton content area */}
        <div className="flex-1 p-6 sm:p-8 lg:p-10">
          <div className={`h-8 w-3/4 rounded mb-4 animate-pulse ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`} />
          <div className={`h-4 w-full rounded mb-2 animate-pulse ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`} />
          <div className={`h-4 w-5/6 rounded mb-2 animate-pulse ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`} />
          <div className={`h-4 w-4/5 rounded mb-6 animate-pulse ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`} />
          <div className={`h-4 w-full rounded mb-2 animate-pulse ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`} />
          <div className={`h-4 w-2/3 rounded animate-pulse ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`} />
        </div>
      </div>
    )
  }

  // Extensions are loaded - render the core editor
  return <TiptapEditorCore {...props} extensions={extensions} />
}

// Note: htmlToMarkdown is now in lib/editor/asyncMarkdownConverter.ts
// for debounced/async processing to prevent UI freezing
