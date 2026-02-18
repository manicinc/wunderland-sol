/**
 * DistractionFreeEditor - Full-screen writing experience
 * @module components/quarry/ui/DistractionFreeEditor
 *
 * A distraction-free writing component with:
 * - Two modes: WYSIWYG (TiptapEditor) and Typewriter (TypewriterMode)
 * - Auto-creates draft in fabric folder on mount
 * - Auto-saves every 30 seconds
 * - ESC to save (use Exit button to leave)
 * - Minimal UI, full focus on writing
 */

'use client'

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import dynamic from 'next/dynamic'
import {
  X,
  FileText,
  Volume2,
  VolumeX,
  Clock,
  Save,
  Check,
  AlertCircle,
  PanelLeft,
  PanelRight,
  FileStack,
  Target,
  Upload,
  Undo2,
  Redo2,
  BookOpen,
  Keyboard,
  Zap,
  Type,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { saveDraft, getDraft } from '@/lib/codexDatabase'
import type { ThemeName } from '@/types/theme'
import { isDarkTheme } from '@/types/theme'
import UnifiedTypewriter from '../writing/UnifiedTypewriter'
import SprintWritingModal from '../writing/SprintWritingModal'
import { useSessionTracker } from '@/lib/focus/focusAnalytics'
import AmbienceControls, { AmbienceButton } from '../soundscapes/AmbienceControls'
import { useAmbienceSounds, SOUNDSCAPE_INFO } from '@/lib/audio/ambienceSounds'
import { useAmbienceSettings } from '@/lib/write/ambienceSettings'
import HolographicVisualizer from '../soundscapes/HolographicVisualizer'
import { CompactJukebox } from '../soundscapes/RetroJukebox'
import PaperTexture from '../misc/PaperTexture'
import { focusLineStyles } from '../tiptap/FocusLineExtension'
import { useSwipeGesture } from '../../hooks/useSwipeGesture'
import { OfflineBadge } from '../common/OfflineIndicator'
import { KeyboardShortcutsModal, useKeyboardShortcutsModal } from '../common/KeyboardShortcutsModal'
import { usePublishReminder } from '../../hooks/usePublishReminder'

// Dynamically import TiptapEditor to avoid SSR issues
const TiptapEditor = dynamic(() => import('../tiptap/TiptapEditor'), { ssr: false })

// Dynamically import PublishDashboardModal
const PublishDashboardModal = dynamic(
  () => import('@/components/publish/PublishDashboardModal').then(mod => mod.PublishDashboardModal),
  { ssr: false }
)

// ============================================================================
// TYPES
// ============================================================================

export type WritingMode = 'wysiwyg' | 'typewriter'

export interface DistractionFreeEditorProps {
  /** Existing draft ID to continue */
  draftId?: string
  /** Initial content for new drafts (e.g., from a writing prompt) */
  initialContent?: string
  /** Initial mode */
  defaultMode?: WritingMode
  /** Called when user exits */
  onExit?: (draftId: string | null) => void
  /** Called when content changes */
  onChange?: (content: string, draftId: string) => void
  /** Custom draft path */
  customPath?: string
}

interface DraftMetadata {
  createdAt: string
  mode: WritingMode
  wordCount: number
  lastSaved?: string
  // Focus analytics metadata
  writingMode?: 'typewriter' | 'wysiwyg'
  sessionDuration?: number // seconds
  wordsPerMinute?: number
  distractionCount?: number
  isDeepFocus?: boolean
  soundscape?: string
  // Categorization
  category?: 'writing' | 'notes' | 'draft'
  tags?: string[]
}

// ============================================================================
// CONSTANTS
// ============================================================================

const AUTO_SAVE_INTERVAL = 30000 // 30 seconds
const MOBILE_BREAKPOINT = 768 // px

// Custom hook for responsive behavior
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const checkMobile = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    checkMobile()
    
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  return isMobile
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function DistractionFreeEditor({
  draftId: existingDraftId,
  initialContent = '',
  defaultMode = 'typewriter',
  onExit,
  onChange,
  customPath,
}: DistractionFreeEditorProps) {
  const { resolvedTheme } = useTheme()
  const theme = (resolvedTheme || 'dark') as ThemeName
  const isDark = isDarkTheme(theme)
  const isMobile = useIsMobile()

  // State
  const [mode, setMode] = useState<WritingMode>(defaultMode)
  const [content, setContent] = useState('')
  const [draftId, setDraftId] = useState<string | null>(existingDraftId || null)
  const [draftPath, setDraftPath] = useState<string>('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [soundsEnabled, setSoundsEnabled] = useState(true)
  const [soundVolume, setSoundVolume] = useState(0.3)
  
  const [sessionStart] = useState(() => Date.now())
  const [sessionDuration, setSessionDuration] = useState(0)
  const [showLeftSidebar, setShowLeftSidebar] = useState(false)
  const [showRightSidebar, setShowRightSidebar] = useState(() => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem('dfe-right-sidebar')
    // Default to false on mobile, true on desktop
    return stored !== null ? stored === 'true' : true
  })
  const [showHolographicVisualizer, setShowHolographicVisualizer] = useState(false)
  const [visualizerExpanded, setVisualizerExpanded] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [wordGoal] = useState(500) // Default word goal
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false)
  const [showSprintModal, setShowSprintModal] = useState(false)
  const [documentTitle, setDocumentTitle] = useState('Untitled')

  // Publish reminder hook - shows toast after local saves
  const { onLocalSave: triggerPublishReminder } = usePublishReminder({
    onPublish: () => setShowPublishModal(true),
    enabled: true, // Always enabled for drafts since they're always local until published
  })

  // Auto-collapse sidebars on mobile
  useEffect(() => {
    if (isMobile) {
      setShowLeftSidebar(false)
      setShowRightSidebar(false)
    }
  }, [isMobile])

  // Ambience hook for holographic visualizer
  const {
    soundscape: currentSoundscape,
    isPlaying: ambienceIsPlaying,
    getAnalyser,
    toggle: toggleAmbience,
    setVolume: setAmbienceVolume,
  } = useAmbienceSounds()
  const audioAnalyser = getAnalyser()
  const { settings: ambienceSettings, setSetting: setAmbienceSetting } = useAmbienceSettings()

  // Focus session tracking
  const sessionTracker = useSessionTracker({
    mode: 'writing',
    writingMode: mode === 'typewriter' ? 'typewriter' : 'wysiwyg',
    autoStart: true,
    soundscape: currentSoundscape,
  })

  // Update word count in session tracker when content changes
  useEffect(() => {
    const wc = content.trim() ? content.trim().split(/\s+/).length : 0
    sessionTracker.updateWordCount(wc)
  }, [content, sessionTracker])

  // Refs
  const contentRef = useRef(content)
  const saveTimeoutRef = useRef<NodeJS.Timeout>()
  const autoSaveIntervalRef = useRef<NodeJS.Timeout>()
  
  // Keyboard shortcuts modal
  const shortcutsModal = useKeyboardShortcutsModal()
  
  // Swipe gesture for mobile sidebar toggle
  const { ref: swipeRef } = useSwipeGesture({
    onSwipeRight: () => {
      if (isMobile && !showLeftSidebar && !showRightSidebar) {
        setShowLeftSidebar(true)
      }
    },
    onSwipeLeft: () => {
      if (isMobile && !showRightSidebar && !showLeftSidebar) {
        setShowRightSidebar(true)
      } else if (showLeftSidebar) {
        setShowLeftSidebar(false)
      }
    },
    threshold: 50,
  })

  // Keep content ref updated
  useEffect(() => {
    contentRef.current = content
  }, [content])

  // Session duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionDuration(Math.floor((Date.now() - sessionStart) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [sessionStart])

  
  // Persist right sidebar preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dfe-right-sidebar', String(showRightSidebar))
    }
  }, [showRightSidebar])

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Word count
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0

  // Initialize draft on mount
  useEffect(() => {
    async function initDraft() {
      if (existingDraftId) {
        // Load existing draft
        try {
          const existing = await getDraft(existingDraftId)
          if (existing) {
            setContent(existing.content)
            setDraftPath(existing.path)
            setDraftId(existing.id)
            // Parse metadata to restore mode
            try {
              const meta = JSON.parse(existing.metadata) as DraftMetadata
              if (meta.mode) setMode(meta.mode)
            } catch {
              // Ignore metadata parse errors
            }
            return
          }
        } catch (error) {
          console.error('[DistractionFreeEditor] Failed to load draft:', error)
        }
      }

      // Create new draft
      const newId = crypto.randomUUID()
      const timestamp = Date.now()
      const date = new Date()
      const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
      const path = customPath || `weaves/fabric/untitled-${dateStr}-${timestamp}.md`

      setDraftId(newId)
      setDraftPath(path)

      // Use initialContent if provided (e.g., from a writing prompt)
      if (initialContent) {
        setContent(initialContent)
      }

      // Initial save to create the draft
      const initialWordCount = initialContent ? initialContent.trim().split(/\s+/).length : 0
      const metadata: DraftMetadata = {
        createdAt: new Date().toISOString(),
        mode,
        wordCount: initialWordCount,
      }

      await saveDraft({
        id: newId,
        type: 'strand',
        path,
        title: `Untitled - ${date.toLocaleDateString()}`,
        content: initialContent,
        metadata: JSON.stringify(metadata),
        autoSaved: true,
      })
    }

    initDraft()
  }, [existingDraftId, customPath, mode, initialContent])

  // Save draft function
  const save = useCallback(async () => {
    if (!draftId || !draftPath) return

    setSaveStatus('saving')

    try {
      const title = documentTitle || extractTitle(contentRef.current) || 'Untitled'
      const wc = contentRef.current.trim() ? contentRef.current.trim().split(/\s+/).length : 0

      // Include focus session data in metadata
      const metadata: DraftMetadata = {
        createdAt: new Date().toISOString(),
        mode,
        wordCount: wc,
        lastSaved: new Date().toISOString(),
        // Focus analytics
        writingMode: mode === 'typewriter' ? 'typewriter' : 'wysiwyg',
        sessionDuration: sessionTracker.duration,
        wordsPerMinute: sessionTracker.wpm,
        distractionCount: sessionTracker.distractionCount,
        soundscape: currentSoundscape !== 'none' ? currentSoundscape : undefined,
        // Categorization - all distraction-free writing goes to 'writing' category
        category: 'writing',
        tags: ['draft', 'focus-session'],
      }

      await saveDraft({
        id: draftId,
        type: 'strand',
        path: draftPath,
        title,
        content: contentRef.current,
        metadata: JSON.stringify(metadata),
        autoSaved: true,
      })

      setSaveStatus('saved')

      // Trigger publish reminder toast
      triggerPublishReminder()

      // Reset to idle after a moment
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('[DistractionFreeEditor] Save failed:', error)
      setSaveStatus('error')
    }
  }, [draftId, draftPath, mode, documentTitle, triggerPublishReminder])

  // Auto-save interval
  useEffect(() => {
    autoSaveIntervalRef.current = setInterval(() => {
      if (contentRef.current.trim()) {
        save()
      }
    }, AUTO_SAVE_INTERVAL)

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current)
      }
    }
  }, [save])

  // Debounced auto-save ref
  const debounceRef = useRef<NodeJS.Timeout>()

  // Handle content change with debounced auto-save
  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent)
      onChange?.(newContent, draftId || '')

      // Debounce auto-save: save 2 seconds after user stops typing
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        if (newContent.trim()) {
          save()
        }
      }, 2000)
    },
    [onChange, draftId, save]
  )

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // Handle ESC to save (without exiting)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Just save, don't exit - use the X button to exit
        save()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [save])

  // Controls are always visible now - no auto-hide behavior

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current)
    }
  }, [])

  // Handle exit - save final session data
  const handleExit = useCallback(async () => {
    // End tracking session and get final stats
    const finalSession = sessionTracker.end()

    // Final save with complete session data
    if (draftId && draftPath && contentRef.current.trim()) {
      const title = documentTitle || extractTitle(contentRef.current) || 'Untitled'
      const wc = contentRef.current.trim().split(/\s+/).length

      const metadata: DraftMetadata = {
        createdAt: new Date().toISOString(),
        mode,
        wordCount: wc,
        lastSaved: new Date().toISOString(),
        // Final session stats
        writingMode: mode === 'typewriter' ? 'typewriter' : 'wysiwyg',
        sessionDuration: finalSession?.duration || sessionTracker.duration,
        wordsPerMinute: finalSession?.wordsPerMinute || sessionTracker.wpm,
        distractionCount: finalSession?.distractionCount || sessionTracker.distractionCount,
        soundscape: currentSoundscape !== 'none' ? currentSoundscape : undefined,
        category: 'writing',
        tags: ['draft', 'focus-session'],
      }

      await saveDraft({
        id: draftId,
        type: 'strand',
        path: draftPath,
        title,
        content: contentRef.current,
        metadata: JSON.stringify(metadata),
        autoSaved: false, // Mark as intentional save
      })
    }

    onExit?.(draftId)
  }, [draftId, draftPath, mode, documentTitle, currentSoundscape, sessionTracker, onExit])

  // Toggle mode - simplified for instant switching
  const [isSwitchingMode, setIsSwitchingMode] = useState(false)

  // Toggle mode with loading state to prevent freeze appearance
  const switchToMode = useCallback((newMode: WritingMode) => {
    if (newMode === mode || isSwitchingMode) return
    setIsSwitchingMode(true)
    // Give React time to show loading state before heavy TiptapEditor mounts
    requestAnimationFrame(() => {
      setMode(newMode)
      // Clear loading state after a short delay
      setTimeout(() => setIsSwitchingMode(false), 300)
    })
  }, [mode, isSwitchingMode])

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col',
        isDark ? 'bg-zinc-950' : 'bg-zinc-50'
      )}
    >
      {/* Top bar - always visible */}
      <div
        className={cn(
          'flex-shrink-0 flex items-center justify-between px-4 py-2',
          'border-b',
          isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white/80 border-zinc-200',
          'backdrop-blur-sm'
        )}
      >
        {/* Left: Exit button + sidebar toggle */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleExit}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors',
              isDark
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200'
            )}
          >
            <X className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">Exit & Save</span>
          </button>
          <button
            onClick={() => setShowLeftSidebar(!showLeftSidebar)}
            className={cn(
              'p-2 rounded-lg transition-colors',
              showLeftSidebar
                ? isDark
                  ? 'text-amber-400 bg-zinc-800'
                  : 'text-amber-600 bg-zinc-200'
                : isDark
                ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200'
            )}
            title={showLeftSidebar ? 'Hide sidebar' : 'Show sidebar'}
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Mode toggle */}
        <div
          className={cn(
            'flex items-center gap-1 p-1 rounded-lg',
            isDark ? 'bg-zinc-800' : 'bg-zinc-200'
          )}
        >
          <button
            onClick={() => switchToMode('wysiwyg')}
            className={cn(
              'flex items-center gap-1.5 rounded-md text-sm transition-all duration-200',
              // Larger touch targets on mobile
              isMobile ? 'px-3 py-2.5' : 'px-3 py-1.5',
              mode === 'wysiwyg'
                ? isDark
                  ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30'
                  : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                : isDark
                ? 'text-zinc-500 hover:text-zinc-300'
                : 'text-zinc-500 hover:text-zinc-700'
            )}
          >
            <FileText className={cn(isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5')} />
            <span className="hidden sm:inline">WYSIWYG</span>
            <span className="sm:hidden">Rich</span>
          </button>
          <button
            onClick={() => switchToMode('typewriter')}
            className={cn(
              'flex items-center gap-1.5 rounded-md text-sm transition-all duration-200',
              // Larger touch targets on mobile
              isMobile ? 'px-3 py-2.5' : 'px-3 py-1.5',
              mode === 'typewriter'
                ? isDark
                  ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30'
                  : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                : isDark
                ? 'text-zinc-500 hover:text-zinc-300'
                : 'text-zinc-500 hover:text-zinc-700'
            )}
          >
            <Type className={cn(isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5')} />
            <span className="hidden sm:inline">Typewriter</span>
            <span className="sm:hidden">Type</span>
          </button>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {/* Sound toggle (typewriter mode only) */}
          {mode === 'typewriter' && (
            <button
              onClick={() => setSoundsEnabled(!soundsEnabled)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                soundsEnabled
                  ? isDark
                    ? 'text-amber-400 hover:bg-zinc-800'
                    : 'text-amber-600 hover:bg-zinc-200'
                  : isDark
                  ? 'text-zinc-500 hover:bg-zinc-800'
                  : 'text-zinc-400 hover:bg-zinc-200'
              )}
              title={soundsEnabled ? 'Sound on' : 'Sound off'}
            >
              {soundsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          )}

          {/* Holographic Visualizer toggle (only when ambience is playing) */}
          {ambienceIsPlaying && currentSoundscape !== 'none' && (
            <button
              onClick={() => setShowHolographicVisualizer(!showHolographicVisualizer)}
              className={cn(
                'p-2 rounded-lg transition-colors relative',
                showHolographicVisualizer
                  ? 'bg-purple-500/20 text-purple-400'
                  : isDark
                  ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                  : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200'
              )}
              title="Toggle Holographic Visualizer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="14" rx="2" />
                <path d="M12 18v3" />
                <path d="M8 21h8" />
                <path d="M7 9l3 3-3 3" />
                <path d="M14 9h3" />
                <path d="M14 15h3" />
              </svg>
              {showHolographicVisualizer && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500" />
              )}
            </button>
          )}

          {/* Ambience toggle */}
          <AmbienceButton
            isOpen={showRightSidebar}
            onClick={() => setShowRightSidebar(!showRightSidebar)}
            isDark={isDark}
          />

          {/* Offline/LLM status indicator */}
          <OfflineBadge isDark={isDark} />

          {/* Save status indicator - with animation */}
          <AnimatePresence mode="wait">
            <motion.div
              key={saveStatus}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-md',
                saveStatus === 'saving'
                  ? isDark
                    ? 'text-zinc-400 bg-zinc-800/50'
                    : 'text-zinc-500 bg-zinc-100'
                  : saveStatus === 'saved'
                  ? isDark
                    ? 'text-green-400 bg-green-500/10'
                    : 'text-green-600 bg-green-50'
                  : saveStatus === 'error'
                  ? isDark
                    ? 'text-red-400 bg-red-500/10'
                    : 'text-red-600 bg-red-50'
                  : isDark
                  ? 'text-zinc-500'
                  : 'text-zinc-400'
              )}
            >
              {saveStatus === 'saving' ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Save className="w-3.5 h-3.5" />
                  </motion.div>
                  <span className="hidden sm:inline">Saving...</span>
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </motion.div>
                  <span className="hidden sm:inline">Saved</span>
                </>
              ) : saveStatus === 'error' ? (
                <button
                  onClick={save}
                  className="flex items-center gap-1.5 hover:underline"
                  title="Click to retry"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Error - Retry</span>
                </button>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Draft</span>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>


      {/* Main editor area with sidebar */}
      <div ref={swipeRef} className="flex-1 overflow-hidden flex relative">
        {/* Mobile Backdrop for sidebars */}
        <AnimatePresence>
          {isMobile && (showLeftSidebar || showRightSidebar) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => {
                setShowLeftSidebar(false)
                setShowRightSidebar(false)
              }}
            />
          )}
        </AnimatePresence>

        {/* Left Sidebar */}
        <AnimatePresence>
          {showLeftSidebar && (
            <motion.div
              initial={isMobile ? { x: -300, opacity: 0 } : { width: 0, opacity: 0 }}
              animate={isMobile ? { x: 0, opacity: 1 } : { width: 280, opacity: 1 }}
              exit={isMobile ? { x: -300, opacity: 0 } : { width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className={cn(
                'overflow-hidden border-r',
                isMobile 
                  ? 'fixed left-0 top-0 bottom-0 z-50 w-[280px]' 
                  : 'flex-shrink-0',
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
              )}
            >
              {/* Close button for mobile */}
              {isMobile && (
                <button
                  onClick={() => setShowLeftSidebar(false)}
                  className={cn(
                    'absolute top-3 right-3 p-2 rounded-lg z-10 transition-colors',
                    isDark 
                      ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' 
                      : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200'
                  )}
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              <div className="w-[280px] h-full overflow-y-auto p-4 space-y-6">
                {/* Session Stats */}
                <div className="space-y-3">
                  <h3 className={cn(
                    'text-xs font-semibold uppercase tracking-wider',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}>
                    Session
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={cn(
                      'p-3 rounded-lg',
                      isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'
                    )}>
                      <div className={cn(
                        'text-2xl font-bold tabular-nums',
                        isDark ? 'text-zinc-200' : 'text-zinc-800'
                      )}>
                        {wordCount.toLocaleString()}
                      </div>
                      <div className={cn(
                        'text-xs',
                        isDark ? 'text-zinc-500' : 'text-zinc-400'
                      )}>
                        Words
                      </div>
                    </div>
                    <div className={cn(
                      'p-3 rounded-lg',
                      isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'
                    )}>
                      <div className={cn(
                        'text-2xl font-bold tabular-nums',
                        isDark ? 'text-zinc-200' : 'text-zinc-800'
                      )}>
                        {formatDuration(sessionDuration)}
                      </div>
                      <div className={cn(
                        'text-xs',
                        isDark ? 'text-zinc-500' : 'text-zinc-400'
                      )}>
                        Time
                      </div>
                    </div>
                  </div>
                </div>

                {/* Writing Goal */}
                <div className="space-y-3">
                  <h3 className={cn(
                    'text-xs font-semibold uppercase tracking-wider',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}>
                    Daily Goal
                  </h3>
                  <div className={cn(
                    'p-3 rounded-lg',
                    isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn(
                        'text-sm font-medium',
                        isDark ? 'text-zinc-300' : 'text-zinc-600'
                      )}>
                        {Math.min(wordCount, 500)} / 500 words
                      </span>
                      <Target className={cn(
                        'w-4 h-4',
                        wordCount >= 500
                          ? 'text-green-500'
                          : isDark ? 'text-zinc-500' : 'text-zinc-400'
                      )} />
                    </div>
                    <div className={cn(
                      'h-2 rounded-full overflow-hidden',
                      isDark ? 'bg-zinc-700' : 'bg-zinc-200'
                    )}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((wordCount / 500) * 100, 100)}%` }}
                        transition={{ duration: 0.3 }}
                        className={cn(
                          'h-full rounded-full',
                          wordCount >= 500
                            ? 'bg-green-500'
                            : 'bg-gradient-to-r from-amber-500 to-orange-500'
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-3">
                  <h3 className={cn(
                    'text-xs font-semibold uppercase tracking-wider',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}>
                    Quick Actions
                  </h3>
                  <div className="space-y-1">
                    <button
                      onClick={save}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                        isDark
                          ? 'hover:bg-zinc-800 text-zinc-300'
                          : 'hover:bg-zinc-100 text-zinc-600'
                      )}
                    >
                      <Save className="w-4 h-4" />
                      Save Now
                    </button>
                    <button
                      onClick={async () => {
                        await save()
                        setShowPublishModal(true)
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                        isDark
                          ? 'hover:bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                          : 'hover:bg-amber-50 text-amber-600 hover:bg-amber-100'
                      )}
                    >
                      <Upload className="w-4 h-4" />
                      Publish
                    </button>
                    <button
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                        isDark
                          ? 'hover:bg-zinc-800 text-zinc-300'
                          : 'hover:bg-zinc-100 text-zinc-600'
                      )}
                    >
                      <FileStack className="w-4 h-4" />
                      View All Drafts
                    </button>
                    <button
                      onClick={() => setShowSprintModal(true)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                        isDark
                          ? 'hover:bg-orange-500/10 text-orange-400'
                          : 'hover:bg-orange-50 text-orange-600'
                      )}
                    >
                      <Zap className="w-4 h-4" />
                      Writing Sprint
                    </button>
                  </div>
                </div>

                {/* Draft Info */}
                <div className="space-y-3">
                  <h3 className={cn(
                    'text-xs font-semibold uppercase tracking-wider',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}>
                    This Draft
                  </h3>
                  <div className={cn(
                    'text-xs space-y-1',
                    isDark ? 'text-zinc-400' : 'text-zinc-500'
                  )}>
                    <div className="truncate" title={draftPath}>
                      📄 {draftPath.split('/').pop()}
                    </div>
                    {saveStatus === 'saved' && (
                      <div className="text-green-500">
                        ✓ Saved
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Editor content area */}
        <div className="flex-1 overflow-hidden relative">

          {/* Loading overlay when switching modes */}
          <AnimatePresence>
            {isSwitchingMode && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                  'absolute inset-0 z-20 flex items-center justify-center backdrop-blur-sm',
                  isDark ? 'bg-zinc-950/80' : 'bg-white/80'
                )}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)', borderTopColor: 'transparent' }}
                  />
                  <span className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                    Loading editor...
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        {/* Editor content with fade transition */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {mode === 'typewriter' ? (
              <div className="h-full overflow-auto relative">
                <UnifiedTypewriter
                  initialContent={content}
                  title={documentTitle}
                  onTitleChange={setDocumentTitle}
                  placeholder="Begin typing..."
                  onChange={handleContentChange}
                  soundsEnabled={soundsEnabled}
                  soundVolume={soundVolume}
                  autoFocus
                  className="min-h-full"
                />

                {/* Floating Typewriter Controls - centered in content area */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'fixed bottom-20 z-40',
                    'flex items-center gap-3 px-4 py-2 rounded-full shadow-xl border',
                    isDark ? 'bg-zinc-900/95 border-zinc-700' : 'bg-white/95 border-zinc-200',
                    'backdrop-blur-sm'
                  )}
                  style={{
                    // Center in the content area, accounting for sidebars
                    left: `calc(50% + ${(showLeftSidebar ? 140 : 0) - (showRightSidebar ? 140 : 0)}px)`,
                    transform: 'translateX(-50%)',
                  }}
                >
                  {/* Undo/Redo */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => document.execCommand('undo')}
                      className={cn(
                        'p-2 rounded-lg transition-colors touch-manipulation',
                        isDark
                          ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                          : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
                      )}
                      title="Undo (⌘Z)"
                    >
                      <Undo2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => document.execCommand('redo')}
                      className={cn(
                        'p-2 rounded-lg transition-colors touch-manipulation',
                        isDark
                          ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                          : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
                      )}
                      title="Redo (⌘⇧Z)"
                    >
                      <Redo2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Divider */}
                  <div className={cn('w-px h-6', isDark ? 'bg-zinc-700' : 'bg-zinc-300')} />

                  {/* Word Goal Progress */}
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-start">
                      <span className={cn(
                        'text-xs font-medium tabular-nums',
                        wordCount >= wordGoal
                          ? 'text-green-500'
                          : isDark ? 'text-zinc-300' : 'text-zinc-600'
                      )}>
                        {wordCount} / {wordGoal}
                      </span>
                      <div className={cn(
                        'w-20 h-1.5 rounded-full overflow-hidden',
                        isDark ? 'bg-zinc-700' : 'bg-zinc-200'
                      )}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((wordCount / wordGoal) * 100, 100)}%` }}
                          transition={{ duration: 0.3 }}
                          className={cn(
                            'h-full rounded-full',
                            wordCount >= wordGoal
                              ? 'bg-green-500'
                              : 'bg-gradient-to-r from-amber-500 to-orange-500'
                          )}
                        />
                      </div>
                    </div>
                    {wordCount >= wordGoal && (
                      <Target className="w-4 h-4 text-green-500" />
                    )}
                  </div>

                  {/* Divider */}
                  <div className={cn('w-px h-6', isDark ? 'bg-zinc-700' : 'bg-zinc-300')} />

                  {/* Reading time estimate */}
                  <div className={cn(
                    'flex items-center gap-1.5 text-xs',
                    isDark ? 'text-zinc-400' : 'text-zinc-500'
                  )}>
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{Math.max(1, Math.ceil(wordCount / 200))} min read</span>
                  </div>

                  {/* Keyboard shortcut hint */}
                  <button
                    onClick={shortcutsModal.open}
                    className={cn(
                      'p-2 rounded-lg transition-colors touch-manipulation',
                      isDark
                        ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                        : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
                    )}
                    title="Keyboard shortcuts (?)"
                  >
                    <Keyboard className="w-4 h-4" />
                  </button>
                </motion.div>
              </div>
            ) : (
              <div className="h-full overflow-auto px-8 py-16">
                <PaperTexture
                  theme={theme}
                  showTexture={true}
                  showShadow={true}
                  showMargins={false}
                  maxWidth="lg"
                  className="focus-mode-active"
                >
                  <Suspense fallback={
                    <div className="flex items-center justify-center p-8 animate-pulse">
                      <div className="text-zinc-500">Loading editor...</div>
                    </div>
                  }>
                    <TiptapEditor
                    content={content}
                    onChange={handleContentChange}
                    theme={theme}
                    variant="minimal"
                  />
                  </Suspense>
                </PaperTexture>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        </div>

        {/* Right Sidebar - Ambience Controls */}
        <AnimatePresence>
          {showRightSidebar && (
            <motion.div
              initial={isMobile ? { x: 280, opacity: 0 } : { width: 0, opacity: 0 }}
              animate={isMobile ? { x: 0, opacity: 1 } : { width: 280, opacity: 1 }}
              exit={isMobile ? { x: 280, opacity: 0 } : { width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className={cn(
                'overflow-hidden border-l relative',
                isMobile
                  ? 'fixed right-0 top-16 bottom-0 z-50 w-[280px]'
                  : 'flex-shrink-0',
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
              )}
            >
              {/* Collapse button - visible on desktop, close button on mobile */}
              <button
                onClick={() => setShowRightSidebar(false)}
                className={cn(
                  'absolute top-3 z-10 p-1.5 rounded-lg transition-colors',
                  isMobile ? 'left-3' : 'left-2',
                  isDark
                    ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                    : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
                )}
                title="Collapse sidebar"
              >
                {isMobile ? <X className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              <div className={cn("w-[280px] h-full overflow-y-auto flex flex-col", isMobile ? "pt-12" : "pt-8")}>
                {/* Top Widget: Clock */}
                <div className="flex justify-center mb-6">
                  <CompactClock isDark={isDark} />
                </div>

                {/* Ambience Section - Clean minimal design */}
                <div className="px-4 mb-6">
                  <CompactJukebox
                    nowPlaying={ambienceIsPlaying ? SOUNDSCAPE_INFO[currentSoundscape].name : 'Select a Track'}
                    isPlaying={ambienceIsPlaying}
                    analyser={audioAnalyser}
                    volume={ambienceSettings.volume}
                    onTogglePlay={toggleAmbience}
                    onVolumeChange={(v) => {
                      setAmbienceVolume(v)
                      setAmbienceSetting('volume', v)
                    }}
                    isDark={isDark}
                  />
                </div>

                {/* Spacer - pushes session stats to bottom */}
                <div className="flex-1 min-h-8" />

                {/* Bottom Widget: Session Stats */}
                <div className={cn(
                  'mx-4 mb-4 p-4 rounded-xl',
                  isDark ? 'bg-zinc-800/30' : 'bg-zinc-100/50'
                )}>
                  <p className={cn(
                    'text-[10px] font-medium uppercase tracking-wider mb-3 text-center',
                    isDark ? 'text-zinc-600' : 'text-zinc-400'
                  )}>
                    Session
                  </p>
                  <div className="flex items-center justify-center gap-8">
                    <div className="text-center">
                      <p className={cn(
                        'text-2xl font-light tabular-nums',
                        isDark ? 'text-zinc-200' : 'text-zinc-700'
                      )}>
                        {wordCount}
                      </p>
                      <p className={cn('text-[10px]', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                        words
                      </p>
                    </div>
                    <div className={cn('w-px h-8', isDark ? 'bg-zinc-700' : 'bg-zinc-300')} />
                    <div className="text-center">
                      <p className={cn(
                        'text-2xl font-light tabular-nums',
                        isDark ? 'text-zinc-200' : 'text-zinc-700'
                      )}>
                        {formatDuration(sessionDuration)}
                      </p>
                      <p className={cn('text-[10px]', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                        time
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed sidebar expand button - shown when sidebar is hidden */}
        <AnimatePresence>
          {!showRightSidebar && !isMobile && (
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onClick={() => setShowRightSidebar(true)}
              className={cn(
                'absolute right-0 top-1/2 -translate-y-1/2 z-30',
                'p-1.5 rounded-l-lg border-l border-y transition-colors',
                isDark
                  ? 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                  : 'bg-white border-zinc-200 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50'
              )}
              title="Expand sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Focus line styles */}
      <style jsx global>{focusLineStyles}</style>

      {/* Bottom status bar - always visible */}
      <div
        className={cn(
          'flex-shrink-0 flex items-center justify-center px-4 py-2',
          'border-t',
          isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white/80 border-zinc-200',
          'backdrop-blur-sm',
          // Stack vertically on mobile
          isMobile ? 'flex-wrap gap-2' : 'gap-6'
        )}
      >
        {/* Word count */}
        <div
          className={cn(
            'flex items-center gap-1.5 text-sm',
            isDark ? 'text-zinc-400' : 'text-zinc-500'
          )}
        >
          <span className="tabular-nums font-medium">{wordCount.toLocaleString()}</span>
          <span className="hidden sm:inline">word{wordCount !== 1 ? 's' : ''}</span>
          <span className="sm:hidden">w</span>
        </div>

        {/* Divider - hidden on mobile */}
        <div className={cn('w-px h-4 hidden sm:block', isDark ? 'bg-zinc-700' : 'bg-zinc-300')} />

        {/* Session timer */}
        <div
          className={cn(
            'flex items-center gap-1.5 text-sm',
            isDark ? 'text-zinc-400' : 'text-zinc-500'
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          <span className="tabular-nums">{formatDuration(sessionDuration)}</span>
        </div>

        {/* Divider - hidden on mobile */}
        <div className={cn('w-px h-4 hidden sm:block', isDark ? 'bg-zinc-700' : 'bg-zinc-300')} />

        {/* Quick Sprint Toggle */}
        <button
          onClick={() => setShowSprintModal(true)}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-colors',
            isDark
              ? 'text-orange-400 hover:bg-orange-500/10'
              : 'text-orange-600 hover:bg-orange-50'
          )}
          title="Start timed writing sprint"
        >
          <Zap className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sprint</span>
        </button>

        {/* Divider - hidden on mobile */}
        <div className={cn('w-px h-4 hidden sm:block', isDark ? 'bg-zinc-700' : 'bg-zinc-300')} />

        {/* Draft path - hidden on mobile */}
        <div
          className={cn(
            'text-xs truncate max-w-[200px] hidden sm:block',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}
          title={draftPath}
        >
          {draftPath.split('/').pop()}
        </div>
      </div>

      {/* Holographic Visualizer - External tablet-like display */}
      <HolographicVisualizer
        isOpen={showHolographicVisualizer && ambienceIsPlaying}
        onClose={() => setShowHolographicVisualizer(false)}
        soundscape={currentSoundscape}
        isPlaying={ambienceIsPlaying}
        analyser={audioAnalyser}
        isDark={isDark}
        anchorRight={showRightSidebar ? 280 : 0}
        expanded={visualizerExpanded}
        onToggleExpanded={() => setVisualizerExpanded(!visualizerExpanded)}
      />

      {/* Publish Dashboard Modal */}
      <PublishDashboardModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={shortcutsModal.isOpen}
        onClose={shortcutsModal.close}
        context="editor"
        isDark={isDark}
      />

      {/* Sprint Writing Modal */}
      <SprintWritingModal
        isOpen={showSprintModal}
        onClose={() => setShowSprintModal(false)}
        currentWordCount={wordCount}
        isDark={isDark}
      />
    </div>
  )
}

// ============================================================================
// COMPACT CLOCK COMPONENT
// ============================================================================

function CompactClock({ isDark }: { isDark: boolean }) {
  const [time, setTime] = React.useState(new Date())

  React.useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const hours = time.getHours()
  const minutes = time.getMinutes()
  const seconds = time.getSeconds()
  const hourAngle = (hours % 12) * 30 + minutes * 0.5
  const minuteAngle = minutes * 6

  return (
    <div className="flex items-center gap-4">
      {/* Mini analog clock */}
      <svg viewBox="0 0 60 60" className="w-14 h-14">
        {/* Clock face */}
        <circle
          cx="30" cy="30" r="28"
          fill={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
          stroke={isDark ? 'rgba(139,92,246,0.3)' : 'rgba(99,102,241,0.3)'}
          strokeWidth="1.5"
        />
        {/* Hour markers */}
        {[...Array(12)].map((_, i) => (
          <line
            key={i}
            x1="30" y1="6" x2="30" y2={i % 3 === 0 ? "10" : "8"}
            stroke={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
            strokeWidth={i % 3 === 0 ? "1.5" : "1"}
            transform={`rotate(${i * 30} 30 30)`}
          />
        ))}
        {/* Hour hand */}
        <line
          x1="30" y1="30" x2="30" y2="16"
          stroke={isDark ? '#a78bfa' : '#6366f1'}
          strokeWidth="2.5"
          strokeLinecap="round"
          transform={`rotate(${hourAngle} 30 30)`}
        />
        {/* Minute hand */}
        <line
          x1="30" y1="30" x2="30" y2="10"
          stroke={isDark ? '#c4b5fd' : '#818cf8'}
          strokeWidth="1.5"
          strokeLinecap="round"
          transform={`rotate(${minuteAngle} 30 30)`}
        />
        {/* Center dot */}
        <circle cx="30" cy="30" r="2" fill={isDark ? '#a78bfa' : '#6366f1'} />
      </svg>

      {/* Digital time */}
      <div className="flex flex-col">
        <span className={cn(
          'text-2xl font-light tabular-nums tracking-tight',
          isDark ? 'text-white/90' : 'text-zinc-800'
        )}>
          {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
        </span>
        <span className={cn(
          'text-xs tabular-nums',
          isDark ? 'text-zinc-500' : 'text-zinc-400'
        )}>
          :{seconds.toString().padStart(2, '0')}
        </span>
      </div>
    </div>
  )
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Extract title from content (first heading or first line)
 */
function extractTitle(content: string): string | null {
  if (!content.trim()) return null

  // Try to find first heading
  const headingMatch = content.match(/^#+ (.+)$/m)
  if (headingMatch) return headingMatch[1].trim()

  // Fall back to first non-empty line
  const firstLine = content.split('\n').find((line) => line.trim())
  if (firstLine) return firstLine.trim().slice(0, 50)

  return null
}
