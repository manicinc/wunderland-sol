/**
 * Formula NodeView for TipTap Editor
 * @module quarry/ui/tiptap/extensions/FormulaNodeView
 *
 * React component that renders Embark-inspired formula blocks with live evaluation.
 * Shows the formula expression and computed result.
 */

'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import { Calculator, AlertCircle, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react'
import { evaluateFormula, createFormulaContext, getAvailableFunctions, FormulaResult } from '@/lib/formulas/formulaEngine'

/**
 * Formula NodeView Component
 *
 * Renders formula blocks with:
 * - Live evaluation with result display
 * - Click to edit formula
 * - Error handling with messages
 * - Theme-aware styling
 * - Copy result functionality
 */
export default function FormulaNodeView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const expression = node.attrs.expression || ''
  const fields = node.attrs.fields || {}
  const isEditable = editor.isEditable

  const [result, setResult] = useState<FormulaResult | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(expression)
  const [copied, setCopied] = useState(false)
  const [showFunctions, setShowFunctions] = useState(false)

  // Detect theme
  const isDark = useMemo(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  }, [])

  // Evaluate formula
  useEffect(() => {
    let mounted = true

    async function evaluate() {
      if (!expression) {
        setResult(null)
        return
      }

      // Remove leading = if present (common formula syntax)
      const cleanExpression = expression.startsWith('=') ? expression.slice(1) : expression

      try {
        const context = createFormulaContext({
          fields,
          now: new Date(),
        })

        const evalResult = await evaluateFormula(cleanExpression, context)

        if (mounted) {
          setResult(evalResult)
        }
      } catch (err) {
        if (mounted) {
          setResult({
            success: false,
            value: null,
            valueType: 'null',
            displayValue: `#ERROR: ${err instanceof Error ? err.message : 'Unknown error'}`,
            error: err instanceof Error ? err.message : 'Unknown error',
            dependencies: [],
            evaluationTimeMs: 0,
          })
        }
      }
    }

    evaluate()

    return () => {
      mounted = false
    }
  }, [expression, fields])

  // Handle editing
  const startEditing = useCallback(() => {
    if (!isEditable) return
    setEditValue(expression)
    setIsEditing(true)
  }, [isEditable, expression])

  const finishEditing = useCallback(() => {
    updateAttributes({ expression: editValue })
    setIsEditing(false)
  }, [editValue, updateAttributes])

  const cancelEditing = useCallback(() => {
    setEditValue(expression)
    setIsEditing(false)
  }, [expression])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      finishEditing()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEditing()
    }
  }, [finishEditing, cancelEditing])

  // Copy result
  const copyResult = useCallback(() => {
    if (!result?.displayValue) return
    navigator.clipboard.writeText(result.displayValue)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [result])

  // Get available functions for help
  const availableFunctions = useMemo(() => getAvailableFunctions(), [])

  return (
    <NodeViewWrapper
      className={`formula-block-wrapper my-4 ${selected ? 'ring-2 ring-cyan-500 ring-offset-2 rounded-xl' : ''}`}
      data-type="formula"
    >
      <div className={`
        rounded-xl border overflow-hidden
        ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}
      `}>
        {/* Header */}
        <div className={`
          flex items-center gap-2 px-3 py-2 border-b
          ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}
        `}>
          <Calculator className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Formula
          </span>

          {result && (
            <span className={`
              ml-auto text-xs
              ${result.success
                ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                : isDark ? 'text-red-400' : 'text-red-600'
              }
            `}>
              {result.evaluationTimeMs}ms
            </span>
          )}
        </div>

        {/* Expression */}
        <div className="p-3">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={finishEditing}
                autoFocus
                className={`
                  w-full min-h-[60px] p-3 font-mono text-sm rounded-lg resize-y
                  ${isDark ? 'bg-zinc-800 text-emerald-400' : 'bg-zinc-100 text-emerald-700'}
                  border ${isDark ? 'border-zinc-600' : 'border-zinc-300'}
                  focus:outline-none focus:ring-2 focus:ring-emerald-500
                `}
                placeholder="Enter formula (e.g., =ADD(1, 2))"
              />
              <div className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Press Enter to save, Escape to cancel
              </div>

              {/* Function reference toggle */}
              <button
                onClick={() => setShowFunctions(!showFunctions)}
                className={`
                  flex items-center gap-1 text-xs
                  ${isDark ? 'text-zinc-400 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-600'}
                `}
              >
                {showFunctions ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Available Functions ({availableFunctions.length})
              </button>

              {showFunctions && (
                <div className={`
                  max-h-40 overflow-auto p-2 rounded-lg text-xs font-mono
                  ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}
                `}>
                  {availableFunctions.slice(0, 20).map((fn) => (
                    <div key={fn.name} className="py-0.5">
                      <span className={isDark ? 'text-cyan-400' : 'text-cyan-600'}>{fn.name}</span>
                      <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}> - {fn.description}</span>
                    </div>
                  ))}
                  {availableFunctions.length > 20 && (
                    <div className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>
                      ...and {availableFunctions.length - 20} more
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div
              className={`
                font-mono text-sm p-3 rounded-lg
                ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}
                ${isEditable ? 'cursor-pointer hover:bg-opacity-80 transition-colors' : ''}
              `}
              onClick={startEditing}
              title={isEditable ? 'Click to edit' : undefined}
            >
              <span className={isDark ? 'text-emerald-400' : 'text-emerald-700'}>
                {expression}
              </span>
            </div>
          )}
        </div>

        {/* Result */}
        {result && !isEditing && (
          <div className={`
            px-3 pb-3
          `}>
            <div className={`
              flex items-center gap-2 p-3 rounded-lg
              ${result.success
                ? isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'
                : isDark ? 'bg-red-900/20' : 'bg-red-50'
              }
            `}>
              {result.success ? (
                <>
                  <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>=</span>
                  <span className={`
                    flex-1 font-semibold
                    ${isDark ? 'text-emerald-300' : 'text-emerald-700'}
                  `}>
                    {result.displayValue}
                  </span>
                  <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    ({result.valueType})
                  </span>
                  <button
                    onClick={copyResult}
                    className={`
                      p-1 rounded transition-colors
                      ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'}
                    `}
                    title="Copy result"
                  >
                    {copied
                      ? <Check className="w-4 h-4 text-green-500" />
                      : <Copy className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
                    }
                  </button>
                </>
              ) : (
                <>
                  <AlertCircle className={`w-4 h-4 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                  <span className={`
                    flex-1 text-sm
                    ${isDark ? 'text-red-400' : 'text-red-600'}
                  `}>
                    {result.error || result.displayValue}
                  </span>
                </>
              )}
            </div>

            {/* Dependencies */}
            {result.success && result.dependencies && result.dependencies.length > 0 && (
              <div className={`mt-2 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                References: {result.dependencies.join(', ')}
              </div>
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}
