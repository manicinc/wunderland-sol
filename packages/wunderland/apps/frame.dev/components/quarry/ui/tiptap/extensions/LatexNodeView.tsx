/**
 * LaTeX NodeView for TipTap Editor
 * @module quarry/ui/tiptap/extensions/LatexNodeView
 *
 * React component that renders LaTeX math using KaTeX.
 * Supports both inline and block display modes.
 */

'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'

/**
 * Lazy-load KaTeX
 */
let katexPromise: Promise<typeof import('katex')> | null = null

async function loadKatex() {
  if (katexPromise) return katexPromise

  katexPromise = import('katex').then(m => {
    // Also load CSS
    if (typeof document !== 'undefined' && !document.querySelector('link[href*="katex"]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css'
      document.head.appendChild(link)
    }
    return m
  })

  return katexPromise
}

/**
 * LaTeX NodeView Component
 *
 * Renders LaTeX math equations with:
 * - Inline or block display mode
 * - Click to edit
 * - Error handling
 * - Theme-aware styling
 */
export default function LatexNodeView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const formula = node.attrs.formula || ''
  const isBlock = node.type.name === 'latexBlock'
  const isEditable = editor.isEditable

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(formula)
  const [renderedHtml, setRenderedHtml] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // Detect theme
  const isDark = useMemo(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  }, [])

  // Render LaTeX with KaTeX
  useEffect(() => {
    let mounted = true

    async function render() {
      if (!formula) {
        setRenderedHtml('')
        setError(null)
        return
      }

      try {
        const katex = await loadKatex()

        if (!mounted) return

        const html = katex.default.renderToString(formula, {
          displayMode: isBlock,
          throwOnError: false,
          output: 'html',
          strict: 'ignore',
        })

        setRenderedHtml(html)
        setError(null)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Failed to render LaTeX')
        setRenderedHtml('')
      }
    }

    render()

    return () => {
      mounted = false
    }
  }, [formula, isBlock])

  // Handle editing
  const startEditing = useCallback(() => {
    if (!isEditable) return
    setEditValue(formula)
    setIsEditing(true)
    // Focus input after render
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [isEditable, formula])

  const finishEditing = useCallback(() => {
    updateAttributes({ formula: editValue })
    setIsEditing(false)
  }, [editValue, updateAttributes])

  const cancelEditing = useCallback(() => {
    setEditValue(formula)
    setIsEditing(false)
  }, [formula])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      finishEditing()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEditing()
    }
  }, [finishEditing, cancelEditing])

  // Block wrapper styles
  const wrapperClasses = isBlock
    ? `latex-block-wrapper my-4 text-center ${selected ? 'ring-2 ring-cyan-500 ring-offset-2 rounded-lg' : ''}`
    : `latex-inline-wrapper inline ${selected ? 'ring-2 ring-cyan-500 rounded' : ''}`

  // Editing UI
  if (isEditing) {
    return (
      <NodeViewWrapper className={wrapperClasses} data-type={isBlock ? 'latex-block' : 'latex-inline'}>
        <div className={`
          ${isBlock ? 'p-4' : 'inline-block'}
          ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}
          rounded-lg
        `}>
          {isBlock ? (
            <textarea
              ref={inputRef as any}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={finishEditing}
              className={`
                w-full min-h-[80px] p-3 font-mono text-sm rounded-lg resize-y
                ${isDark ? 'bg-zinc-900 text-zinc-100' : 'bg-white text-zinc-900'}
                border ${isDark ? 'border-zinc-700' : 'border-zinc-300'}
                focus:outline-none focus:ring-2 focus:ring-cyan-500
              `}
              placeholder="Enter LaTeX formula..."
            />
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={finishEditing}
              className={`
                px-2 py-1 font-mono text-sm rounded
                ${isDark ? 'bg-zinc-900 text-zinc-100' : 'bg-white text-zinc-900'}
                border ${isDark ? 'border-zinc-700' : 'border-zinc-300'}
                focus:outline-none focus:ring-2 focus:ring-cyan-500
              `}
              placeholder="LaTeX..."
            />
          )}
          <div className={`text-xs mt-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Press Enter to save, Escape to cancel
          </div>
        </div>
      </NodeViewWrapper>
    )
  }

  // Error state
  if (error) {
    return (
      <NodeViewWrapper className={wrapperClasses} data-type={isBlock ? 'latex-block' : 'latex-inline'}>
        <span
          className={`
            ${isBlock ? 'block py-2 px-4' : 'inline-block px-2'}
            rounded border-2 border-red-500/50
            ${isDark ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}
            text-xs font-mono cursor-pointer
          `}
          onClick={startEditing}
          title={error}
        >
          [Math Error: {formula.substring(0, 20)}{formula.length > 20 ? '...' : ''}]
        </span>
      </NodeViewWrapper>
    )
  }

  // Rendered LaTeX
  return (
    <NodeViewWrapper className={wrapperClasses} data-type={isBlock ? 'latex-block' : 'latex-inline'}>
      <span
        ref={containerRef}
        className={`
          latex-rendered
          ${isBlock ? 'block py-4' : 'inline-block mx-1'}
          ${isEditable ? 'cursor-pointer hover:bg-cyan-500/10 rounded transition-colors' : ''}
        `}
        onClick={startEditing}
        title={isEditable ? 'Click to edit' : formula}
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    </NodeViewWrapper>
  )
}
