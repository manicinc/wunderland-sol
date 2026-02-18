/**
 * WriterWidget - Embeddable WYSIWYG Editor Widget
 * @module components/quarry/ui/writer/WriterWidget
 *
 * A full-featured, resizable WYSIWYG editor widget for FOCUS mode.
 * Supports draft auto-saving, publishing to strands, and location selection.
 */

'use client'

import React, { useState, useCallback, useRef, Suspense, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import {
  PenLine,
  Save,
  Send,
  ChevronDown,
  Inbox,
  FolderOpen,
  Maximize2,
  Minimize2,
  X,
  Check,
  Clock,
  FileText,
  Sparkles,
  MoreHorizontal,
  Settings,
  Trash2,
  History,
  Cloud,
  CloudOff,
} from 'lucide-react'
import { useWriterDraft, useWriterPublish, useWriterLocation } from './hooks'
import type { ThemeName } from '@/types/theme'

// ============================================================================
// DYNAMIC IMPORTS
// ============================================================================

const TiptapEditor = dynamic(
  () => import('../tiptap/TiptapEditor'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  }
)

const LocationPickerSidebar = dynamic(
  () => import('../misc/LocationPickerSidebar'),
  { ssr: false }
)

// ============================================================================
// TYPES
// ============================================================================

export interface WriterWidgetProps {
  /** Widget size mode */
  size?: 'compact' | 'normal' | 'expanded' | 'fullscreen'
  /** Initial draft ID to load */
  draftId?: string
  /** Initial content */
  initialContent?: string
  /** Current theme */
  theme?: ThemeName
  /** Custom target path */
  customPath?: string
  /** Callback when widget should close */
  onClose?: () => void
  /** Callback when content changes */
  onChange?: (content: string, draftId: string | null) => void
  /** Callback when draft is saved */
  onSave?: (draftId: string) => void
  /** Callback when published */
  onPublish?: (strandPath: string) => void
  /** Whether to show header */
  showHeader?: boolean
  /** Whether resizing is enabled */
  resizable?: boolean
  /** Minimum height */
  minHeight?: number
  /** Maximum height */
  maxHeight?: number
  /** Custom class name */
  className?: string
}

type WidgetHeight = 'compact' | 'normal' | 'expanded'

// ============================================================================
// CONSTANTS
// ============================================================================

const HEIGHT_PRESETS: Record<WidgetHeight, number> = {
  compact: 200,
  normal: 400,
  expanded: 600,
}

// ============================================================================
// SUPPORTING COMPONENTS
// ============================================================================

interface SaveStatusIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error'
  lastSavedAt: Date | null
  isDark: boolean
}

function SaveStatusIndicator({ status, lastSavedAt, isDark }: SaveStatusIndicatorProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'saving':
        return <Cloud className="w-3.5 h-3.5 animate-pulse" />
      case 'saved':
        return <Check className="w-3.5 h-3.5 text-emerald-500" />
      case 'error':
        return <CloudOff className="w-3.5 h-3.5 text-red-500" />
      default:
        return null
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'saving':
        return 'Saving...'
      case 'saved':
        return lastSavedAt
          ? `Saved ${formatTimeAgo(lastSavedAt)}`
          : 'Saved'
      case 'error':
        return 'Save failed'
      default:
        return null
    }
  }

  const statusText = getStatusText()
  if (!statusText && status === 'idle') return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`
        flex items-center gap-1.5 text-xs
        ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
      `}
    >
      {getStatusIcon()}
      <span>{statusText}</span>
    </motion.div>
  )
}

interface LocationButtonProps {
  path: string
  onClick: () => void
  isDark: boolean
  disabled?: boolean
}

function LocationButton({ path, onClick, isDark, disabled }: LocationButtonProps) {
  // Extract display name from path
  const displayName = useMemo(() => {
    const parts = path.split('/').filter(Boolean)
    return parts[parts.length - 1] || 'Select location'
  }, [path])

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium
        transition-all duration-200
        ${isDark
          ? 'bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50'
          : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <FolderOpen className="w-3.5 h-3.5" />
      <span className="truncate max-w-[120px]">{displayName}</span>
      <ChevronDown className="w-3 h-3 opacity-60" />
    </button>
  )
}

interface QuickActionsDropdownProps {
  onClear: () => void
  onViewDrafts: () => void
  isDark: boolean
}

function QuickActionsDropdown({ onClear, onViewDrafts, isDark }: QuickActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          p-1.5 rounded-lg transition-colors
          ${isDark
            ? 'hover:bg-zinc-700/50 text-zinc-400'
            : 'hover:bg-zinc-100 text-zinc-500'
          }
        `}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15 }}
              className={`
                absolute right-0 top-full mt-1 z-20 min-w-[160px]
                rounded-lg shadow-xl border overflow-hidden
                ${isDark
                  ? 'bg-zinc-800 border-zinc-700'
                  : 'bg-white border-zinc-200'
                }
              `}
            >
              <button
                onClick={() => {
                  onViewDrafts()
                  setIsOpen(false)
                }}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 text-sm text-left
                  transition-colors
                  ${isDark
                    ? 'hover:bg-zinc-700/50 text-zinc-300'
                    : 'hover:bg-zinc-50 text-zinc-700'
                  }
                `}
              >
                <History className="w-4 h-4" />
                View Drafts
              </button>
              <button
                onClick={() => {
                  onClear()
                  setIsOpen(false)
                }}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 text-sm text-left
                  transition-colors text-red-500
                  ${isDark ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-50'}
                `}
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)

  if (diffSecs < 30) return 'just now'
  if (diffSecs < 60) return `${diffSecs}s ago`
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return date.toLocaleDateString()
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WriterWidget({
  size = 'normal',
  draftId,
  initialContent = '',
  theme = 'light',
  customPath,
  onClose,
  onChange,
  onSave,
  onPublish,
  showHeader = true,
  resizable = true,
  minHeight = 150,
  maxHeight = 800,
  className = '',
}: WriterWidgetProps) {
  const isDark = theme.includes('dark')
  
  // State
  const [isFullscreen, setIsFullscreen] = useState(size === 'fullscreen')
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [currentHeight, setCurrentHeight] = useState<WidgetHeight>('normal')
  const containerRef = useRef<HTMLDivElement>(null)

  // Hooks
  const draft = useWriterDraft({
    existingDraftId: draftId,
    initialContent,
    customPath,
    onChange,
    onSave,
  })

  const publish = useWriterPublish()

  const location = useWriterLocation({
    initialPath: customPath || 'weaves/inbox/',
    enableAutoCategorize: true,
    onPathChange: (path) => draft.setTargetPath(path),
  })

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleContentChange = useCallback((newContent: string) => {
    draft.setContent(newContent)
    
    // Trigger location suggestion after content changes
    if (location.autoCategorize && newContent.length > 50) {
      location.suggestPathForContent(newContent)
    }
  }, [draft, location])

  const handleSave = useCallback(async () => {
    await draft.save()
  }, [draft])

  const handlePublish = useCallback(async () => {
    const result = await publish.publish({
      content: draft.content,
      targetPath: location.selectedPath,
      title: draft.title,
    })

    if (result.success && result.strandPath) {
      onPublish?.(result.strandPath)
      // Clear after publish
      draft.clear()
    }
  }, [publish, draft, location.selectedPath, onPublish])

  const handleQuickPublish = useCallback(async () => {
    const result = await publish.quickPublish(draft.content, location.selectedPath)
    
    if (result.success && result.strandPath) {
      onPublish?.(result.strandPath)
      draft.clear()
    }
  }, [publish, draft.content, location.selectedPath, onPublish, draft])

  const handleClear = useCallback(() => {
    if (draft.isDirty) {
      // Could show confirmation dialog
      draft.save().then(() => draft.clear())
    } else {
      draft.clear()
    }
  }, [draft])

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev)
  }, [])

  const cycleHeight = useCallback(() => {
    setCurrentHeight(prev => {
      if (prev === 'compact') return 'normal'
      if (prev === 'normal') return 'expanded'
      return 'compact'
    })
  }, [])

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const containerStyles = useMemo(() => {
    if (isFullscreen) {
      return {
        position: 'fixed' as const,
        inset: 0,
        zIndex: 50,
      }
    }
    return {
      height: HEIGHT_PRESETS[currentHeight],
      minHeight,
      maxHeight,
    }
  }, [isFullscreen, currentHeight, minHeight, maxHeight])

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <motion.div
      ref={containerRef}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      style={containerStyles}
      className={`
        flex flex-col overflow-hidden rounded-xl
        ${isDark
          ? 'bg-zinc-900/95 border border-zinc-800'
          : 'bg-white/95 border border-zinc-200'
        }
        ${isFullscreen ? 'rounded-none border-0' : 'shadow-2xl backdrop-blur-xl'}
        ${resizable && !isFullscreen ? 'resize-y' : ''}
        ${className}
      `}
    >
      {/* Header */}
      {showHeader && (
        <div
          className={`
            flex items-center justify-between px-4 py-2.5
            border-b flex-shrink-0
            ${isDark ? 'border-zinc-800' : 'border-zinc-100'}
          `}
        >
          {/* Left Section */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <PenLine className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
              <span className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                Quick Writer
              </span>
            </div>

            {/* Word Count */}
            <div className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {draft.wordCount} words
            </div>

            {/* Save Status */}
            <SaveStatusIndicator
              status={draft.saveStatus}
              lastSavedAt={draft.lastSavedAt}
              isDark={isDark}
            />
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {/* Location Button */}
            <LocationButton
              path={location.selectedPath}
              onClick={() => setShowLocationPicker(true)}
              isDark={isDark}
            />

            {/* AI Suggestion Badge */}
            <AnimatePresence>
              {location.suggestedPath && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => location.applySuggestion()}
                  className={`
                    flex items-center gap-1 px-2 py-1 rounded-full text-xs
                    ${isDark
                      ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                      : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    }
                  `}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Suggested</span>
                </motion.button>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex items-center gap-1 pl-2 border-l border-zinc-200 dark:border-zinc-700">
              {/* Save */}
              <button
                onClick={handleSave}
                disabled={!draft.isDirty || draft.saveStatus === 'saving'}
                title="Save draft (Cmd+S)"
                className={`
                  p-1.5 rounded-lg transition-colors
                  ${draft.isDirty
                    ? isDark
                      ? 'text-cyan-400 hover:bg-cyan-500/20'
                      : 'text-cyan-600 hover:bg-cyan-50'
                    : isDark
                      ? 'text-zinc-600'
                      : 'text-zinc-300'
                  }
                `}
              >
                <Save className="w-4 h-4" />
              </button>

              {/* Publish */}
              <button
                onClick={handlePublish}
                disabled={!draft.content.trim() || publish.isPublishing}
                title="Publish strand"
                className={`
                  p-1.5 rounded-lg transition-colors
                  ${draft.content.trim()
                    ? isDark
                      ? 'text-emerald-400 hover:bg-emerald-500/20'
                      : 'text-emerald-600 hover:bg-emerald-50'
                    : isDark
                      ? 'text-zinc-600'
                      : 'text-zinc-300'
                  }
                `}
              >
                <Send className="w-4 h-4" />
              </button>

              {/* More Actions */}
              <QuickActionsDropdown
                onClear={handleClear}
                onViewDrafts={() => {/* TODO: Open drafts panel */}}
                isDark={isDark}
              />

              {/* Size Toggle */}
              {resizable && !isFullscreen && (
                <button
                  onClick={cycleHeight}
                  title="Change size"
                  className={`
                    p-1.5 rounded-lg transition-colors
                    ${isDark
                      ? 'text-zinc-500 hover:bg-zinc-700/50'
                      : 'text-zinc-400 hover:bg-zinc-100'
                    }
                  `}
                >
                  {currentHeight === 'expanded' ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>
              )}

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                className={`
                  p-1.5 rounded-lg transition-colors
                  ${isDark
                    ? 'text-zinc-500 hover:bg-zinc-700/50'
                    : 'text-zinc-400 hover:bg-zinc-100'
                  }
                `}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>

              {/* Close */}
              {onClose && (
                <button
                  onClick={onClose}
                  title="Close"
                  className={`
                    p-1.5 rounded-lg transition-colors
                    ${isDark
                      ? 'text-zinc-500 hover:bg-zinc-700/50 hover:text-red-400'
                      : 'text-zinc-400 hover:bg-zinc-100 hover:text-red-500'
                    }
                  `}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Editor Area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Location Picker Sidebar */}
        <AnimatePresence>
          {showLocationPicker && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 224, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 overflow-hidden"
            >
              <Suspense fallback={<div className="w-56 h-full bg-zinc-100 dark:bg-zinc-800 animate-pulse" />}>
                <LocationPickerSidebar
                  targetPath={location.selectedPath}
                  onSelectPath={(path) => {
                    location.selectPath(path)
                    setShowLocationPicker(false)
                  }}
                  isDark={isDark}
                  onCreateLoom={async (parentPath, name) => {
                    await location.createLoom(parentPath, name)
                  }}
                  onCreateWeave={async (name) => {
                    await location.createWeave(name)
                  }}
                  suggestedPath={location.suggestedPath || undefined}
                  suggestionReason={location.suggestionReason || undefined}
                  showAutoCategorize
                  autoCategorize={location.autoCategorize}
                  onToggleAutoCategorize={location.setAutoCategorize}
                />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Editor */}
        <div className="flex-1 min-w-0 overflow-auto">
          <div
            className={`
              h-full px-6 py-4
              ${isDark ? 'bg-zinc-900' : 'bg-white'}
            `}
          >
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                </div>
              }
            >
              <TiptapEditor
                content={draft.content}
                onChange={handleContentChange}
                theme={theme}
                variant="minimal"
              />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Footer Status Bar */}
      {publish.isPublishing && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className={`
            px-4 py-2 border-t
            ${isDark ? 'border-zinc-800 bg-zinc-900/80' : 'border-zinc-100 bg-zinc-50'}
          `}
        >
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            <span className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {publish.statusMessage || 'Publishing...'}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${publish.publishProgress}%` }}
                className="h-full bg-cyan-500 rounded-full"
              />
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

// Named export
export { WriterWidget }

