/**
 * Inline Media Toolbar - Floating toolbar for inserting media
 * @module codex/ui/InlineMediaToolbar
 * 
 * @description
 * A compact floating toolbar that appears inline near the editing position.
 * Can be triggered in viewing mode (switches to edit mode on insert) or editing mode.
 * NOT an overlay - it floats within the content area.
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, X, Image, Mic, Camera, Brush, Code, 
  Type, Hash, Link, FileText, ChevronRight 
} from 'lucide-react'
import dynamic from 'next/dynamic'
import type { ThemeName } from '@/types/theme'

// Dynamic imports for heavy components
const VoiceRecorder = dynamic(() => import('../media/VoiceRecorder'), { ssr: false })
const CameraCapture = dynamic(() => import('../media/CameraCapture'), { ssr: false })
const WhiteboardCanvas = dynamic(() => import('../canvas/WhiteboardCanvas'), { ssr: false })

interface MediaAsset {
  type: 'photo' | 'audio' | 'drawing'
  blob: Blob
  filename: string
  path: string
}

interface InlineMediaToolbarProps {
  /** Whether the toolbar is expanded */
  isExpanded: boolean
  /** Toggle expand/collapse */
  onToggle: () => void
  /** Insert markdown text at cursor position */
  onInsertText: (text: string) => void
  /** Called when media is captured (for upload handling) */
  onMediaCaptured?: (asset: MediaAsset) => void
  /** Called to switch to edit mode if in view mode */
  onEnterEditMode?: () => void
  /** Whether currently in edit mode */
  isEditMode: boolean
  /** Current theme */
  theme?: ThemeName
  /** Optional position override (for positioning near cursor) */
  position?: { x: number; y: number } | null
  /** Compact mode - just show + button that expands */
  compact?: boolean
}

interface ToolbarOption {
  id: string
  label: string
  icon: React.ElementType
  color: string
  action: () => void
}

export default function InlineMediaToolbar({
  isExpanded,
  onToggle,
  onInsertText,
  onMediaCaptured,
  onEnterEditMode,
  isEditMode,
  theme = 'light',
  position = null,
  compact = true,
}: InlineMediaToolbarProps) {
  const [voiceRecorderOpen, setVoiceRecorderOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [whiteboardOpen, setWhiteboardOpen] = useState(false)
  const [showCodeLanguages, setShowCodeLanguages] = useState(false)
  
  const isDark = theme.includes('dark')
  const toolbarRef = useRef<HTMLDivElement>(null)

  // Ensure edit mode before inserting
  const handleInsert = (insertFn: () => void) => {
    if (!isEditMode && onEnterEditMode) {
      onEnterEditMode()
    }
    insertFn()
    onToggle() // Close toolbar after insert
  }

  const insertImage = () => {
    handleInsert(() => {
      onInsertText('![Image description](./assets/photos/your-image.jpg)')
    })
  }

  const insertCodeBlock = (language: string = 'typescript') => {
    handleInsert(() => {
      onInsertText(`\n\`\`\`${language}\n// Your code here\n\`\`\`\n`)
    })
    setShowCodeLanguages(false)
  }

  const insertHeading = () => {
    handleInsert(() => {
      onInsertText('\n## New Section\n')
    })
  }

  const insertLink = () => {
    handleInsert(() => {
      onInsertText('[Link text](https://example.com)')
    })
  }

  const insertTag = () => {
    handleInsert(() => {
      onInsertText('#tag ')
    })
  }

  const handleVoiceCapture = (blob: Blob) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `voice-${timestamp}.webm`
    const path = `assets/audio/${filename}`
    
    handleInsert(() => {
      onInsertText(`\n![Voice Note](./${path})\n`)
    })
    
    if (onMediaCaptured) {
      onMediaCaptured({ type: 'audio', blob, filename, path })
    }
    setVoiceRecorderOpen(false)
  }

  const handlePhotoCapture = (blob: Blob) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `photo-${timestamp}.jpg`
    const path = `assets/photos/${filename}`
    
    handleInsert(() => {
      onInsertText(`\n![Photo](./${path})\n`)
    })
    
    if (onMediaCaptured) {
      onMediaCaptured({ type: 'photo', blob, filename, path })
    }
    setCameraOpen(false)
  }

  const handleDrawingSave = (svgContent: string, pngBlob?: Blob) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `drawing-${timestamp}.svg`
    const path = `assets/drawings/${filename}`
    
    handleInsert(() => {
      onInsertText(`\n![Drawing](./${path})\n`)
    })
    
    if (onMediaCaptured) {
      const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' })
      onMediaCaptured({ type: 'drawing', blob: svgBlob, filename, path })
    }
    setWhiteboardOpen(false)
  }

  const codeLanguages = ['typescript', 'javascript', 'python', 'rust', 'go', 'bash', 'json', 'yaml', 'markdown']

  const options: ToolbarOption[] = [
    { id: 'image', label: 'Image', icon: Image, color: 'text-emerald-500', action: insertImage },
    { id: 'voice', label: 'Voice', icon: Mic, color: 'text-red-500', action: () => setVoiceRecorderOpen(true) },
    { id: 'camera', label: 'Photo', icon: Camera, color: 'text-blue-500', action: () => setCameraOpen(true) },
    { id: 'draw', label: 'Draw', icon: Brush, color: 'text-purple-500', action: () => setWhiteboardOpen(true) },
    { id: 'code', label: 'Code', icon: Code, color: 'text-amber-500', action: () => setShowCodeLanguages(!showCodeLanguages) },
    { id: 'heading', label: 'H2', icon: Type, color: 'text-zinc-500', action: insertHeading },
    { id: 'link', label: 'Link', icon: Link, color: 'text-cyan-500', action: insertLink },
    { id: 'tag', label: 'Tag', icon: Hash, color: 'text-teal-500', action: insertTag },
  ]

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        if (isExpanded) onToggle()
        setShowCodeLanguages(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isExpanded, onToggle])

  const positionStyle = position ? {
    position: 'absolute' as const,
    left: position.x,
    top: position.y,
    transform: 'translate(-50%, -100%)',
    marginTop: '-8px',
  } : {}

  return (
    <>
      <div
        ref={toolbarRef}
        className={`
          inline-flex items-center gap-1 z-30
          ${compact ? '' : 'w-full'}
        `}
        style={positionStyle}
      >
        {/* Main trigger button */}
        <motion.button
          onClick={onToggle}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`
            p-2 rounded-full shadow-lg transition-colors
            ${isExpanded
              ? isDark ? 'bg-zinc-700 text-cyan-400' : 'bg-zinc-200 text-cyan-600'
              : isDark ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-cyan-500 hover:bg-cyan-400 text-white'
            }
          `}
          title={isExpanded ? 'Close' : 'Insert media or content'}
        >
          <motion.div animate={{ rotate: isExpanded ? 45 : 0 }}>
            {isExpanded ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </motion.div>
        </motion.button>

        {/* Expanded toolbar */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, width: 0, x: -10 }}
              animate={{ opacity: 1, width: 'auto', x: 0 }}
              exit={{ opacity: 0, width: 0, x: -10 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className={`
                flex items-center gap-0.5 overflow-hidden
                rounded-full shadow-lg px-1 py-1
                ${isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'}
              `}
            >
              {options.map((option) => {
                const Icon = option.icon
                return (
                  <motion.button
                    key={option.id}
                    onClick={option.action}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className={`
                      relative p-2 rounded-full transition-colors
                      ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'}
                      ${option.color}
                    `}
                    title={option.label}
                  >
                    <Icon className="w-4 h-4" />
                    
                    {/* Code language submenu */}
                    {option.id === 'code' && showCodeLanguages && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className={`
                          absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                          rounded-lg shadow-xl border overflow-hidden min-w-[120px]
                          ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}
                        `}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {codeLanguages.map(lang => (
                          <button
                            key={lang}
                            onClick={() => insertCodeBlock(lang)}
                            className={`
                              w-full text-left px-3 py-1.5 text-xs font-mono
                              ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'}
                            `}
                          >
                            {lang}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </motion.button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* View mode hint */}
        {!isEditMode && isExpanded && (
          <span className={`text-[10px] ml-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Will enter edit mode
          </span>
        )}
      </div>

      {/* Voice Recorder Modal */}
      {voiceRecorderOpen && (
        <VoiceRecorder
          isOpen={voiceRecorderOpen}
          onClose={() => setVoiceRecorderOpen(false)}
          onRecordingComplete={handleVoiceCapture}
          theme={theme}
        />
      )}

      {/* Camera Capture Modal */}
      {cameraOpen && (
        <CameraCapture
          isOpen={cameraOpen}
          onClose={() => setCameraOpen(false)}
          onCaptureComplete={handlePhotoCapture}
          theme={theme}
        />
      )}

      {/* Whiteboard Canvas Modal */}
      {whiteboardOpen && (
        <WhiteboardCanvas
          isOpen={whiteboardOpen}
          onClose={() => setWhiteboardOpen(false)}
          onSave={handleDrawingSave}
          theme={theme}
        />
      )}
    </>
  )
}

