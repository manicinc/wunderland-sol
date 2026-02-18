/**
 * Strand Editor - Art Deco WYSIWYG markdown editor
 * @module codex/ui/StrandEditor
 * 
 * @remarks
 * The Hitchhiker's Guide to the Galaxy meets Art Deco notebook.
 * Features live preview, auto-save, and media insertion tools.
 */

'use client'

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  Component,
  ReactNode,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Save, Eye, EyeOff, Type, Bold, Italic, Code, Link2,
  List, ListOrdered, Quote, Minus, Image, Mic, Camera,
  Brush, FileText, Hash, AtSign, ChevronLeft, Check,
  Sparkles, Moon, Sun, BookOpen, Edit3, Send, Info, Tags
} from 'lucide-react'
import Tooltip from '../common/Tooltip'
import { useJobQueue } from '../../hooks/useJobQueue'
import { enqueueJob, subscribeToJobs } from '@/lib/jobs/jobQueue'
import type { BlockTaggingJobPayload } from '@/lib/jobs/types'
import { getStoredVaultHandle } from '@/lib/vault/vaultConfig'
import type { GitHubFile, StrandMetadata } from '../../types'
import type { ThemeName } from '@/types/theme'
import { stripFrontmatter } from '../../utils'
import { REPO_CONFIG } from '../../constants'
import { checkDraftStatus, deleteDraft, saveDraft } from '@/lib/localStorage'
import dynamic from 'next/dynamic'
import type { RepoInfo, MediaAsset } from '@/lib/github/gitSync'
import type { Editor } from '@tiptap/react'
import { useCursorPosition } from '../../hooks/useCursorPosition'
import { useMediaStorage } from '../../hooks/useMediaStorage'
import { useBlockTags } from '@/lib/hooks/useBlockTags'
import type { MediaAsset as RadialMediaAsset } from '../misc/RadialMediaMenu'
import { formatVoiceNote, formatImageNote } from '@/lib/media/formatVoiceNote'
import { useWritingTimer } from '../../hooks/useWritingTimer'
import WritingTimerDisplay from '../writing/WritingTimerDisplay'
import { useToast } from '../common/Toast'

// Dynamic imports for heavy components
// TiptapEditor MUST use dynamic import with ssr:false - static import causes render failures
const TiptapEditor = dynamic(() => import('../tiptap/TiptapEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 min-h-0 flex flex-col animate-pulse">
      <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-200 dark:border-zinc-700">
        <div className="h-7 w-32 rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-7 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-7 w-20 rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>
      <div className="flex-1 p-8">
        <div className="h-8 w-3/4 rounded mb-6 bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-4 w-full rounded mb-2 bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-4 w-5/6 rounded mb-2 bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-4 w-2/3 rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>
    </div>
  ),
})
const RadialMediaMenu = dynamic(() => import('../misc/RadialMediaMenu'), { ssr: false })
const PublishModal = dynamic(() => import('../publishing/PublishModal'), { ssr: false })
const BlockTagsSidebarPanel = dynamic(() => import('../blocks/BlockTagsSidebarPanel'), { ssr: false })
const BlockTagsErrorBoundary = dynamic(() => import('../blocks/BlockTagsErrorBoundary'), { ssr: false })
const CameraCapture = dynamic(() => import('../media/CameraCapture'), { ssr: false })
const VoiceRecorder = dynamic(() => import('../media/VoiceRecorder'), { ssr: false })
const HandwritingImportModal = dynamic(() => import('../misc/HandwritingImportModal'), { ssr: false })

// Markdown preview - dynamically import to avoid SSR issues with syntax highlighter
const EditorMarkdownPreview = dynamic(() => import('../editor/EditorMarkdownPreview'), {
  ssr: false,
  loading: () => <div className="p-6 text-gray-500 animate-pulse">Loading preview...</div>
})

/**
 * Error boundary for TiptapEditor - catches initialization failures
 * and displays a friendly error message instead of crashing
 */
class EditorErrorBoundary extends Component<
  { children: ReactNode; isDark?: boolean },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode; isDark?: boolean }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[EditorErrorBoundary] Caught error:', error)
    console.error('[EditorErrorBoundary] Component stack:', errorInfo.componentStack)
  }

  render() {
    if (this.state.hasError) {
      const isDark = this.props.isDark
      return (
        <div className={`flex-1 flex items-center justify-center p-8 ${isDark ? 'bg-zinc-900' : 'bg-white'}`}>
          <div className="text-center max-w-md">
            <div className={`w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center ${isDark ? 'bg-amber-900/50' : 'bg-amber-100'}`}>
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              Editor failed to load
            </h3>
            <p className={`text-sm mb-4 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {this.state.error?.message || 'The editor encountered an error during initialization.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className={`px-4 py-2 rounded-lg transition-colors ${isDark
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

    return this.props.children
  }
}

interface StrandEditorProps {
  /** File being edited */
  file: GitHubFile
  /** Initial content */
  content: string
  /** Initial metadata */
  metadata: StrandMetadata
  /** Whether editor is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Save callback */
  onSave: (content: string, metadata: StrandMetadata) => Promise<void>
  /** Current theme */
  theme?: ThemeName
  /** Repository info for publishing */
  repo?: RepoInfo
  /** Callback when user creates a highlight from selected text */
  onCreateHighlight?: (data: {
    filePath: string
    content: string
    selectionType: 'text' | 'block'
    startOffset?: number
    endOffset?: number
    color: 'yellow' | 'green' | 'blue' | 'pink' | 'purple' | 'orange'
  }) => void
  /** Pending markdown to insert (from external source like FAB) */
  pendingInsert?: string | null
  /** Callback when pending insert is consumed */
  onPendingInsertConsumed?: () => void
}

interface EditorTab {
  id: 'edit' | 'preview' | 'split'
  label: string
  icon: React.ElementType
}

const EDITOR_TABS: EditorTab[] = [
  { id: 'edit', label: 'Write', icon: Edit3 },
  { id: 'split', label: 'Split', icon: BookOpen },
  { id: 'preview', label: 'Preview', icon: Eye },
]

/**
 * Art Deco-styled WYSIWYG markdown editor
 * 
 * @remarks
 * - Auto-saves to localStorage every 5 seconds
 * - Split-pane view with live preview
 * - Typewriter sounds on keystroke
 * - Radial media insertion menu
 * - Art Deco geometric patterns
 */
export default function StrandEditor({
  file,
  content: initialContent,
  metadata: initialMetadata,
  isOpen,
  onClose,
  onSave,
  theme = 'light',
  repo,
  onCreateHighlight,
  pendingInsert,
  onPendingInsertConsumed,
}: StrandEditorProps) {
  // State declarations first to avoid TDZ issues
  const [activeTab, setActiveTab] = useState<EditorTab['id']>('split')
  const [content, setContent] = useState(initialContent)
  const [metadata, setMetadata] = useState<StrandMetadata>(initialMetadata)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showMediaMenu, setShowMediaMenu] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([])
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [showCameraCapture, setShowCameraCapture] = useState(false)
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const [showHandwritingImport, setShowHandwritingImport] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [keyboardOffset, setKeyboardOffset] = useState(0) // For mobile keyboard avoidance
  const [publishing, setPublishing] = useState(false)
  const [hasVault, setHasVault] = useState(false)
  const [showBlockTagsPanel, setShowBlockTagsPanel] = useState(false)
  const [isTaggingRunning, setIsTaggingRunning] = useState(false)

  // Job queue for local publishing
  const { enqueuePublish } = useJobQueue()

  // Toast notifications for errors
  const { error: showError } = useToast()

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const editorRef = useRef<Editor | null>(null)
  const lastSaveRef = useRef(content)

  // Scroll sync refs
  const previewRef = useRef<HTMLDivElement>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const isScrollingSyncRef = useRef<'editor' | 'preview' | null>(null)

  // Cursor position tracking for radial menu placement
  const { position: cursorPosition, lastValidPosition } = useCursorPosition({
    editorRef,
    textareaRef,
  })

  // Media storage with IndexedDB and sync
  const {
    storeAsset,
    syncStatus: mediaSyncStatus,
    pendingCount: mediaPendingCount,
  } = useMediaStorage({
    strandPath: file.path,
    autoSync: true,
  })

  // Block-level tagging hook
  const {
    blocks,
    inlineTags,
    isLoading: blocksLoading,
    acceptTag,
    rejectTag,
    refetch: refetchBlocks,
  } = useBlockTags(file.path, { strandContent: content })

  // Writing timer hook
  const {
    activeTime,
    activeTimeFormatted,
    state: timerState,
    start: startTimer,
    pause: pauseTimer,
    resume: resumeTimer,
    stop: stopTimer,
    reset: resetTimer,
    recordActivity,
  } = useWritingTimer({
    strandId: file.path,
    autoStart: true,
    editorRef: editorRef as React.RefObject<HTMLElement>,
  })

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Handle mobile keyboard - adjust toolbar position using visualViewport API
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return

    const viewport = window.visualViewport
    const handleViewportResize = () => {
      // Calculate keyboard height by comparing visual viewport to window height
      const keyboardHeight = window.innerHeight - viewport.height
      // Only apply offset if keyboard is likely open (> 100px difference)
      setKeyboardOffset(keyboardHeight > 100 ? keyboardHeight : 0)
    }

    viewport.addEventListener('resize', handleViewportResize)
    viewport.addEventListener('scroll', handleViewportResize)

    return () => {
      viewport.removeEventListener('resize', handleViewportResize)
      viewport.removeEventListener('scroll', handleViewportResize)
    }
  }, [])

  // Check if vault is configured
  useEffect(() => {
    getStoredVaultHandle().then(handle => setHasVault(!!handle))
  }, [])

  // Calculate stats
  useEffect(() => {
    const strippedContent = stripFrontmatter(content)
    setWordCount(strippedContent.split(/\s+/).filter(w => w.length > 0).length)
    setCharCount(strippedContent.length)
  }, [content])

  // Scroll sync handlers for split view
  const handleEditorScroll = useCallback((e: React.UIEvent<HTMLDivElement> | Event) => {
    if (activeTab !== 'split' || isScrollingSyncRef.current === 'preview') return

    const target = e.target as HTMLElement
    if (!target || !previewRef.current) return

    isScrollingSyncRef.current = 'editor'

    // Calculate scroll percentage
    const scrollPercent = target.scrollTop / (target.scrollHeight - target.clientHeight || 1)

    // Apply to preview
    const previewEl = previewRef.current
    const previewMaxScroll = previewEl.scrollHeight - previewEl.clientHeight
    previewEl.scrollTop = scrollPercent * previewMaxScroll

    // Reset sync lock after animation frame
    requestAnimationFrame(() => {
      isScrollingSyncRef.current = null
    })
  }, [activeTab])

  const handlePreviewScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (activeTab !== 'split' || isScrollingSyncRef.current === 'editor') return

    const target = e.target as HTMLElement
    if (!target || !editorContainerRef.current) return

    isScrollingSyncRef.current = 'preview'

    // Calculate scroll percentage
    const scrollPercent = target.scrollTop / (target.scrollHeight - target.clientHeight || 1)

    // Find the scrollable element inside the editor container (Tiptap's prosemirror container)
    const editorScrollEl = editorContainerRef.current.querySelector('.ProseMirror')?.parentElement as HTMLElement | null
    if (editorScrollEl) {
      const editorMaxScroll = editorScrollEl.scrollHeight - editorScrollEl.clientHeight
      editorScrollEl.scrollTop = scrollPercent * editorMaxScroll
    }

    // Reset sync lock after animation frame
    requestAnimationFrame(() => {
      isScrollingSyncRef.current = null
    })
  }, [activeTab])

  // Set up scroll listener on editor container
  useEffect(() => {
    if (activeTab !== 'split' || !editorContainerRef.current) return

    let editorScrollEl: HTMLElement | null = null
    let observer: MutationObserver | null = null

    const attachScrollListener = () => {
      // Find the scrollable prosemirror container
      editorScrollEl = editorContainerRef.current?.querySelector('.ProseMirror')?.parentElement as HTMLElement | null
      if (editorScrollEl) {
        editorScrollEl.addEventListener('scroll', handleEditorScroll as EventListener)
        return true
      }
      return false
    }

    // Try immediately
    if (!attachScrollListener()) {
      // If not found, observe for DOM changes (TiptapEditor loads dynamically)
      observer = new MutationObserver(() => {
        if (attachScrollListener()) {
          observer?.disconnect()
        }
      })
      observer.observe(editorContainerRef.current, { childList: true, subtree: true })
    }

    return () => {
      if (editorScrollEl) {
        editorScrollEl.removeEventListener('scroll', handleEditorScroll as EventListener)
      }
      observer?.disconnect()
    }
  }, [activeTab, handleEditorScroll])

  // Auto-save to draft storage
  useEffect(() => {
    if (!isOpen) return

    const saveInterval = setInterval(() => {
      if (content !== lastSaveRef.current) {
        try {
          if (content === initialContent) {
            deleteDraft(file.path)
          } else {
            saveDraft(file.path, content, initialContent)
          }
        } catch (error) {
          console.error('Failed to save draft:', error)
          showError('Failed to save draft. Your changes may not be saved.')
        }
        lastSaveRef.current = content
        setSaved(true)
        setTimeout(() => setSaved(false), 5000) // Longer display for better visibility
      }
    }, 5000)

    return () => clearInterval(saveInterval)
  }, [content, file.path, initialContent, isOpen, showError])

  // Load draft when opened
  useEffect(() => {
    if (!isOpen) return

    const { hasDraft, hasChanges, draft } = checkDraftStatus(file.path, initialContent)
    if (hasDraft && hasChanges && draft) {
      setContent(draft.content)
      return
    }

    // Legacy migration: older editor stored drafts under a per-file key.
    try {
      const legacyKey = `codex-draft-${file.path}`
      const legacyDraft = localStorage.getItem(legacyKey)
      if (legacyDraft && legacyDraft !== initialContent) {
        saveDraft(file.path, legacyDraft, initialContent)
        localStorage.removeItem(legacyKey)
        setContent(legacyDraft)
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [file.path, initialContent, isOpen])

  /**
   * Insert text at cursor position (works with both Tiptap and textarea fallback)
   * If no cursor/editor available, appends to the bottom of the content
   */
  const insertText = useCallback((text: string) => {
    // Try Tiptap first
    if (editorRef.current) {
      editorRef.current.commands.insertContent(text)
      return
    }

    // Fallback to textarea
    const textarea = textareaRef.current
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const before = content.substring(0, start)
      const after = content.substring(end)

      setContent(before + text + after)

      // Restore cursor position after React re-render
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + text.length, start + text.length)
      }, 0)
      return
    }

    // No editor or textarea available - append to bottom with newlines
    setContent(prev => {
      const trimmed = prev.trimEnd()
      return trimmed + (trimmed.length > 0 ? '\n\n' : '') + text
    })
  }, [content])

  // Handle pending insert from external sources (like MediaCaptureFAB)
  useEffect(() => {
    if (pendingInsert && isOpen) {
      // Small delay to ensure editor is ready
      setTimeout(() => {
        insertText(pendingInsert)
        onPendingInsertConsumed?.()
      }, 100)
    }
  }, [pendingInsert, isOpen, insertText, onPendingInsertConsumed])

  /**
   * Wrap selection with markdown syntax (works with both Tiptap and textarea fallback)
   */
  const wrapSelection = useCallback((prefix: string, suffix: string = prefix) => {
    // Try Tiptap first
    if (editorRef.current) {
      const editor = editorRef.current

      // Map common markdown to Tiptap commands
      if (prefix === '**') {
        editor.chain().focus().toggleBold().run()
        return
      }
      if (prefix === '*') {
        editor.chain().focus().toggleItalic().run()
        return
      }
      if (prefix === '`') {
        editor.chain().focus().toggleCode().run()
        return
      }

      // Fallback: insert as text
      editor.commands.insertContent(prefix + suffix)
      return
    }

    // Fallback to textarea
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    const before = content.substring(0, start)
    const after = content.substring(end)

    setContent(before + prefix + selectedText + suffix + after)

    // Select the wrapped text
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + prefix.length, end + prefix.length)
    }, 0)
  }, [content])

  /**
   * Handle save
   */
  const handleSave = async () => {
    setSaving(true)
    setSaved(false)

    try {
      await onSave(content, metadata)
      localStorage.removeItem(`codex-draft-${file.path}`)
      setSaved(true)
      setTimeout(() => setSaved(false), 5000) // Match auto-save timing
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setSaving(false)
    }
  }

  /**
   * Handle publish - writes to vault + runs NLP pipeline + auto block tagging
   */
  const handlePublish = async () => {
    if (hasVault) {
      // Local vault mode - enqueue publish job
      setPublishing(true)
      try {
        const jobId = await enqueuePublish(file.path, content, metadata as Record<string, unknown>, {
          runNLP: true,
          updateEmbeddings: true,
        })
        if (jobId) {
          // Job queued successfully - also save locally
          await onSave(content, metadata)
          localStorage.removeItem(`codex-draft-${file.path}`)

          // Subscribe to publish job completion, then trigger block tagging
          const unsubscribe = subscribeToJobs((event) => {
            if (event.job.id !== jobId) return
            if (event.job.status === 'completed') {
              // Auto-run block tagging after publish
              const blockTagPayload: BlockTaggingJobPayload = {
                strandPaths: [file.path],
                useLLM: false, // Fast NLP-only by default
                recalculateWorthiness: true,
                enableBubbling: true,
                confidenceThreshold: 0.6,
              }
              enqueueJob('block-tagging', blockTagPayload).then(() => {
                refetchBlocks()
              })
              unsubscribe()
            } else if (event.job.status === 'failed') {
              unsubscribe()
            }
          })
        }
      } catch (error) {
        console.error('Failed to publish:', error)
      } finally {
        setPublishing(false)
      }
    } else {
      // No vault - fallback to GitHub PR modal
      setShowPublishModal(true)
    }
  }

  /**
   * Run block tagging for this strand
   */
  const handleRunBlockTagging = async () => {
    if (!file?.path) return
    setIsTaggingRunning(true)
    try {
      const payload: BlockTaggingJobPayload = {
        strandPaths: [file.path],
        useLLM: false, // Fast NLP-only by default
        recalculateWorthiness: true,
        enableBubbling: true,
        confidenceThreshold: 0.6,
      }
      const jobId = await enqueueJob('block-tagging', payload)

      if (jobId) {
        // Subscribe to job completion
        const unsubscribe = subscribeToJobs((event) => {
          if (event.job.id !== jobId) return
          if (event.job.status === 'completed' || event.job.status === 'failed') {
            setIsTaggingRunning(false)
            if (event.job.status === 'completed') {
              refetchBlocks()
            }
            unsubscribe()
          }
        })
      } else {
        setIsTaggingRunning(false)
      }
    } catch (error) {
      console.error('Failed to start block tagging:', error)
      setIsTaggingRunning(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Editor Container */}
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 20 }}
          className={`
            relative w-full h-full
            ${theme === 'sepia-light' ? 'bg-[#FCF9F2]' : ''}
            ${theme === 'sepia-dark' ? 'bg-[#0E0704]' : ''}
            ${theme === 'dark' ? 'bg-gray-950' : ''}
            ${theme === 'light' ? 'bg-white' : ''}
            flex flex-col
          `}
        >
          {/* Art Deco Header */}
          <header className={`
            relative px-6 py-4 flex items-center justify-between flex-shrink-0
            border-b-2 ${theme.includes('dark') ? 'border-amber-800' : 'border-amber-400'}
            bg-gradient-to-r
            ${theme === 'sepia-light' ? 'from-amber-50 to-amber-100' : ''}
            ${theme === 'sepia-dark' ? 'from-amber-950 to-amber-900' : ''}
            ${theme === 'dark' ? 'from-gray-900 to-gray-800' : ''}
            ${theme === 'light' ? 'from-gray-50 to-gray-100' : ''}
          `}>
            {/* Title */}
            <div className="flex items-center gap-4 z-10">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 0.5 }}
                className={`
                  p-2.5 rounded-xl shadow-inner
                  ${theme.includes('dark') ? 'bg-amber-900/50' : 'bg-amber-100'}
                `}
              >
                <FileText className="w-5 h-5 text-amber-700 dark:text-amber-300" />
              </motion.div>
              <div>
                <h2 className="text-xl font-bold tracking-wide">
                  {file.name}
                </h2>
                <div className="flex items-center gap-4 text-xs opacity-70">
                  <span>{wordCount} words</span>
                  <span>•</span>
                  <span>{charCount} characters</span>
                  <AnimatePresence>
                    {saved && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="flex items-center gap-1"
                      >
                        <span>•</span>
                        <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                          <motion.span
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                          >
                            <Check className="w-3 h-3" />
                          </motion.span>
                          Auto-saved
                        </span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 z-10">
              {/* Writing Timer */}
              <WritingTimerDisplay
                activeTime={activeTime}
                totalTime={activeTime}
                activeTimeFormatted={activeTimeFormatted}
                state={timerState}
                theme={theme.includes('dark') ? 'dark' : 'light'}
                compact
                onStart={startTimer}
                onPause={pauseTimer}
                onResume={resumeTimer}
                onStop={stopTimer}
                onReset={resetTimer}
              />
              <Tooltip
                content="Save Draft"
                description="Saves locally in your browser. Drafts are temporary until you Publish. Tags and intelligence don't activate until you publish."
                placement="bottom"
              >
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`
                    px-4 py-2 rounded-lg font-semibold transition-all
                    flex items-center gap-2
                    ${theme.includes('dark')
                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }
                    disabled:opacity-50
                  `}
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-500/30 border-t-gray-500 rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Draft
                    </>
                  )}
                </button>
              </Tooltip>
              <Tooltip
                content={hasVault ? "Publish to Vault" : "Publish to GitHub"}
                description={hasVault
                  ? "Writes to your vault folder and runs NLP analysis to generate tags, connections, and semantic search."
                  : "Creates a GitHub Pull Request with your changes."
                }
                placement="bottom"
              >
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className={`
                    px-4 py-2 rounded-lg font-bold transition-all
                    flex items-center gap-2 shadow-lg
                    ${theme.includes('dark')
                      ? 'bg-gradient-to-r from-amber-800 to-amber-700 hover:from-amber-700 hover:to-amber-600 text-amber-100'
                      : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white'
                    }
                    disabled:opacity-50
                  `}
                >
                  {publishing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-amber-300/30 border-t-amber-300 rounded-full animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Publish
                    </>
                  )}
                </button>
              </Tooltip>
              <button
                onClick={onClose}
                className={`
                  p-2 rounded-lg transition-colors
                  ${theme.includes('dark')
                    ? 'hover:bg-gray-800'
                    : 'hover:bg-gray-200'
                  }
                `}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Tab Bar */}
          <div className={`
            px-6 py-2 flex items-center gap-2 flex-shrink-0
            border-b ${theme.includes('dark') ? 'border-gray-800' : 'border-gray-200'}
          `}>
            {EDITOR_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-4 py-2 rounded-lg font-medium transition-all
                  flex items-center gap-2
                  ${activeTab === tab.id
                    ? theme.includes('dark')
                      ? 'bg-amber-900/30 text-amber-300 border border-amber-700'
                      : 'bg-amber-100 text-amber-700 border border-amber-300'
                    : theme.includes('dark')
                      ? 'hover:bg-gray-800 text-gray-400'
                      : 'hover:bg-gray-100 text-gray-600'
                  }
                `}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}

            <div className="flex-1" />

            {/* Media Menu Trigger */}
            <button
              onClick={() => setShowMediaMenu(true)}
              className={`
                p-2.5 rounded-full transition-all
                ${theme.includes('dark')
                  ? 'bg-gradient-to-br from-purple-900 to-pink-900 hover:from-purple-800 hover:to-pink-800'
                  : 'bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                }
                text-white shadow-lg
              `}
            >
              <Sparkles className="w-5 h-5" />
            </button>
          </div>

          {/* Toolbar - Sticky on mobile with keyboard avoidance */}
          {(activeTab === 'edit' || activeTab === 'split') && (
            <div
              className={`
                px-6 py-2 flex items-center gap-1 flex-wrap flex-shrink-0 select-none
                border-b ${theme.includes('dark') ? 'border-gray-800' : 'border-gray-200'}
                max-md:fixed max-md:left-0 max-md:right-0 max-md:bg-white max-md:dark:bg-gray-900 max-md:z-50 max-md:shadow-lg
                max-md:border-t max-md:border-b-0
                transition-[bottom] duration-150 ease-out
              `}
              style={{ bottom: isMobile ? `${keyboardOffset}px` : undefined }}
            >
              <button
                onClick={() => wrapSelection('**')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                title="Bold (Ctrl+B)"
                aria-label="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                onClick={() => wrapSelection('*')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                title="Italic (Ctrl+I)"
                aria-label="Italic"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                onClick={() => wrapSelection('`')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                title="Code"
              >
                <Code className="w-4 h-4" />
              </button>
              <button
                onClick={() => wrapSelection('[', '](url)')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                title="Link"
              >
                <Link2 className="w-4 h-4" />
              </button>
              <div className={`w-px h-6 ${theme.includes('dark') ? 'bg-gray-700' : 'bg-gray-300'}`} />
              <button
                onClick={() => insertText('\n- ')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                title="Bullet List"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertText('\n1. ')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                title="Numbered List"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertText('\n> ')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                title="Quote"
              >
                <Quote className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertText('\n---\n')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                title="Horizontal Rule"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className={`w-px h-6 ${theme.includes('dark') ? 'bg-gray-700' : 'bg-gray-300'}`} />
              <button
                onClick={() => insertText('## ')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                title="Heading 2"
              >
                <Hash className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertText('@')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                title="Mention"
              >
                <AtSign className="w-4 h-4" />
              </button>
              <div className={`w-px h-6 ${theme.includes('dark') ? 'bg-gray-700' : 'bg-gray-300'}`} />

              {/* Media Capture Buttons */}
              <button
                onClick={() => setShowCameraCapture(true)}
                className={`
                  p-2 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation
                  ${theme.includes('dark')
                    ? 'hover:bg-blue-900/30 text-blue-400'
                    : 'hover:bg-blue-100 text-blue-600'
                  }
                `}
                title="Take Photo"
                aria-label="Take Photo"
              >
                <Camera className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowVoiceRecorder(true)}
                className={`
                  p-2 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation
                  ${theme.includes('dark')
                    ? 'hover:bg-red-900/30 text-red-400'
                    : 'hover:bg-red-100 text-red-600'
                  }
                `}
                title="Record Audio"
                aria-label="Record Audio"
              >
                <Mic className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowHandwritingImport(true)}
                className={`
                  p-2 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation
                  ${theme.includes('dark')
                    ? 'hover:bg-amber-900/30 text-amber-400'
                    : 'hover:bg-amber-100 text-amber-600'
                  }
                `}
                title="Import Handwriting"
                aria-label="Import Handwriting"
              >
                <Brush className="w-4 h-4" />
              </button>
              <div className={`w-px h-6 ${theme.includes('dark') ? 'bg-gray-700' : 'bg-gray-300'}`} />
              <button
                onClick={() => setShowBlockTagsPanel(!showBlockTagsPanel)}
                className={`
                  p-2 rounded transition-colors
                  ${showBlockTagsPanel
                    ? (theme.includes('dark') ? 'bg-cyan-900/50 text-cyan-400' : 'bg-cyan-100 text-cyan-600')
                    : (theme.includes('dark') ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-200 text-gray-600')
                  }
                `}
                title="Block Tags Panel"
              >
                <Tags className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Editor Content Area */}
          <div className="flex-1 min-h-0 flex overflow-hidden">
            {/* Edit Panel */}
            {(activeTab === 'edit' || activeTab === 'split') && (
              <div
                ref={editorContainerRef}
                className={`
                  ${activeTab === 'split' ? 'w-1/2' : 'w-full'}
                  h-full min-h-0 flex flex-col overflow-hidden
                  ${activeTab === 'split' ? 'border-r' : ''}
                  ${theme.includes('dark') ? 'border-gray-800' : 'border-gray-300'}
                `}
              >
                <EditorErrorBoundary isDark={theme.includes('dark')}>
                  <TiptapEditor
                    content={content}
                    onChange={setContent}
                    theme={theme}
                    editorRef={editorRef}
                    filePath={file.path}
                    // Disable highlight creation in edit mode - highlights should only be created in reader mode
                    onCreateHighlight={undefined}
                  />
                </EditorErrorBoundary>
              </div>
            )}

            {/* Preview Panel */}
            {(activeTab === 'preview' || activeTab === 'split') && (
              <div
                ref={previewRef}
                onScroll={handlePreviewScroll}
                className={`
                  ${activeTab === 'split' ? 'w-1/2' : 'w-full'}
                  h-full min-h-0 overflow-y-auto
                  ${theme === 'sepia-light' ? 'bg-[#FBF8F0]' : ''}
                  ${theme === 'sepia-dark' ? 'bg-[#080402]' : ''}
                  ${theme === 'dark' ? 'bg-gray-950' : ''}
                  ${theme === 'light' ? 'bg-gray-50' : ''}
                `}
              >
                <article className="p-6 prose prose-sm sm:prose-base max-w-none dark:prose-invert">
                  <EditorMarkdownPreview content={stripFrontmatter(content)} />
                </article>
              </div>
            )}
          </div>

          {/* Radial Media Menu - Inline positioned at cursor */}
          <RadialMediaMenu
            isOpen={showMediaMenu}
            onClose={() => {
              setShowMediaMenu(false)
              // Restore focus to editor after menu closes
              requestAnimationFrame(() => editorRef.current?.commands.focus())
            }}
            anchorPosition={lastValidPosition || cursorPosition}
            anchorMode={cursorPosition ? 'cursor' : 'center'}
            // Note: Legacy callbacks intentionally omitted to avoid double insertion
            // All media is handled via onMediaCaptured with base64 embedding
            onInsertCode={(lang) => insertText(`\`\`\`${lang}\n\n\`\`\``)}
            onMediaCaptured={async (asset: RadialMediaAsset) => {
              // Store in IndexedDB for offline support
              try {
                await storeAsset({
                  type: asset.type as 'photo' | 'audio' | 'drawing' | 'upload',
                  blob: asset.blob,
                  filename: asset.filename,
                  path: asset.path,
                })

                // Format with base64 embedding and insert
                if (asset.type === 'audio') {
                  const result = await formatVoiceNote({
                    blob: asset.blob,
                    transcript: asset.transcript,
                    duration: asset.duration,
                    timestamp: new Date(),
                    embedBase64: true,
                  })
                  insertText(result.markdown)
                } else if (asset.type === 'photo' || asset.type === 'drawing') {
                  const result = await formatImageNote({
                    blob: asset.blob,
                    type: asset.type,
                    timestamp: new Date(),
                    embedBase64: true,
                  })
                  insertText(result.markdown)
                }
              } catch (err) {
                console.error('[StrandEditor] Failed to store media:', err)
              }
              // Also track in local state for immediate upload
              setMediaAssets(prev => [...prev, asset as MediaAsset])
            }}
            strandPath={file.path}
            theme={theme}
            isMobile={isMobile}
          />

          {/* Publish Modal */}
          <PublishModal
            isOpen={showPublishModal}
            onClose={() => {
              setShowPublishModal(false)
              // Restore focus to editor after modal closes
              requestAnimationFrame(() => editorRef.current?.commands.focus())
            }}
            filePath={file.path}
            content={content}
            metadata={metadata}
            repo={repo || {
              owner: REPO_CONFIG.OWNER,
              repo: REPO_CONFIG.NAME,
              defaultBranch: REPO_CONFIG.BRANCH,
            }}
            assets={mediaAssets}
            theme={theme}
          />

          {/* Camera Capture Modal */}
          <CameraCapture
            isOpen={showCameraCapture}
            onClose={() => {
              setShowCameraCapture(false)
              // Restore focus to editor after modal closes
              requestAnimationFrame(() => editorRef.current?.commands.focus())
            }}
            onCaptureComplete={async (blob) => {
              // Generate filename based on timestamp
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
              const filename = `photo-${timestamp}.jpg`
              const path = `assets/photos/${filename}`

              // Format with base64 embedding
              const result = await formatImageNote({
                blob,
                type: 'photo',
                timestamp: new Date(),
                embedBase64: true,
              })

              // Insert rich markdown with embedded image
              insertText(result.markdown)

              // Track blob for upload
              setMediaAssets(prev => [...prev, {
                type: 'photo',
                blob,
                filename,
                path,
              }])

              setShowCameraCapture(false)
            }}
            theme={theme}
          />

          {/* Voice Recorder Modal */}
          <VoiceRecorder
            isOpen={showVoiceRecorder}
            onClose={() => {
              setShowVoiceRecorder(false)
              // Restore focus to editor after modal closes
              requestAnimationFrame(() => editorRef.current?.commands.focus())
            }}
            onRecordingComplete={async (blob, transcript, duration, options) => {
              // Generate filename based on timestamp
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
              const filename = `voice-${timestamp}.webm`
              const path = `assets/audio/${filename}`

              // Store asset if saveOriginalAudio is enabled
              if (options?.saveOriginalAudio) {
                await storeAsset({
                  type: 'audio',
                  blob,
                  filename,
                  path,
                })
              }

              // Format with transcription - use linked path if saving original
              const result = await formatVoiceNote({
                blob,
                transcript,
                duration,
                timestamp: new Date(),
                embedBase64: !options?.saveOriginalAudio,
                linkedFilePath: options?.saveOriginalAudio ? path : undefined,
              })

              // Insert rich markdown with transcription
              insertText(result.markdown)

              // Track blob for upload (for legacy flow / debugging)
              setMediaAssets(prev => [...prev, {
                type: 'audio',
                blob,
                filename,
                path,
              }])

              setShowVoiceRecorder(false)
            }}
            theme={theme}
          />

          {/* Handwriting Import Modal */}
          <HandwritingImportModal
            isOpen={showHandwritingImport}
            onClose={() => {
              setShowHandwritingImport(false)
              // Restore focus to editor after modal closes
              requestAnimationFrame(() => editorRef.current?.commands.focus())
            }}
            onImport={(results) => {
              // Format all transcription results into markdown
              const markdown = results
                .map((r) => {
                  const confidence = Math.round(r.confidence * 100)
                  return `> **Handwriting** (${confidence}% confidence)\n>\n> ${r.text.split('\n').join('\n> ')}`
                })
                .join('\n\n')

              // Insert at cursor or append to bottom
              insertText(markdown)
              setShowHandwritingImport(false)
            }}
            insertMode="blocks"
            isDark={theme.includes('dark')}
          />
        </motion.div>
      </div>

      {/* Block Tags Sidebar Panel */}
      <BlockTagsErrorBoundary componentName="BlockTagsSidebarPanel">
        <BlockTagsSidebarPanel
          isOpen={showBlockTagsPanel}
          onClose={() => {
            setShowBlockTagsPanel(false)
            // Restore focus to editor after panel closes
            requestAnimationFrame(() => editorRef.current?.commands.focus())
          }}
          blocks={blocks}
          inlineTags={inlineTags}
          onAcceptTag={acceptTag}
          onRejectTag={rejectTag}
          isLoading={blocksLoading}
          strandPath={file.path}
          onRunTagging={handleRunBlockTagging}
          isTaggingRunning={isTaggingRunning}
          onNavigateToBlock={(blockId) => {
            // Scroll to block in the editor
            const blockElement = document.querySelector(`[data-block-id="${blockId}"]`)
            if (blockElement) {
              blockElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          }}
        />
      </BlockTagsErrorBoundary>
    </AnimatePresence>
  )
}
