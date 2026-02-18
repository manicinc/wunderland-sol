/**
 * TableInsertModal - Modal for inserting tables with custom dimensions
 * @module quarry/ui/blockCommands/modals/TableInsertModal
 */

'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Table, Plus, Minus } from 'lucide-react'

export interface TableInsertModalProps {
  isOpen: boolean
  onClose: () => void
  onInsert: (markdown: string) => void
  isDark: boolean
}

/**
 * Generate markdown table with given dimensions
 */
function generateTableMarkdown(rows: number, cols: number, hasHeader: boolean): string {
  const lines: string[] = []

  // Header row
  const headerCells = Array.from({ length: cols }, (_, i) => `Header ${i + 1}`)
  lines.push(`| ${headerCells.join(' | ')} |`)

  // Separator row
  const separators = Array.from({ length: cols }, () => '---')
  lines.push(`| ${separators.join(' | ')} |`)

  // Data rows
  const dataRowCount = hasHeader ? rows - 1 : rows
  for (let r = 0; r < dataRowCount; r++) {
    const cells = Array.from({ length: cols }, () => '     ')
    lines.push(`| ${cells.join(' | ')} |`)
  }

  return lines.join('\n')
}

export function TableInsertModal({
  isOpen,
  onClose,
  onInsert,
  isDark,
}: TableInsertModalProps) {
  const [rows, setRows] = useState(3)
  const [cols, setCols] = useState(3)
  const [hasHeader, setHasHeader] = useState(true)

  const handleInsert = useCallback(() => {
    const markdown = generateTableMarkdown(rows, cols, hasHeader)
    onInsert(markdown)
    onClose()
  }, [rows, cols, hasHeader, onInsert, onClose])

  const incrementRows = () => setRows(r => Math.min(r + 1, 20))
  const decrementRows = () => setRows(r => Math.max(r - 1, 1))
  const incrementCols = () => setCols(c => Math.min(c + 1, 10))
  const decrementCols = () => setCols(c => Math.max(c - 1, 1))

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 28,
          }}
          className={[
            'relative z-10 w-full max-w-sm rounded-xl shadow-2xl border p-6',
            isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200',
          ].join(' ')}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={[
                'w-10 h-10 rounded-lg flex items-center justify-center',
                isDark ? 'bg-cyan-500/20' : 'bg-cyan-100',
              ].join(' ')}>
                <Table className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <h3 className={[
                  'text-lg font-semibold',
                  isDark ? 'text-white' : 'text-zinc-900',
                ].join(' ')}>
                  Insert Table
                </h3>
                <p className={[
                  'text-sm',
                  isDark ? 'text-zinc-400' : 'text-zinc-500',
                ].join(' ')}>
                  Choose table dimensions
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={[
                'p-2 rounded-lg transition-colors',
                isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500',
              ].join(' ')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Dimension controls */}
          <div className="space-y-4 mb-6">
            {/* Rows */}
            <div className="flex items-center justify-between">
              <label className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
                Rows
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={decrementRows}
                  disabled={rows <= 1}
                  className={[
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                    rows <= 1
                      ? 'opacity-50 cursor-not-allowed'
                      : isDark
                        ? 'bg-zinc-700 hover:bg-zinc-600 text-white'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900',
                  ].join(' ')}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className={[
                  'w-12 text-center text-lg font-medium',
                  isDark ? 'text-white' : 'text-zinc-900',
                ].join(' ')}>
                  {rows}
                </span>
                <button
                  onClick={incrementRows}
                  disabled={rows >= 20}
                  className={[
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                    rows >= 20
                      ? 'opacity-50 cursor-not-allowed'
                      : isDark
                        ? 'bg-zinc-700 hover:bg-zinc-600 text-white'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900',
                  ].join(' ')}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Columns */}
            <div className="flex items-center justify-between">
              <label className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
                Columns
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={decrementCols}
                  disabled={cols <= 1}
                  className={[
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                    cols <= 1
                      ? 'opacity-50 cursor-not-allowed'
                      : isDark
                        ? 'bg-zinc-700 hover:bg-zinc-600 text-white'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900',
                  ].join(' ')}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className={[
                  'w-12 text-center text-lg font-medium',
                  isDark ? 'text-white' : 'text-zinc-900',
                ].join(' ')}>
                  {cols}
                </span>
                <button
                  onClick={incrementCols}
                  disabled={cols >= 10}
                  className={[
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                    cols >= 10
                      ? 'opacity-50 cursor-not-allowed'
                      : isDark
                        ? 'bg-zinc-700 hover:bg-zinc-600 text-white'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900',
                  ].join(' ')}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Header toggle */}
            <div className="flex items-center justify-between">
              <label className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
                Include header row
              </label>
              <button
                onClick={() => setHasHeader(!hasHeader)}
                className={[
                  'w-12 h-6 rounded-full transition-colors relative',
                  hasHeader
                    ? 'bg-cyan-500'
                    : isDark
                      ? 'bg-zinc-600'
                      : 'bg-zinc-300',
                ].join(' ')}
              >
                <span
                  className={[
                    'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                    hasHeader ? 'left-7' : 'left-1',
                  ].join(' ')}
                />
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className={[
            'mb-6 p-3 rounded-lg overflow-x-auto',
            isDark ? 'bg-zinc-900' : 'bg-zinc-50',
          ].join(' ')}>
            <div className="text-xs font-mono whitespace-pre">
              {generateTableMarkdown(Math.min(rows, 4), Math.min(cols, 4), hasHeader)}
              {(rows > 4 || cols > 4) && (
                <div className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>
                  ... ({rows} rows x {cols} columns)
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className={[
                'flex-1 px-4 py-2 rounded-lg font-medium transition-colors',
                isDark
                  ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700',
              ].join(' ')}
            >
              Cancel
            </button>
            <button
              onClick={handleInsert}
              className="flex-1 px-4 py-2 rounded-lg font-medium bg-cyan-500 hover:bg-cyan-600 text-white transition-colors"
            >
              Insert Table
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default TableInsertModal
