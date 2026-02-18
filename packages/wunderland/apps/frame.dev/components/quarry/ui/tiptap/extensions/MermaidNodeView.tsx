/**
 * Mermaid NodeView for TipTap Editor
 * @module quarry/ui/tiptap/extensions/MermaidNodeView
 *
 * React component that renders mermaid diagrams within the TipTap editor.
 * Wraps the existing MermaidDiagram component with NodeView functionality.
 */

'use client'

import React, { useCallback, useMemo } from 'react'
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import MermaidDiagram from '@/components/quarry/ui/diagrams/MermaidDiagram'

/**
 * Map TipTap editor theme to MermaidDiagram theme
 */
function getEditorTheme(): 'light' | 'dark' | 'sepia-light' | 'sepia-dark' {
  // Check for dark mode by looking at document classes or media query
  if (typeof window !== 'undefined') {
    const isDark = document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches
    return isDark ? 'dark' : 'light'
  }
  return 'light'
}

/**
 * Mermaid NodeView Component
 *
 * Renders a mermaid diagram block within TipTap with:
 * - Live diagram rendering
 * - Edit/preview modes
 * - Theme-aware styling
 * - Selection highlighting
 */
export default function MermaidNodeView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const code = node.attrs.code || ''
  const isEditable = editor.isEditable

  // Determine theme from editor context
  const theme = useMemo(() => getEditorTheme(), [])

  // Handle code changes from the diagram editor
  const handleCodeChange = useCallback((newCode: string) => {
    updateAttributes({ code: newCode })
  }, [updateAttributes])

  return (
    <NodeViewWrapper
      className={`mermaid-block my-4 ${selected ? 'ring-2 ring-cyan-500 ring-offset-2 rounded-xl' : ''}`}
      data-type="mermaid"
    >
      <MermaidDiagram
        code={code}
        theme={theme}
        showToolbar={true}
        editable={isEditable}
        onCodeChange={handleCodeChange}
        maxHeight="500px"
      />
    </NodeViewWrapper>
  )
}
