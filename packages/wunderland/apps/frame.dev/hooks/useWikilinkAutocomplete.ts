/**
 * Wikilink Autocomplete Hook
 * @module hooks/useWikilinkAutocomplete
 *
 * Detects [[...]] patterns in editor content and triggers autocomplete.
 * Works with any text input that exposes cursor position.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Editor } from '@tiptap/react'

export interface WikilinkState {
  /** Whether autocomplete is currently active */
  isActive: boolean
  /** The query text (text after [[) */
  query: string
  /** Position for the autocomplete dropdown */
  position: { top: number; left: number }
  /** Start position in the document for replacement */
  startPos: number
  /** End position in the document for replacement */
  endPos: number
}

export interface UseWikilinkAutocompleteOptions {
  /** Tiptap editor instance */
  editor: Editor | null
  /** Whether autocomplete is enabled */
  enabled?: boolean
  /** Callback when autocomplete should open */
  onOpen?: (state: WikilinkState) => void
  /** Callback when autocomplete should close */
  onClose?: () => void
}

export interface UseWikilinkAutocompleteReturn {
  /** Current wikilink state */
  state: WikilinkState
  /** Check content for wikilink pattern (call on editor update) */
  checkForWikilink: () => void
  /** Insert a link (call when user selects from autocomplete) */
  insertLink: (strandPath: string, displayText?: string) => void
  /** Close the autocomplete */
  close: () => void
}

const INITIAL_STATE: WikilinkState = {
  isActive: false,
  query: '',
  position: { top: 0, left: 0 },
  startPos: 0,
  endPos: 0,
}

/**
 * Hook for detecting and handling [[...]] wikilink autocomplete
 */
export function useWikilinkAutocomplete({
  editor,
  enabled = true,
  onOpen,
  onClose,
}: UseWikilinkAutocompleteOptions): UseWikilinkAutocompleteReturn {
  const [state, setState] = useState<WikilinkState>(INITIAL_STATE)
  const lastQueryRef = useRef<string>('')

  // Check text before cursor for [[ pattern
  const checkForWikilink = useCallback(() => {
    if (!editor || !enabled) return

    const { from } = editor.state.selection
    
    // Get text before cursor (up to 100 chars to find [[)
    const textBefore = editor.state.doc.textBetween(
      Math.max(0, from - 100),
      from,
      '\n'
    )

    // Look for unclosed [[ pattern
    // Pattern: [[ followed by any chars that are NOT ] or newline
    const match = textBefore.match(/\[\[([^\]\n]*)$/)

    if (match) {
      const query = match[1]
      
      // Get cursor coordinates for dropdown positioning
      const coords = editor.view.coordsAtPos(from)
      
      // Calculate the start position of [[
      const queryLength = query.length
      const startPos = from - queryLength - 2 // -2 for [[
      
      const newState: WikilinkState = {
        isActive: true,
        query,
        position: {
          top: coords.bottom + 4,
          left: coords.left,
        },
        startPos,
        endPos: from,
      }

      // Only update if query changed
      if (query !== lastQueryRef.current || !state.isActive) {
        lastQueryRef.current = query
        setState(newState)
        
        if (!state.isActive) {
          onOpen?.(newState)
        }
      }
    } else if (state.isActive) {
      // No match - close autocomplete
      lastQueryRef.current = ''
      setState(INITIAL_STATE)
      onClose?.()
    }
  }, [editor, enabled, state.isActive, onOpen, onClose])

  // Insert a wikilink at the current position
  const insertLink = useCallback((strandPath: string, displayText?: string) => {
    if (!editor || !state.isActive) return

    // Build the link text
    const linkText = displayText && displayText !== strandPath
      ? `[[${strandPath}|${displayText}]]`
      : `[[${strandPath}]]`

    // Replace the [[ and query with the full link
    editor.chain()
      .focus()
      .deleteRange({ from: state.startPos, to: state.endPos })
      .insertContent(linkText)
      .run()

    // Close autocomplete
    lastQueryRef.current = ''
    setState(INITIAL_STATE)
    onClose?.()
  }, [editor, state, onClose])

  // Close the autocomplete
  const close = useCallback(() => {
    if (state.isActive) {
      lastQueryRef.current = ''
      setState(INITIAL_STATE)
      onClose?.()
    }
  }, [state.isActive, onClose])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      lastQueryRef.current = ''
    }
  }, [])

  return {
    state,
    checkForWikilink,
    insertLink,
    close,
  }
}

export default useWikilinkAutocomplete

