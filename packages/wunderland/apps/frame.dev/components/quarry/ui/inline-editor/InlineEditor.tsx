/**
 * Inline Editor - Live markdown editing with auto-save
 * @module codex/ui/InlineEditor
 * 
 * @remarks
 * Enables inline editing of markdown content with:
 * - Live preview as you type
 * - Auto-save to localStorage (debounced)
 * - Draft status indicators
 * - Conflict detection
 * - Publish to GitHub when ready
 */

'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle, HighlightStyle } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { 
  Edit3, Eye, Save, X, Check, AlertTriangle, 
  Cloud, CloudOff, Loader2, Send, Trash2,
  Bold, Italic, Code, Link2, List, Quote, Hash,
  Columns, Rows, Maximize2, Minimize2, PanelLeftClose, PanelRightClose,
  Info, ChevronRight, Tags, FileText, Calendar, User
} from 'lucide-react'
import { 
  saveDraft, 
  getDraft, 
  deleteDraft, 
  checkDraftStatus,
  type DraftEntry 
} from '@/lib/localStorage'

type EditorLayout = 'editor-only' | 'preview-only' | 'split-horizontal' | 'split-vertical'

interface StrandMetadataPreview {
  title?: string
  summary?: string
  tags?: string[]
  author?: string
  createdAt?: string
  updatedAt?: string
  version?: string
  difficulty?: string
  contentType?: string
}

interface InlineEditorProps {
  /** File path being edited */
  filePath: string
  /** Current content from source */
  originalContent: string
  /** Callback when content changes (for live preview) */
  onContentChange: (content: string) => void
  /** Callback to publish changes */
  onPublish?: (content: string) => void
  /** Whether editing is enabled */
  isEditing: boolean
  /** Toggle editing mode */
  onToggleEdit: () => void
  /** Current theme */
  theme?: string
  /** Initial layout (default: split-horizontal) */
  defaultLayout?: EditorLayout
  /** Rendered markdown preview component */
  renderPreview?: (content: string) => React.ReactNode
  /** Metadata for sidebar overlay */
  metadata?: StrandMetadataPreview
  /** Whether to show metadata sidebar by default in preview mode */
  showMetadataSidebar?: boolean
  /** Initial line number to scroll to (for syncing with reader position) */
  initialScrollLine?: number
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'conflict'

/**
 * Inline markdown editor with auto-save and draft management
 */
export default function InlineEditor({
  filePath,
  originalContent,
  onContentChange,
  onPublish,
  isEditing,
  onToggleEdit,
  theme = 'light',
  defaultLayout = 'split-horizontal',
  renderPreview,
  metadata,
  showMetadataSidebar: defaultShowMetadata = false,
  initialScrollLine,
}: InlineEditorProps) {
  const [content, setContent] = useState(originalContent)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [layout, setLayout] = useState<EditorLayout>(defaultLayout)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showMetadata, setShowMetadata] = useState(defaultShowMetadata)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const scrollPositionRef = useRef<{ editor: number; preview: number }>({ editor: 0, preview: 0 })
  const isDark = theme.includes('dark')

  // CodeMirror refs
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const editorViewRef = useRef<EditorView | null>(null)
  const themeCompartment = useRef(new Compartment())
  const contentUpdateRef = useRef(false) // Prevent infinite loops
  
  // Scroll sync ref - prevents infinite scroll loops between editor and preview
  const isScrollingSyncRef = useRef<'editor' | 'preview' | null>(null)

  // CodeMirror themes
  const lightTheme = useMemo(() => EditorView.theme({
    '&': { height: '100%', backgroundColor: 'white' },
    '.cm-scroller': { overflow: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '14px', lineHeight: '1.6' },
    '.cm-content': { padding: '12px', caretColor: '#18181b' },
    '.cm-line': { padding: '0 4px' },
    '.cm-gutters': { backgroundColor: '#fafafa', color: '#a1a1aa', border: 'none', paddingRight: '8px' },
    '.cm-activeLineGutter': { backgroundColor: '#f4f4f5' },
    '.cm-activeLine': { backgroundColor: '#f4f4f580' },
    '.cm-selectionBackground': { backgroundColor: '#3b82f640 !important' },
    '&.cm-focused .cm-selectionBackground': { backgroundColor: '#3b82f640 !important' },
    '.cm-cursor': { borderLeftColor: '#18181b' },
  }, { dark: false }), [])

  const darkTheme = useMemo(() => EditorView.theme({
    '&': { height: '100%', backgroundColor: '#18181b' },
    '.cm-scroller': { overflow: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '14px', lineHeight: '1.6' },
    '.cm-content': { padding: '12px', caretColor: '#f4f4f5' },
    '.cm-line': { padding: '0 4px' },
    '.cm-gutters': { backgroundColor: '#18181b', color: '#52525b', border: 'none', paddingRight: '8px' },
    '.cm-activeLineGutter': { backgroundColor: '#27272a' },
    '.cm-activeLine': { backgroundColor: '#27272a80' },
    '.cm-selectionBackground': { backgroundColor: '#22d3ee40 !important' },
    '&.cm-focused .cm-selectionBackground': { backgroundColor: '#22d3ee40 !important' },
    '.cm-cursor': { borderLeftColor: '#f4f4f5' },
  }, { dark: true }), [])

  // Markdown syntax highlighting for dark mode
  const darkHighlightStyle = useMemo(() => HighlightStyle.define([
    { tag: tags.heading1, color: '#22d3ee', fontWeight: 'bold', fontSize: '1.4em' },
    { tag: tags.heading2, color: '#22d3ee', fontWeight: 'bold', fontSize: '1.2em' },
    { tag: tags.heading3, color: '#22d3ee', fontWeight: 'bold', fontSize: '1.1em' },
    { tag: [tags.heading4, tags.heading5, tags.heading6], color: '#22d3ee', fontWeight: 'bold' },
    { tag: tags.emphasis, fontStyle: 'italic', color: '#a78bfa' },
    { tag: tags.strong, fontWeight: 'bold', color: '#f472b6' },
    { tag: tags.strikethrough, textDecoration: 'line-through', color: '#71717a' },
    { tag: tags.link, color: '#60a5fa', textDecoration: 'underline' },
    { tag: tags.url, color: '#60a5fa' },
    { tag: tags.monospace, color: '#4ade80', backgroundColor: '#27272a', padding: '2px 4px', borderRadius: '3px' },
    { tag: tags.quote, color: '#a1a1aa', fontStyle: 'italic', borderLeft: '3px solid #3f3f46', paddingLeft: '8px' },
    { tag: tags.list, color: '#fbbf24' },
    { tag: tags.meta, color: '#71717a' },
    { tag: tags.comment, color: '#52525b' },
  ]), [])

  const lightHighlightStyle = useMemo(() => HighlightStyle.define([
    { tag: tags.heading1, color: '#0891b2', fontWeight: 'bold', fontSize: '1.4em' },
    { tag: tags.heading2, color: '#0891b2', fontWeight: 'bold', fontSize: '1.2em' },
    { tag: tags.heading3, color: '#0891b2', fontWeight: 'bold', fontSize: '1.1em' },
    { tag: [tags.heading4, tags.heading5, tags.heading6], color: '#0891b2', fontWeight: 'bold' },
    { tag: tags.emphasis, fontStyle: 'italic', color: '#7c3aed' },
    { tag: tags.strong, fontWeight: 'bold', color: '#db2777' },
    { tag: tags.strikethrough, textDecoration: 'line-through', color: '#a1a1aa' },
    { tag: tags.link, color: '#2563eb', textDecoration: 'underline' },
    { tag: tags.url, color: '#2563eb' },
    { tag: tags.monospace, color: '#059669', backgroundColor: '#f4f4f5', padding: '2px 4px', borderRadius: '3px' },
    { tag: tags.quote, color: '#71717a', fontStyle: 'italic', borderLeft: '3px solid #d4d4d8', paddingLeft: '8px' },
    { tag: tags.list, color: '#d97706' },
    { tag: tags.meta, color: '#a1a1aa' },
    { tag: tags.comment, color: '#a1a1aa' },
  ]), [])

  // Initialize CodeMirror
  useEffect(() => {
    if (!editorContainerRef.current || editorViewRef.current) return

    const currentTheme = isDark ? darkTheme : lightTheme
    const currentHighlight = isDark ? darkHighlightStyle : lightHighlightStyle

    const startState = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        syntaxHighlighting(currentHighlight),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
        ]),
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        themeCompartment.current.of(currentTheme),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !contentUpdateRef.current) {
            const newContent = update.state.doc.toString()
            handleContentChange(newContent)
          }
        }),
        EditorView.lineWrapping,
      ],
    })

    const view = new EditorView({
      state: startState,
      parent: editorContainerRef.current,
    })

    editorViewRef.current = view

    return () => {
      view.destroy()
      editorViewRef.current = null
    }
  }, []) // Only run once on mount

  // Update theme when isDark changes
  useEffect(() => {
    if (!editorViewRef.current) return

    const currentTheme = isDark ? darkTheme : lightTheme
    editorViewRef.current.dispatch({
      effects: themeCompartment.current.reconfigure(currentTheme),
    })
  }, [isDark, darkTheme, lightTheme])

  // Sync content from external changes (file switch, discard, etc.)
  useEffect(() => {
    if (!editorViewRef.current) return

    const currentContent = editorViewRef.current.state.doc.toString()
    if (currentContent !== content) {
      contentUpdateRef.current = true
      editorViewRef.current.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: content,
        },
      })
      contentUpdateRef.current = false
    }
  }, [content])

  // Scroll to initial line when editor is ready (sync with reader position)
  useEffect(() => {
    if (!editorViewRef.current || !initialScrollLine || initialScrollLine <= 1) return

    // Wait for editor to be fully initialized
    requestAnimationFrame(() => {
      const view = editorViewRef.current
      if (!view) return

      // Clamp line number to valid range
      const lineCount = view.state.doc.lines
      const targetLine = Math.min(initialScrollLine, lineCount)

      // Get the position of the target line
      const line = view.state.doc.line(targetLine)

      // Scroll to center the line in view
      view.dispatch({
        effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
      })

      // Also move cursor to the start of that line
      view.dispatch({
        selection: { anchor: line.from },
      })
    })
  }, [initialScrollLine])

  // Attach scroll sync listener to CodeMirror editor
  useEffect(() => {
    if (!editorViewRef.current) return
    // Only attach in split layouts
    if (layout !== 'split-horizontal' && layout !== 'split-vertical') return
    
    const scrollDOM = editorViewRef.current.scrollDOM
    scrollDOM.addEventListener('scroll', handleEditorScroll)
    
    return () => {
      scrollDOM.removeEventListener('scroll', handleEditorScroll)
    }
  }, [layout, handleEditorScroll])

  // Save scroll positions when layout changes
  const saveScrollPositions = useCallback(() => {
    if (editorViewRef.current) {
      scrollPositionRef.current.editor = editorViewRef.current.scrollDOM.scrollTop
    }
    if (previewRef.current) {
      scrollPositionRef.current.preview = previewRef.current.scrollTop
    }
  }, [])

  // Restore scroll positions after layout change
  const restoreScrollPositions = useCallback(() => {
    requestAnimationFrame(() => {
      if (editorViewRef.current) {
        editorViewRef.current.scrollDOM.scrollTop = scrollPositionRef.current.editor
      }
      if (previewRef.current) {
        previewRef.current.scrollTop = scrollPositionRef.current.preview
      }
    })
  }, [])

  // Synchronized scroll: editor → preview
  const handleEditorScroll = useCallback(() => {
    // Skip if preview triggered this scroll
    if (isScrollingSyncRef.current === 'preview') return
    if (!editorViewRef.current || !previewRef.current) return
    // Only sync in split layouts
    if (layout !== 'split-horizontal' && layout !== 'split-vertical') return
    
    isScrollingSyncRef.current = 'editor'
    
    const scrollEl = editorViewRef.current.scrollDOM
    const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight
    const scrollPercent = maxScroll > 0 ? scrollEl.scrollTop / maxScroll : 0
    
    const previewEl = previewRef.current
    const previewMaxScroll = previewEl.scrollHeight - previewEl.clientHeight
    previewEl.scrollTop = scrollPercent * previewMaxScroll
    
    // Reset sync lock after animation frame
    requestAnimationFrame(() => { isScrollingSyncRef.current = null })
  }, [layout])

  // Synchronized scroll: preview → editor
  const handlePreviewScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    // Skip if editor triggered this scroll
    if (isScrollingSyncRef.current === 'editor') return
    if (!editorViewRef.current) return
    // Only sync in split layouts
    if (layout !== 'split-horizontal' && layout !== 'split-vertical') return
    
    isScrollingSyncRef.current = 'preview'
    
    const target = e.target as HTMLElement
    const maxScroll = target.scrollHeight - target.clientHeight
    const scrollPercent = maxScroll > 0 ? target.scrollTop / maxScroll : 0
    
    const scrollEl = editorViewRef.current.scrollDOM
    const editorMaxScroll = scrollEl.scrollHeight - scrollEl.clientHeight
    scrollEl.scrollTop = scrollPercent * editorMaxScroll
    
    // Reset sync lock after animation frame
    requestAnimationFrame(() => { isScrollingSyncRef.current = null })
  }, [layout])

  // Restore scroll after layout changes
  useEffect(() => {
    restoreScrollPositions()
  }, [layout, restoreScrollPositions])

  // Layout toggle helper with scroll preservation
  const cycleLayout = useCallback(() => {
    saveScrollPositions()
    setLayout(prev => {
      const layouts: EditorLayout[] = ['split-horizontal', 'split-vertical', 'editor-only', 'preview-only']
      const currentIndex = layouts.indexOf(prev)
      return layouts[(currentIndex + 1) % layouts.length]
    })
    restoreScrollPositions()
  }, [saveScrollPositions, restoreScrollPositions])
  
  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }, [isFullscreen])
  
  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Reset editor state when switching files or when the source content changes
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    setContent(originalContent)
    setHasUnsavedChanges(false)
    setSaveStatus('idle')
    setLastSaved(null)
  }, [filePath, originalContent])

  // Check for existing draft on mount
  useEffect(() => {
    const { hasDraft, hasChanges, isConflict, draft } = checkDraftStatus(filePath, originalContent)
    
    if (hasDraft && draft) {
      if (isConflict) {
        setSaveStatus('conflict')
        // Still load the draft but mark as conflict
        setContent(draft.content)
        setHasUnsavedChanges(true)
      } else if (hasChanges) {
        setContent(draft.content)
        setHasUnsavedChanges(true)
        setLastSaved(new Date(draft.modifiedAt))
        setSaveStatus('saved')
      }
    }
  }, [filePath, originalContent])

  // Auto-save with debounce
  const saveToStorage = useCallback((newContent: string) => {
    if (newContent === originalContent) {
      // Content matches original, delete draft
      deleteDraft(filePath)
      setHasUnsavedChanges(false)
      setSaveStatus('idle')
      return
    }

    setSaveStatus('saving')
    
    try {
      saveDraft(filePath, newContent, originalContent)
      setLastSaved(new Date())
      setHasUnsavedChanges(true)
      setSaveStatus('saved')
    } catch (error) {
      console.error('Failed to save draft:', error)
      setSaveStatus('error')
    }
  }, [filePath, originalContent])

  // Debounced save
  const debouncedSave = useCallback((newContent: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    setSaveStatus('saving')
    
    saveTimeoutRef.current = setTimeout(() => {
      saveToStorage(newContent)
    }, 1000) // 1 second debounce
  }, [saveToStorage])

  // Handle content changes with scroll position preservation
  const handleContentChange = useCallback((newContent: string) => {
    // Save scroll position before update
    if (editorViewRef.current) {
      scrollPositionRef.current.editor = editorViewRef.current.scrollDOM.scrollTop
    }
    if (previewRef.current) {
      scrollPositionRef.current.preview = previewRef.current.scrollTop
    }

    setContent(newContent)
    onContentChange(newContent)
    debouncedSave(newContent)

    // Restore scroll position after React renders
    requestAnimationFrame(() => {
      if (previewRef.current) {
        previewRef.current.scrollTop = scrollPositionRef.current.preview
      }
    })
  }, [onContentChange, debouncedSave])

  // Discard changes
  const handleDiscard = () => {
    deleteDraft(filePath)
    setContent(originalContent)
    onContentChange(originalContent)
    setHasUnsavedChanges(false)
    setSaveStatus('idle')
    setShowDiscardConfirm(false)
    onToggleEdit()
  }

  // Handle publish
  const handlePublish = () => {
    if (onPublish) {
      onPublish(content)
    }
  }

  // Insert markdown syntax (works with CodeMirror)
  const insertMarkdown = (prefix: string, suffix: string = prefix) => {
    const view = editorViewRef.current
    if (!view) return

    const { from, to } = view.state.selection.main
    const selectedText = view.state.doc.sliceString(from, to)

    view.dispatch({
      changes: {
        from,
        to,
        insert: prefix + selectedText + suffix,
      },
      selection: {
        anchor: from + prefix.length,
        head: from + prefix.length + selectedText.length,
      },
    })
    view.focus()
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Status icon and message
  const statusInfo = useMemo(() => {
    switch (saveStatus) {
      case 'saving':
        return { icon: Loader2, message: 'Saving...', color: 'text-blue-500', spin: true }
      case 'saved':
        return { icon: Check, message: `Draft saved${lastSaved ? ` at ${lastSaved.toLocaleTimeString()}` : ''}`, color: 'text-green-500', spin: false }
      case 'error':
        return { icon: AlertTriangle, message: 'Failed to save', color: 'text-red-500', spin: false }
      case 'conflict':
        return { icon: AlertTriangle, message: 'Source changed - your draft may conflict', color: 'text-amber-500', spin: false }
      default:
        return { icon: Cloud, message: 'No changes', color: 'text-zinc-400', spin: false }
    }
  }, [saveStatus, lastSaved])

  const StatusIcon = statusInfo.icon

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        {/* Edit Toggle Button */}
        <button
          onClick={onToggleEdit}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
            transition-all
            ${isDark 
              ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' 
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
            }
          `}
        >
          <Edit3 className="w-4 h-4" />
          Edit
        </button>

        {/* Draft indicator */}
        {hasUnsavedChanges && (
          <div className={`
            flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium
            ${isDark 
              ? 'bg-amber-900/30 text-amber-400 border border-amber-800' 
              : 'bg-amber-100 text-amber-700 border border-amber-300'
            }
          `}>
            <CloudOff className="w-3 h-3" />
            <span>Unpublished draft</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className={`
        relative rounded-xl overflow-hidden border-2
        ${isDark 
          ? 'border-cyan-700 bg-zinc-900' 
          : 'border-cyan-400 bg-white'
        }
        ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}
      `}
    >
      {/* Toolbar */}
      <div className={`
        flex items-center gap-1 px-3 py-2 border-b flex-wrap
        ${isDark ? 'border-zinc-800 bg-zinc-900/80' : 'border-zinc-200 bg-zinc-50'}
      `}>
        {/* Formatting buttons */}
        <button
          onClick={() => insertMarkdown('**')}
          className={`p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => insertMarkdown('*')}
          className={`p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          onClick={() => insertMarkdown('`')}
          className={`p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors`}
          title="Code"
        >
          <Code className="w-4 h-4" />
        </button>
        <button
          onClick={() => insertMarkdown('[', '](url)')}
          className={`p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors`}
          title="Link"
        >
          <Link2 className="w-4 h-4" />
        </button>
        <div className={`w-px h-5 mx-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
        <button
          onClick={() => insertMarkdown('\n- ', '')}
          className={`p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors`}
          title="List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => insertMarkdown('\n> ', '')}
          className={`p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors`}
          title="Quote"
        >
          <Quote className="w-4 h-4" />
        </button>
        <button
          onClick={() => insertMarkdown('\n## ', '')}
          className={`p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors`}
          title="Heading"
        >
          <Hash className="w-4 h-4" />
        </button>

        <div className={`w-px h-5 mx-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
        
        {/* Layout Toggle Buttons */}
        <div className="flex items-center gap-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5">
          <button
            onClick={() => { saveScrollPositions(); setLayout('editor-only') }}
            className={`p-1.5 rounded transition-colors ${
              layout === 'editor-only'
                ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300'
                : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
            title="Editor only"
          >
            <PanelRightClose className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { saveScrollPositions(); setLayout('split-horizontal') }}
            className={`p-1.5 rounded transition-colors ${
              layout === 'split-horizontal'
                ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300'
                : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
            title="Split horizontal"
          >
            <Columns className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { saveScrollPositions(); setLayout('split-vertical') }}
            className={`p-1.5 rounded transition-colors ${
              layout === 'split-vertical'
                ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300'
                : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
            title="Split vertical"
          >
            <Rows className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { saveScrollPositions(); setLayout('preview-only') }}
            className={`p-1.5 rounded transition-colors ${
              layout === 'preview-only'
                ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300'
                : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
            title="Preview only"
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
          </button>
        </div>
        
        {/* Fullscreen toggle */}
        <button
          onClick={toggleFullscreen}
          className={`p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors ml-1`}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
        
        {/* Metadata sidebar toggle (only in preview modes) */}
        {metadata && (layout === 'preview-only' || layout === 'split-horizontal' || layout === 'split-vertical') && (
          <>
            <div className={`w-px h-5 mx-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
            <button
              onClick={() => setShowMetadata(!showMetadata)}
              className={`
                flex items-center gap-1.5 p-1.5 rounded transition-colors
                ${showMetadata 
                  ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300' 
                  : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }
              `}
              title={showMetadata ? "Hide metadata" : "Show metadata"}
            >
              <Info className="w-4 h-4" />
              <span className="text-xs hidden sm:inline">Info</span>
            </button>
          </>
        )}

        <div className="flex-1" />

        {/* Status indicator */}
        <div className={`flex items-center gap-1.5 text-xs ${statusInfo.color}`}>
          <StatusIcon className={`w-3.5 h-3.5 ${statusInfo.spin ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{statusInfo.message}</span>
        </div>
      </div>

      {/* Editor + Preview Split View - compact by default */}
      <div className={`
        ${layout === 'split-horizontal' ? 'flex flex-row' : ''}
        ${layout === 'split-vertical' ? 'flex flex-col' : ''}
        ${isFullscreen ? 'h-[calc(100vh-100px)]' : 'h-[calc(100vh-200px)] min-h-[400px]'}
      `}>
        {/* Editor Pane - CodeMirror */}
        {(layout === 'editor-only' || layout === 'split-horizontal' || layout === 'split-vertical') && (
          <div className={`
            ${layout === 'split-horizontal' ? 'w-1/2 h-full border-r' : ''}
            ${layout === 'split-vertical' ? 'h-1/2 border-b' : ''}
            ${layout === 'editor-only' ? 'w-full h-full' : ''}
            ${isDark ? 'border-zinc-700' : 'border-zinc-200'}
          `}>
            <div
              ref={editorContainerRef}
              className="h-full w-full"
            />
          </div>
        )}
        
        {/* Preview Pane */}
        {(layout === 'preview-only' || layout === 'split-horizontal' || layout === 'split-vertical') && (
          <div
            ref={previewRef}
            onScroll={handlePreviewScroll}
            className={`
            ${layout === 'split-horizontal' ? 'w-1/2' : ''}
            ${layout === 'split-vertical' ? 'h-1/2' : ''}
            ${layout === 'preview-only' ? 'w-full' : ''}
            overflow-auto relative
            ${isDark ? 'bg-zinc-950' : 'bg-zinc-50'}
          `}>
            <div className={`
              p-3 prose prose-sm dark:prose-invert max-w-none
              ${isFullscreen && layout === 'preview-only' ? 'min-h-[calc(100vh-150px)]' : 'min-h-[180px]'}
              ${showMetadata && metadata ? 'pr-72' : ''}
              transition-all duration-300
            `}>
              {renderPreview ? (
                renderPreview(content)
              ) : (
                <div className="text-zinc-500 dark:text-zinc-400 text-sm italic">
                  Preview will appear here...
                </div>
              )}
            </div>
            
            {/* Metadata Overlay Sidebar */}
            <AnimatePresence>
              {showMetadata && metadata && (
                <motion.aside
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className={`
                    absolute top-0 right-0 w-64 h-full overflow-y-auto
                    border-l shadow-xl z-10
                    ${isDark 
                      ? 'bg-zinc-900/95 border-zinc-700 backdrop-blur-sm' 
                      : 'bg-white/95 border-zinc-200 backdrop-blur-sm'
                    }
                  `}
                >
                  {/* Sidebar Header */}
                  <div className={`
                    sticky top-0 flex items-center justify-between px-4 py-3 border-b
                    ${isDark ? 'bg-zinc-900/80 border-zinc-700' : 'bg-white/80 border-zinc-200'}
                    backdrop-blur-sm
                  `}>
                    <div className="flex items-center gap-2">
                      <Info className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                      <span className="text-sm font-semibold">Metadata</span>
                    </div>
                    <button
                      onClick={() => setShowMetadata(false)}
                      className={`p-1 rounded transition-colors ${
                        isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
                      }`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Metadata Content */}
                  <div className="p-4 space-y-4">
                    {/* Title */}
                    {metadata.title && (
                      <div>
                        <label className={`text-xs font-medium uppercase tracking-wide ${
                          isDark ? 'text-zinc-500' : 'text-zinc-400'
                        }`}>
                          Title
                        </label>
                        <p className={`text-sm font-medium mt-1 ${
                          isDark ? 'text-zinc-200' : 'text-zinc-800'
                        }`}>
                          {metadata.title}
                        </p>
                      </div>
                    )}
                    
                    {/* Summary */}
                    {metadata.summary && (
                      <div>
                        <label className={`text-xs font-medium uppercase tracking-wide ${
                          isDark ? 'text-zinc-500' : 'text-zinc-400'
                        }`}>
                          Summary
                        </label>
                        <p className={`text-sm mt-1 leading-relaxed ${
                          isDark ? 'text-zinc-300' : 'text-zinc-600'
                        }`}>
                          {metadata.summary}
                        </p>
                      </div>
                    )}
                    
                    {/* Tags */}
                    {metadata.tags && metadata.tags.length > 0 && (
                      <div>
                        <label className={`flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide ${
                          isDark ? 'text-zinc-500' : 'text-zinc-400'
                        }`}>
                          <Tags className="w-3 h-3" />
                          Tags
                        </label>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {metadata.tags.map(tag => (
                            <span
                              key={tag}
                              className={`
                                px-2 py-0.5 rounded-full text-xs font-medium
                                ${isDark 
                                  ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-800' 
                                  : 'bg-cyan-100 text-cyan-700 border border-cyan-200'
                                }
                              `}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {metadata.version && (
                        <div>
                          <label className={`text-[10px] font-medium uppercase tracking-wide ${
                            isDark ? 'text-zinc-500' : 'text-zinc-400'
                          }`}>
                            Version
                          </label>
                          <p className={`text-sm font-mono mt-0.5 ${
                            isDark ? 'text-zinc-300' : 'text-zinc-700'
                          }`}>
                            v{metadata.version}
                          </p>
                        </div>
                      )}
                      
                      {metadata.difficulty && (
                        <div>
                          <label className={`text-[10px] font-medium uppercase tracking-wide ${
                            isDark ? 'text-zinc-500' : 'text-zinc-400'
                          }`}>
                            Difficulty
                          </label>
                          <p className={`text-sm capitalize mt-0.5 ${
                            isDark ? 'text-zinc-300' : 'text-zinc-700'
                          }`}>
                            {metadata.difficulty}
                          </p>
                        </div>
                      )}
                      
                      {metadata.contentType && (
                        <div>
                          <label className={`text-[10px] font-medium uppercase tracking-wide ${
                            isDark ? 'text-zinc-500' : 'text-zinc-400'
                          }`}>
                            Type
                          </label>
                          <p className={`text-sm capitalize mt-0.5 ${
                            isDark ? 'text-zinc-300' : 'text-zinc-700'
                          }`}>
                            {metadata.contentType}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Author & Dates */}
                    {(metadata.author || metadata.createdAt || metadata.updatedAt) && (
                      <div className={`
                        pt-3 mt-3 border-t space-y-2
                        ${isDark ? 'border-zinc-800' : 'border-zinc-200'}
                      `}>
                        {metadata.author && (
                          <div className="flex items-center gap-2">
                            <User className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                            <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                              {metadata.author}
                            </span>
                          </div>
                        )}
                        
                        {metadata.createdAt && (
                          <div className="flex items-center gap-2">
                            <Calendar className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                            <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                              Created: {new Date(metadata.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        
                        {metadata.updatedAt && (
                          <div className="flex items-center gap-2">
                            <Calendar className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                            <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                              Updated: {new Date(metadata.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* File Path */}
                    <div className={`
                      pt-3 mt-3 border-t
                      ${isDark ? 'border-zinc-800' : 'border-zinc-200'}
                    `}>
                      <label className={`flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide ${
                        isDark ? 'text-zinc-500' : 'text-zinc-400'
                      }`}>
                        <FileText className="w-3 h-3" />
                        File Path
                      </label>
                      <p className={`text-[11px] font-mono mt-1 break-all ${
                        isDark ? 'text-zinc-400' : 'text-zinc-500'
                      }`}>
                        {filePath}
                      </p>
                    </div>
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className={`
        flex items-center justify-between gap-2 px-3 py-2 border-t
        ${isDark ? 'border-zinc-800 bg-zinc-900/80' : 'border-zinc-200 bg-zinc-50'}
      `}>
        <div className="flex items-center gap-2">
          {/* Close/Cancel */}
          <button
            onClick={() => {
              if (hasUnsavedChanges && content !== originalContent) {
                setShowDiscardConfirm(true)
              } else {
                onToggleEdit()
              }
            }}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
              transition-colors
              ${isDark 
                ? 'hover:bg-zinc-800 text-zinc-400' 
                : 'hover:bg-zinc-200 text-zinc-600'
              }
            `}
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          
          {/* Discard changes */}
          {hasUnsavedChanges && (
            <button
              onClick={() => setShowDiscardConfirm(true)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
                transition-colors text-red-500
                ${isDark ? 'hover:bg-red-900/30' : 'hover:bg-red-100'}
              `}
            >
              <Trash2 className="w-4 h-4" />
              Discard
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Save indicator */}
          {hasUnsavedChanges && (
            <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Draft will be saved automatically
            </span>
          )}

          {/* Publish button - with detailed tooltip */}
          {onPublish && hasUnsavedChanges && (
            <button
              onClick={handlePublish}
              title="Publish changes to GitHub. This creates a Pull Request with your edits and triggers re-indexing for search and NLP analysis."
              className={`
                flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold
                transition-all shadow-md
                ${isDark 
                  ? 'bg-gradient-to-r from-cyan-700 to-cyan-600 hover:from-cyan-600 hover:to-cyan-500 text-white' 
                  : 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white'
                }
              `}
            >
              <Send className="w-4 h-4" />
              Publish to GitHub
            </button>
          )}
        </div>
      </div>

      {/* Discard confirmation modal */}
      <AnimatePresence>
        {showDiscardConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`
                p-6 rounded-xl shadow-2xl max-w-sm mx-4
                ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'}
              `}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-full ${isDark ? 'bg-red-900/30' : 'bg-red-100'}`}>
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold">Discard changes?</h3>
              </div>
              <p className={`text-sm mb-6 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                You have unpublished changes. Discarding will permanently delete your draft.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDiscardConfirm(false)}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${isDark 
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' 
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                    }
                  `}
                >
                  Keep editing
                </button>
                <button
                  onClick={handleDiscard}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors"
                >
                  Discard draft
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}















