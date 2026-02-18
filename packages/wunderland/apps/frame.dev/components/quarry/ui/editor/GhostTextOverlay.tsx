/**
 * Ghost Text Overlay for AI Writing Suggestions
 * @module codex/ui/GhostTextOverlay
 * 
 * @description
 * Displays AI-generated suggestions as ghost text that can be accepted (Tab)
 * or dismissed (Esc). Positioned relative to cursor in TipTap editor.
 */

'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Editor } from '@tiptap/react'
import { 
  getWritingAssistant, 
  createWritingContext,
  type WritingSuggestion,
} from '@/lib/ai/writingAssistant'
import { getAIPreferences, type AIFeatureStatus } from '@/lib/ai'

interface GhostTextOverlayProps {
  /** TipTap editor instance */
  editor: Editor | null
  /** Whether AI writing is enabled */
  enabled?: boolean
  /** Strand metadata for context */
  metadata?: {
    title?: string
    tags?: string[]
    weave?: string
  }
  /** Dark mode */
  isDark?: boolean
  /** Callback when suggestion is accepted */
  onAccept?: (text: string) => void
}

export default function GhostTextOverlay({
  editor,
  enabled = true,
  metadata,
  isDark = false,
  onAccept,
}: GhostTextOverlayProps) {
  const [suggestion, setSuggestion] = useState<WritingSuggestion | null>(null)
  const [status, setStatus] = useState<AIFeatureStatus>('disabled')
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const assistant = useRef(getWritingAssistant())
  
  // Subscribe to assistant status
  useEffect(() => {
    const unsubscribe = assistant.current.onStatusChange(setStatus)
    return unsubscribe
  }, [])
  
  // Get preferences for trigger delay
  const triggerDelay = getAIPreferences().writingAssistant.triggerDelay
  
  // Fetch suggestion after typing stops
  const fetchSuggestion = useCallback(async () => {
    if (!editor || !enabled || status !== 'ready') {
      setSuggestion(null)
      return
    }
    
    // Get text before cursor
    const { from } = editor.state.selection
    const textBefore = editor.state.doc.textBetween(0, from, '\n', '\n')
    const textAfter = editor.state.doc.textBetween(from, editor.state.doc.content.size, '\n', '\n')
    
    // Skip if no content or just whitespace
    if (!textBefore.trim() || textBefore.trim().length < 10) {
      setSuggestion(null)
      return
    }
    
    // Get cursor position for overlay
    const coords = editor.view.coordsAtPos(from)
    setPosition({ x: coords.left, y: coords.bottom })
    
    // Create context and fetch suggestion
    const context = createWritingContext(textBefore, textAfter, metadata)
    const result = await assistant.current.getSuggestion(context)
    
    if (result) {
      setSuggestion(result)
    }
  }, [editor, enabled, status, metadata])
  
  // Handle editor changes
  useEffect(() => {
    if (!editor || !enabled) return
    
    const handleUpdate = () => {
      // Clear existing suggestion on typing
      setSuggestion(null)
      assistant.current.cancel()
      
      // Debounce new suggestion fetch
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      
      debounceRef.current = setTimeout(fetchSuggestion, triggerDelay)
    }
    
    editor.on('update', handleUpdate)
    
    return () => {
      editor.off('update', handleUpdate)
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [editor, enabled, fetchSuggestion, triggerDelay])
  
  // Handle Tab to accept, Esc to dismiss
  useEffect(() => {
    if (!editor || !suggestion) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && suggestion) {
        e.preventDefault()
        acceptSuggestion()
      } else if (e.key === 'Escape' && suggestion) {
        e.preventDefault()
        dismissSuggestion()
      }
    }
    
    // Add to editor's DOM element for proper scope
    const editorEl = editor.view.dom
    editorEl.addEventListener('keydown', handleKeyDown)
    
    return () => {
      editorEl.removeEventListener('keydown', handleKeyDown)
    }
  }, [editor, suggestion])
  
  // Accept suggestion
  const acceptSuggestion = useCallback(() => {
    if (!editor || !suggestion) return
    
    // Insert the suggestion text
    editor.commands.insertContent(suggestion.text)
    setSuggestion(null)
    assistant.current.clearLastSuggestion()
    onAccept?.(suggestion.text)
  }, [editor, suggestion, onAccept])
  
  // Dismiss suggestion
  const dismissSuggestion = useCallback(() => {
    setSuggestion(null)
    assistant.current.cancel()
    assistant.current.clearLastSuggestion()
  }, [])
  
  // Don't render if not enabled or no editor
  if (!enabled || !editor) return null
  
  return (
    <AnimatePresence>
      {suggestion && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="pointer-events-none absolute z-50"
          style={{
            left: position.x,
            top: position.y + 4,
          }}
        >
          {/* Ghost text suggestion */}
          <span 
            className={`
              text-sm italic select-none
              ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
            `}
          >
            {suggestion.text}
          </span>
          
          {/* Hint */}
          <span 
            className={`
              ml-2 text-[10px] px-1.5 py-0.5 rounded
              ${isDark 
                ? 'bg-zinc-800 text-zinc-500 border border-zinc-700' 
                : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
              }
            `}
          >
            Tab to accept
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   STATUS INDICATOR COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

interface AIWritingStatusProps {
  status: AIFeatureStatus
  isDark?: boolean
}

export function AIWritingStatus({ status, isDark = false }: AIWritingStatusProps) {
  const statusConfig = {
    ready: {
      color: 'emerald',
      label: 'AI Ready',
      pulse: false,
    },
    working: {
      color: 'cyan',
      label: 'Thinking...',
      pulse: true,
    },
    disabled: {
      color: 'gray',
      label: 'AI Off',
      pulse: false,
    },
    'no-api-key': {
      color: 'amber',
      label: 'No API Key',
      pulse: false,
    },
    error: {
      color: 'red',
      label: 'AI Paused',
      pulse: false,
    },
  }
  
  const config = statusConfig[status]
  
  return (
    <div 
      className={`
        flex items-center gap-1.5 text-[10px]
        ${isDark ? 'text-zinc-400' : 'text-zinc-500'}
      `}
      title={`Writing Assistant: ${config.label}`}
    >
      <span 
        className={`
          w-1.5 h-1.5 rounded-full
          ${config.pulse ? 'animate-pulse' : ''}
          ${config.color === 'emerald' ? 'bg-emerald-500' : ''}
          ${config.color === 'cyan' ? 'bg-cyan-500' : ''}
          ${config.color === 'gray' ? 'bg-zinc-400' : ''}
          ${config.color === 'amber' ? 'bg-amber-500' : ''}
          ${config.color === 'red' ? 'bg-red-500' : ''}
        `}
      />
      <span className="hidden sm:inline">{config.label}</span>
    </div>
  )
}

