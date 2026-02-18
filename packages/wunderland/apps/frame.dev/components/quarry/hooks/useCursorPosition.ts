/**
 * Cursor Position Hook - Track cursor/caret position for menu anchoring
 * @module codex/hooks/useCursorPosition
 *
 * Tracks cursor position in both rich text editors (TipTap) and textarea fallbacks.
 * Provides viewport-clamped coordinates for anchoring floating menus.
 */

'use client'

import { useState, useEffect, useCallback, RefObject } from 'react'
import type { Editor } from '@tiptap/react'

export interface CursorPosition {
  /** X coordinate in viewport */
  x: number
  /** Y coordinate in viewport */
  y: number
  /** Source of the position */
  anchor: 'cursor' | 'fab' | 'mouse' | 'center'
  /** Whether the position is valid/active */
  isValid: boolean
}

export interface UseCursorPositionOptions {
  /** TipTap editor ref */
  editorRef?: RefObject<Editor | null>
  /** Textarea fallback ref */
  textareaRef?: RefObject<HTMLTextAreaElement | null>
  /** Container element for relative positioning */
  containerRef?: RefObject<HTMLElement | null>
  /** Viewport padding for boundary clamping */
  padding?: number
  /** Menu size for boundary calculations */
  menuSize?: number
}

export interface UseCursorPositionReturn {
  /** Current cursor position */
  position: CursorPosition | null
  /** Last known valid position */
  lastValidPosition: CursorPosition | null
  /** Update position from mouse event */
  updateFromMouse: (e: MouseEvent | React.MouseEvent) => void
  /** Get position from FAB element */
  updateFromFAB: (fabElement: HTMLElement) => void
  /** Get current caret coordinates from editor */
  getCaretPosition: () => CursorPosition | null
  /** Clamp position to viewport bounds */
  clampToViewport: (pos: { x: number; y: number }) => { x: number; y: number }
  /** Clear position */
  clearPosition: () => void
}

/**
 * Get caret coordinates from a textarea element
 */
function getTextareaCaretCoordinates(
  textarea: HTMLTextAreaElement
): { x: number; y: number } | null {
  const { selectionStart, selectionEnd } = textarea
  if (selectionStart === null) return null

  // Create a mirror div to measure text position
  const mirror = document.createElement('div')
  const computed = window.getComputedStyle(textarea)

  // Copy relevant styles
  const stylesToCopy = [
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
    'letterSpacing', 'textTransform', 'wordSpacing',
    'textIndent', 'whiteSpace', 'wordWrap', 'wordBreak',
    'padding', 'border', 'boxSizing', 'lineHeight'
  ]

  mirror.style.position = 'absolute'
  mirror.style.visibility = 'hidden'
  mirror.style.overflow = 'hidden'
  mirror.style.width = computed.width
  mirror.style.height = 'auto'

  stylesToCopy.forEach(prop => {
    mirror.style[prop as any] = computed[prop as any]
  })

  // Get text up to cursor
  const textBeforeCursor = textarea.value.substring(0, selectionStart)
  mirror.textContent = textBeforeCursor

  // Add a span to mark cursor position
  const cursorSpan = document.createElement('span')
  cursorSpan.textContent = '|'
  mirror.appendChild(cursorSpan)

  document.body.appendChild(mirror)

  const textareaRect = textarea.getBoundingClientRect()
  const spanRect = cursorSpan.getBoundingClientRect()
  const mirrorRect = mirror.getBoundingClientRect()

  // Calculate position relative to textarea
  const x = textareaRect.left + (spanRect.left - mirrorRect.left) - textarea.scrollLeft
  const y = textareaRect.top + (spanRect.top - mirrorRect.top) - textarea.scrollTop

  document.body.removeChild(mirror)

  return { x, y }
}

/**
 * Hook to track cursor position for floating menu anchoring
 */
export function useCursorPosition({
  editorRef,
  textareaRef,
  containerRef,
  padding = 20,
  menuSize = 280,
}: UseCursorPositionOptions = {}): UseCursorPositionReturn {
  const [position, setPosition] = useState<CursorPosition | null>(null)
  const [lastValidPosition, setLastValidPosition] = useState<CursorPosition | null>(null)

  // Clamp position to viewport bounds
  const clampToViewport = useCallback((pos: { x: number; y: number }) => {
    const halfMenu = menuSize / 2
    const minX = padding + halfMenu
    const maxX = window.innerWidth - padding - halfMenu
    const minY = padding + halfMenu
    const maxY = window.innerHeight - padding - halfMenu

    return {
      x: Math.max(minX, Math.min(maxX, pos.x)),
      y: Math.max(minY, Math.min(maxY, pos.y)),
    }
  }, [padding, menuSize])

  // Get caret position from TipTap editor
  const getEditorCaretPosition = useCallback((): CursorPosition | null => {
    if (!editorRef?.current) return null

    const editor = editorRef.current
    const { view } = editor
    const { from } = view.state.selection

    try {
      const coords = view.coordsAtPos(from)
      const clamped = clampToViewport({ x: coords.left, y: coords.top })

      return {
        ...clamped,
        anchor: 'cursor',
        isValid: true,
      }
    } catch {
      return null
    }
  }, [editorRef, clampToViewport])

  // Get caret position from textarea
  const getTextareaCaretPosition = useCallback((): CursorPosition | null => {
    if (!textareaRef?.current) return null

    const coords = getTextareaCaretCoordinates(textareaRef.current)
    if (!coords) return null

    const clamped = clampToViewport(coords)

    return {
      ...clamped,
      anchor: 'cursor',
      isValid: true,
    }
  }, [textareaRef, clampToViewport])

  // Get position from either editor type
  const getCaretPosition = useCallback((): CursorPosition | null => {
    // Try TipTap first
    const editorPos = getEditorCaretPosition()
    if (editorPos) return editorPos

    // Fall back to textarea
    const textareaPos = getTextareaCaretPosition()
    if (textareaPos) return textareaPos

    return null
  }, [getEditorCaretPosition, getTextareaCaretPosition])

  // Update from mouse event
  const updateFromMouse = useCallback((e: MouseEvent | React.MouseEvent) => {
    const clamped = clampToViewport({ x: e.clientX, y: e.clientY })
    const newPos: CursorPosition = {
      ...clamped,
      anchor: 'mouse',
      isValid: true,
    }
    setPosition(newPos)
    setLastValidPosition(newPos)
  }, [clampToViewport])

  // Update from FAB element
  const updateFromFAB = useCallback((fabElement: HTMLElement) => {
    const rect = fabElement.getBoundingClientRect()
    const clamped = clampToViewport({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    })
    const newPos: CursorPosition = {
      ...clamped,
      anchor: 'fab',
      isValid: true,
    }
    setPosition(newPos)
    setLastValidPosition(newPos)
  }, [clampToViewport])

  // Clear position
  const clearPosition = useCallback(() => {
    setPosition(null)
  }, [])

  // Listen to selection changes in editor
  useEffect(() => {
    if (!editorRef?.current) return

    const editor = editorRef.current
    const updatePosition = () => {
      const pos = getCaretPosition()
      if (pos) {
        setPosition(pos)
        setLastValidPosition(pos)
      }
    }

    editor.on('selectionUpdate', updatePosition)
    return () => {
      editor.off('selectionUpdate', updatePosition)
    }
  }, [editorRef, getCaretPosition])

  // Listen to selection changes in textarea
  useEffect(() => {
    if (!textareaRef?.current) return

    const textarea = textareaRef.current
    const updatePosition = () => {
      const pos = getTextareaCaretPosition()
      if (pos) {
        setPosition(pos)
        setLastValidPosition(pos)
      }
    }

    textarea.addEventListener('select', updatePosition)
    textarea.addEventListener('click', updatePosition)
    textarea.addEventListener('keyup', updatePosition)

    return () => {
      textarea.removeEventListener('select', updatePosition)
      textarea.removeEventListener('click', updatePosition)
      textarea.removeEventListener('keyup', updatePosition)
    }
  }, [textareaRef, getTextareaCaretPosition])

  return {
    position,
    lastValidPosition,
    updateFromMouse,
    updateFromFAB,
    getCaretPosition,
    clampToViewport,
    clearPosition,
  }
}

export default useCursorPosition
