/**
 * ViewInsertModal - Modal for selecting and inserting embeddable views
 * @module quarry/ui/blockCommands/modals/ViewInsertModal
 */

'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Map, 
  Calendar, 
  Table, 
  BarChart3, 
  List, 
  Loader2,
  CheckCircle2,
  Info
} from 'lucide-react'
import {
  extractPlaceData,
  extractEventData,
  extractListData,
  ViewableData,
} from '@/lib/views'

// Async wrappers for data extractors that match the expected signature
// In a full implementation, these would fetch strand content from the path
const asyncExtractPlaceData = async (_strandPath: string): Promise<ViewableData[]> => {
  // TODO: Fetch strand content from strandPath and extract data
  return extractPlaceData('')
}

const asyncExtractEventData = async (_strandPath: string): Promise<ViewableData[]> => {
  // TODO: Fetch strand content from strandPath and extract data
  return extractEventData('')
}

const asyncExtractListData = async (_strandPath: string): Promise<ViewableData[]> => {
  // TODO: Fetch strand content from strandPath and extract data
  return extractListData('')
}

export interface ViewInsertModalProps {
  isOpen: boolean
  onClose: () => void
  onInsert: (markdown: string) => void
  isDark: boolean
  /** Current strand path for data extraction */
  strandPath?: string
  /** Pre-selected view type */
  preSelectedType?: 'map' | 'calendar' | 'table' | 'chart' | 'list'
}

interface ViewOption {
  id: string
  type: 'map' | 'calendar' | 'table' | 'chart' | 'list'
  name: string
  description: string
  icon: React.ReactNode
  color: string
  dataExtractor?: (strandPath: string) => Promise<ViewableData[]>
}

const VIEW_OPTIONS: ViewOption[] = [
  {
    id: 'map-view',
    type: 'map',
    name: 'Map View',
    description: 'Display places and locations on an interactive map',
    icon: <Map className="w-5 h-5" />,
    color: 'emerald',
    dataExtractor: asyncExtractPlaceData,
  },
  {
    id: 'calendar-view',
    type: 'calendar',
    name: 'Calendar View',
    description: 'Show events, dates, and tasks on a calendar',
    icon: <Calendar className="w-5 h-5" />,
    color: 'blue',
    dataExtractor: asyncExtractEventData,
  },
  {
    id: 'table-view',
    type: 'table',
    name: 'Table View',
    description: 'Present structured data in a sortable table',
    icon: <Table className="w-5 h-5" />,
    color: 'cyan',
    dataExtractor: asyncExtractListData,
  },
  {
    id: 'chart-view',
    type: 'chart',
    name: 'Chart View',
    description: 'Visualize numeric data as bar or line charts',
    icon: <BarChart3 className="w-5 h-5" />,
    color: 'purple',
    dataExtractor: asyncExtractListData,
  },
  {
    id: 'list-view',
    type: 'list',
    name: 'List View',
    description: 'Display items as a simple interactive list',
    icon: <List className="w-5 h-5" />,
    color: 'orange',
    dataExtractor: asyncExtractListData,
  },
]

/**
 * Generate view embed markdown syntax
 */
function generateViewMarkdown(
  viewType: string, 
  options: Record<string, unknown> = {}
): string {
  const optionsStr = Object.keys(options).length > 0
    ? `\n${JSON.stringify(options, null, 2)}`
    : ''
  
  return `\`\`\`view:${viewType}${optionsStr}
\`\`\``
}

export function ViewInsertModal({
  isOpen,
  onClose,
  onInsert,
  isDark,
  strandPath,
  preSelectedType,
}: ViewInsertModalProps) {
  const [selectedView, setSelectedView] = useState<ViewOption | null>(
    preSelectedType ? VIEW_OPTIONS.find(v => v.type === preSelectedType) || null : null
  )
  const [dataPreview, setDataPreview] = useState<ViewableData[]>([])
  const [loading, setLoading] = useState(false)
  const [viewOptions, setViewOptions] = useState<Record<string, unknown>>({})

  // Load data preview when view is selected
  useEffect(() => {
    if (!selectedView || !strandPath || !selectedView.dataExtractor) {
      setDataPreview([])
      return
    }

    setLoading(true)
    selectedView.dataExtractor(strandPath)
      .then(data => {
        setDataPreview(data)
        setLoading(false)
      })
      .catch(() => {
        setDataPreview([])
        setLoading(false)
      })
  }, [selectedView, strandPath])

  const handleInsert = useCallback(() => {
    if (!selectedView) return
    const markdown = generateViewMarkdown(selectedView.type, viewOptions)
    onInsert(markdown)
    onClose()
  }, [selectedView, viewOptions, onInsert, onClose])

  const handleViewSelect = useCallback((view: ViewOption) => {
    setSelectedView(view)
    setViewOptions({}) // Reset options when changing view
  }, [])

  const getColorClasses = (color: string, selected: boolean) => {
    const colors: Record<string, { bg: string; border: string; text: string; selectedBg: string }> = {
      emerald: {
        bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50',
        border: 'border-emerald-500',
        text: 'text-emerald-500',
        selectedBg: isDark ? 'bg-emerald-500/20' : 'bg-emerald-100',
      },
      blue: {
        bg: isDark ? 'bg-blue-500/10' : 'bg-blue-50',
        border: 'border-blue-500',
        text: 'text-blue-500',
        selectedBg: isDark ? 'bg-blue-500/20' : 'bg-blue-100',
      },
      cyan: {
        bg: isDark ? 'bg-cyan-500/10' : 'bg-cyan-50',
        border: 'border-cyan-500',
        text: 'text-cyan-500',
        selectedBg: isDark ? 'bg-cyan-500/20' : 'bg-cyan-100',
      },
      purple: {
        bg: isDark ? 'bg-purple-500/10' : 'bg-purple-50',
        border: 'border-purple-500',
        text: 'text-purple-500',
        selectedBg: isDark ? 'bg-purple-500/20' : 'bg-purple-100',
      },
      orange: {
        bg: isDark ? 'bg-orange-500/10' : 'bg-orange-50',
        border: 'border-orange-500',
        text: 'text-orange-500',
        selectedBg: isDark ? 'bg-orange-500/20' : 'bg-orange-100',
      },
    }
    
    const c = colors[color] || colors.blue
    return selected
      ? `${c.selectedBg} ${c.border} border-2`
      : `${c.bg} border border-transparent hover:border-${color}-300`
  }

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
            'relative z-10 w-full max-w-2xl rounded-xl shadow-2xl border overflow-hidden',
            isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200',
          ].join(' ')}
        >
          {/* Header */}
          <div className={[
            'flex items-center justify-between p-4 border-b',
            isDark ? 'border-zinc-700' : 'border-zinc-200',
          ].join(' ')}>
            <div className="flex items-center gap-3">
              <div className={[
                'w-10 h-10 rounded-lg flex items-center justify-center',
                isDark ? 'bg-indigo-500/20' : 'bg-indigo-100',
              ].join(' ')}>
                <BarChart3 className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <h3 className={[
                  'text-lg font-semibold',
                  isDark ? 'text-white' : 'text-zinc-900',
                ].join(' ')}>
                  Embed View
                </h3>
                <p className={[
                  'text-sm',
                  isDark ? 'text-zinc-400' : 'text-zinc-500',
                ].join(' ')}>
                  Visualize document data with rich views
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

          <div className="p-4">
            {/* View type selection */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {VIEW_OPTIONS.map(view => (
                <button
                  key={view.id}
                  onClick={() => handleViewSelect(view)}
                  className={[
                    'p-4 rounded-xl text-left transition-all',
                    getColorClasses(view.color, selectedView?.id === view.id),
                  ].join(' ')}
                >
                  <div className={[
                    'w-10 h-10 rounded-lg flex items-center justify-center mb-3',
                    `bg-${view.color}-500/20`,
                  ].join(' ')}>
                    <span className={`text-${view.color}-500`}>{view.icon}</span>
                  </div>
                  <div className={[
                    'font-medium',
                    isDark ? 'text-white' : 'text-zinc-900',
                  ].join(' ')}>
                    {view.name}
                  </div>
                  <div className={[
                    'text-xs mt-1 line-clamp-2',
                    isDark ? 'text-zinc-400' : 'text-zinc-500',
                  ].join(' ')}>
                    {view.description}
                  </div>
                  {selectedView?.id === view.id && (
                    <CheckCircle2 className={`absolute top-2 right-2 w-5 h-5 text-${view.color}-500`} />
                  )}
                </button>
              ))}
            </div>

            {/* Data preview */}
            {selectedView && (
              <div className={[
                'rounded-lg p-4',
                isDark ? 'bg-zinc-900' : 'bg-zinc-50',
              ].join(' ')}>
                <div className="flex items-center gap-2 mb-3">
                  <Info className={[
                    'w-4 h-4',
                    isDark ? 'text-zinc-500' : 'text-zinc-400',
                  ].join(' ')} />
                  <span className={[
                    'text-sm font-medium',
                    isDark ? 'text-zinc-300' : 'text-zinc-700',
                  ].join(' ')}>
                    Data Preview
                  </span>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className={[
                      'w-6 h-6 animate-spin',
                      isDark ? 'text-zinc-500' : 'text-zinc-400',
                    ].join(' ')} />
                    <span className={[
                      'ml-2 text-sm',
                      isDark ? 'text-zinc-500' : 'text-zinc-400',
                    ].join(' ')}>
                      Extracting data...
                    </span>
                  </div>
                ) : dataPreview.length > 0 ? (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {dataPreview.slice(0, 5).map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className={[
                          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                          isDark ? 'bg-zinc-800' : 'bg-white',
                        ].join(' ')}
                      >
                        <span className={[
                          'px-2 py-0.5 rounded text-xs font-mono',
                          isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-600',
                        ].join(' ')}>
                          {item.type}
                        </span>
                        <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
                          {item.title}
                        </span>
                      </div>
                    ))}
                    {dataPreview.length > 5 && (
                      <div className={[
                        'text-xs text-center py-2',
                        isDark ? 'text-zinc-500' : 'text-zinc-400',
                      ].join(' ')}>
                        ...and {dataPreview.length - 5} more items
                      </div>
                    )}
                  </div>
                ) : strandPath ? (
                  <div className={[
                    'text-sm text-center py-6',
                    isDark ? 'text-zinc-500' : 'text-zinc-400',
                  ].join(' ')}>
                    No matching data found in this document for {selectedView.name}.
                    <br />
                    <span className="text-xs">
                      The view will render once relevant data is added.
                    </span>
                  </div>
                ) : (
                  <div className={[
                    'text-sm text-center py-6',
                    isDark ? 'text-zinc-500' : 'text-zinc-400',
                  ].join(' ')}>
                    Save the document first to preview available data.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className={[
            'flex gap-3 p-4 border-t',
            isDark ? 'border-zinc-700' : 'border-zinc-200',
          ].join(' ')}>
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
              disabled={!selectedView}
              className={[
                'flex-1 px-4 py-2 rounded-lg font-medium transition-colors',
                selectedView
                  ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                  : isDark
                    ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                    : 'bg-zinc-200 text-zinc-400 cursor-not-allowed',
              ].join(' ')}
            >
              Embed View
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default ViewInsertModal

