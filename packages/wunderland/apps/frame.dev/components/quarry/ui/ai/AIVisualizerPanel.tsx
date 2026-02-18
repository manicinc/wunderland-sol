/**
 * AI Visualizer Panel
 * @module components/quarry/ui/AIVisualizerPanel
 *
 * Right sidebar panel for AI-generated visualizations:
 * - Gallery mode: Grid of generated images
 * - Timeline mode: Visual document timeline
 * - Picture book mode: Side-by-side text + illustrations
 * - Diagrams mode: Extracted charts/diagrams
 */

'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Image as ImageIcon,
  Clock,
  BookOpen,
  GitBranch,
  Loader2,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Zap,
  Settings2,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type VisualizationMode,
  type VisualizationItem,
  type KeyConcept,
  VISUALIZATION_STYLES,
  extractKeyConceptsForVisualization,
  generateVisualizationItem,
  suggestVisualizationStyle,
} from '@/lib/ai/documentVisualizer'
import { hasAnyLLMKey, hasImageGenerationKey } from '@/lib/llm'

// ============================================================================
// TYPES
// ============================================================================

export interface AIVisualizerPanelProps {
  /** Document content to visualize */
  content: string
  /** Current theme */
  isDark: boolean
  /** Callback when user wants to insert an image */
  onInsertImage?: (url: string, position: number) => void
  /** Callback to close the panel */
  onClose?: () => void
  /** Default visualization mode */
  defaultMode?: VisualizationMode
  /** Whether panel is open */
  isOpen: boolean
}

// ============================================================================
// MODE TABS
// ============================================================================

const MODES: { mode: VisualizationMode; label: string; icon: React.ElementType }[] = [
  { mode: 'gallery', label: 'Gallery', icon: ImageIcon },
  { mode: 'timeline', label: 'Timeline', icon: Clock },
  { mode: 'picturebook', label: 'Picture Book', icon: BookOpen },
  { mode: 'diagrams', label: 'Diagrams', icon: GitBranch },
]

// ============================================================================
// COMPONENT
// ============================================================================

export default function AIVisualizerPanel({
  content,
  isDark,
  onInsertImage,
  onClose,
  defaultMode = 'gallery',
  isOpen,
}: AIVisualizerPanelProps) {
  // State
  const [mode, setMode] = useState<VisualizationMode>(defaultMode)
  const [style, setStyle] = useState<string>('illustration')
  const [autoGenerate, setAutoGenerate] = useState(false)
  const [concepts, setConcepts] = useState<KeyConcept[]>([])
  const [visualizations, setVisualizations] = useState<VisualizationItem[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  // Check for API keys
  const hasLLM = useMemo(() => hasAnyLLMKey(), [])
  const hasImageGen = useMemo(() => hasImageGenerationKey(), [])
  const isEnabled = hasLLM && hasImageGen

  // Suggest style based on content
  useEffect(() => {
    if (content && !style) {
      setStyle(suggestVisualizationStyle(content))
    }
  }, [content, style])

  // Extract concepts from content
  const extractConcepts = useCallback(async () => {
    if (!content || !isEnabled) return

    setIsExtracting(true)
    try {
      const extracted = await extractKeyConceptsForVisualization(content, {
        maxConcepts: 6,
        mode,
      })
      setConcepts(extracted)

      // Create visualization items from concepts
      const items: VisualizationItem[] = extracted.map((concept, index) => ({
        id: `viz-${Date.now()}-${index}`,
        type: mode === 'diagrams' ? 'diagram' : 'image',
        prompt: concept.visualPrompt,
        sourceText: concept.text,
        position: concept.paragraphIndex,
        status: 'pending',
      }))
      setVisualizations(items)
    } catch (error) {
      console.error('[AIVisualizerPanel] Failed to extract concepts:', error)
    } finally {
      setIsExtracting(false)
    }
  }, [content, mode, isEnabled])

  // Generate a single visualization
  const generateVisualization = useCallback(
    async (index: number) => {
      const item = visualizations[index]
      if (!item || item.status === 'generating' || item.status === 'ready') return

      // Update status to generating
      setVisualizations((prev) =>
        prev.map((v, i) => (i === index ? { ...v, status: 'generating' } : v))
      )

      try {
        const result = await generateVisualizationItem(item, style)
        setVisualizations((prev) => prev.map((v, i) => (i === index ? result : v)))
      } catch (error) {
        setVisualizations((prev) =>
          prev.map((v, i) =>
            i === index
              ? { ...v, status: 'error', error: error instanceof Error ? error.message : 'Failed' }
              : v
          )
        )
      }
    },
    [visualizations, style]
  )

  // Generate all visualizations
  const generateAll = useCallback(async () => {
    for (let i = 0; i < visualizations.length; i++) {
      if (visualizations[i].status === 'pending') {
        await generateVisualization(i)
      }
    }
  }, [visualizations, generateVisualization])

  // Auto-generate when enabled and concepts are extracted
  useEffect(() => {
    if (autoGenerate && visualizations.length > 0 && visualizations.every((v) => v.status === 'pending')) {
      generateAll()
    }
  }, [autoGenerate, visualizations, generateAll])

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={cn(
        'fixed z-40 flex flex-col overflow-hidden touch-manipulation',
        // Mobile: full-screen modal
        'inset-0',
        // Desktop: right sidebar
        'md:inset-auto md:right-0 md:top-0 md:h-full md:w-80 md:border-l md:shadow-2xl',
        isDark ? 'bg-zinc-900 md:border-zinc-800' : 'bg-white md:border-zinc-200'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex-shrink-0 flex items-center justify-between px-4 py-3 border-b',
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        )}
      >
        <div className="flex items-center gap-2">
          <Sparkles className={cn('w-4 h-4', isDark ? 'text-violet-400' : 'text-violet-600')} />
          <span className={cn('text-sm font-medium', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
            AI Visualizer
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              'p-2.5 rounded-md transition-colors touch-manipulation',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50',
              isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
            )}
          >
            <Settings2 className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className={cn(
              'p-2.5 rounded-md transition-colors touch-manipulation',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50',
              isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={cn(
              'flex-shrink-0 border-b overflow-hidden',
              isDark ? 'border-zinc-800 bg-zinc-800/50' : 'border-zinc-200 bg-zinc-50'
            )}
          >
            <div className="p-3 space-y-3">
              {/* Style Selector */}
              <div>
                <label className={cn('text-xs font-medium mb-1.5 block', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                  Visual Style
                </label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className={cn(
                    'w-full px-2.5 py-1.5 text-sm rounded-md border',
                    isDark
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                      : 'bg-white border-zinc-200 text-zinc-800'
                  )}
                >
                  {Object.entries(VISUALIZATION_STYLES).map(([key, { label }]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto-generate Toggle */}
              <div className="flex items-center justify-between">
                <span className={cn('text-xs', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                  Auto-generate
                </span>
                <button
                  onClick={() => setAutoGenerate(!autoGenerate)}
                  className={cn(
                    'relative w-9 h-5 rounded-full transition-colors',
                    autoGenerate
                      ? 'bg-violet-500'
                      : isDark
                        ? 'bg-zinc-700'
                        : 'bg-zinc-300'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                      autoGenerate ? 'translate-x-4' : 'translate-x-0.5'
                    )}
                  />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mode Tabs */}
      <div
        className={cn(
          'flex-shrink-0 flex items-center gap-1 px-2 py-2 border-b overflow-x-auto touch-manipulation',
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        )}
      >
        {MODES.map(({ mode: m, label, icon: Icon }) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap touch-manipulation',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50',
              mode === m
                ? isDark
                  ? 'bg-violet-500/20 text-violet-400'
                  : 'bg-violet-100 text-violet-700'
                : isDark
                  ? 'text-zinc-400 hover:bg-zinc-800'
                  : 'text-zinc-500 hover:bg-zinc-100'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* API Key Warning */}
      {!isEnabled && (
        <div
          className={cn(
            'flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b',
            isDark ? 'border-zinc-800 bg-amber-500/10' : 'border-zinc-200 bg-amber-50'
          )}
        >
          <AlertCircle className={cn('w-4 h-4 flex-shrink-0', isDark ? 'text-amber-400' : 'text-amber-600')} />
          <span className={cn('text-xs', isDark ? 'text-amber-300' : 'text-amber-700')}>
            Configure LLM and image generation API keys in Settings to use visualizations.
          </span>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto touch-manipulation">
        {/* Extract Concepts Button */}
        {concepts.length === 0 && (
          <div className="p-4 flex flex-col items-center gap-3">
            <div
              className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center',
                isDark ? 'bg-violet-500/10' : 'bg-violet-50'
              )}
            >
              <Sparkles className={cn('w-8 h-8', isDark ? 'text-violet-400' : 'text-violet-600')} />
            </div>
            <p className={cn('text-sm text-center', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
              Analyze your document to extract key visual concepts
            </p>
            <button
              onClick={extractConcepts}
              disabled={!isEnabled || isExtracting || !content}
              className={cn(
                'flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium transition-colors touch-manipulation',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                isDark
                  ? 'bg-violet-600 hover:bg-violet-500 text-white'
                  : 'bg-violet-600 hover:bg-violet-500 text-white'
              )}
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Extract Concepts
                </>
              )}
            </button>
          </div>
        )}

        {/* Visualizations Grid */}
        {visualizations.length > 0 && (
          <div className="p-3 space-y-3">
            {/* Generate All Button */}
            {visualizations.some((v) => v.status === 'pending') && (
              <button
                onClick={generateAll}
                className={cn(
                  'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium touch-manipulation',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50',
                  isDark
                    ? 'bg-violet-600/20 text-violet-400 hover:bg-violet-600/30'
                    : 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                )}
              >
                <Plus className="w-4 h-4" />
                Generate All Images
              </button>
            )}

            {/* Visualization Cards */}
            <div className="grid grid-cols-2 gap-2">
              {visualizations.map((item, index) => (
                <VisualizationCard
                  key={item.id}
                  item={item}
                  isDark={isDark}
                  isSelected={selectedIndex === index}
                  onClick={() => setSelectedIndex(selectedIndex === index ? null : index)}
                  onGenerate={() => generateVisualization(index)}
                  onInsert={() => {
                    if (item.url && onInsertImage) {
                      onInsertImage(item.url, item.position)
                    }
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Selected Item Detail */}
      <AnimatePresence>
        {selectedIndex !== null && visualizations[selectedIndex] && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={cn(
              'flex-shrink-0 border-t overflow-hidden',
              isDark ? 'border-zinc-800 bg-zinc-800/50' : 'border-zinc-200 bg-zinc-50'
            )}
          >
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className={cn('text-xs font-medium', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                  Source Text
                </span>
                <button
                  onClick={() => setSelectedIndex(null)}
                  className={cn(
                    'p-1 rounded transition-colors',
                    isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'
                  )}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className={cn('text-xs line-clamp-3', isDark ? 'text-zinc-300' : 'text-zinc-600')}>
                {visualizations[selectedIndex].sourceText}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ============================================================================
// VISUALIZATION CARD
// ============================================================================

interface VisualizationCardProps {
  item: VisualizationItem
  isDark: boolean
  isSelected: boolean
  onClick: () => void
  onGenerate: () => void
  onInsert: () => void
}

function VisualizationCard({
  item,
  isDark,
  isSelected,
  onClick,
  onGenerate,
  onInsert,
}: VisualizationCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-lg overflow-hidden border transition-all cursor-pointer',
        'aspect-square',
        isSelected
          ? isDark
            ? 'border-violet-500 ring-2 ring-violet-500/20'
            : 'border-violet-500 ring-2 ring-violet-500/20'
          : isDark
            ? 'border-zinc-700 hover:border-zinc-600'
            : 'border-zinc-200 hover:border-zinc-300',
        isDark ? 'bg-zinc-800' : 'bg-zinc-100'
      )}
      onClick={onClick}
    >
      {/* Image or Placeholder */}
      {item.url ? (
        <img
          src={item.url}
          alt={item.sourceText || 'Generated visualization'}
          className="w-full h-full object-cover"
        />
      ) : item.status === 'generating' ? (
        <div className="w-full h-full flex items-center justify-center">
          <Loader2 className={cn('w-6 h-6 animate-spin', isDark ? 'text-violet-400' : 'text-violet-600')} />
        </div>
      ) : item.status === 'error' ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
          <AlertCircle className={cn('w-5 h-5', isDark ? 'text-red-400' : 'text-red-500')} />
          <span className={cn('text-[10px] text-center', isDark ? 'text-red-300' : 'text-red-600')}>
            {item.error || 'Failed'}
          </span>
        </div>
      ) : (
        <div
          className="w-full h-full flex flex-col items-center justify-center gap-2 p-2"
          onClick={(e) => {
            e.stopPropagation()
            onGenerate()
          }}
        >
          <ImageIcon className={cn('w-6 h-6', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
          <span className={cn('text-[10px]', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
            Click to generate
          </span>
        </div>
      )}

      {/* Overlay Actions */}
      {item.url && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center gap-1 opacity-0 hover:opacity-100 transition-opacity',
            'bg-black/50'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onInsert}
            className="p-1.5 rounded-md bg-white/20 hover:bg-white/30 text-white"
            title="Insert into document"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={onGenerate}
            className="p-1.5 rounded-md bg-white/20 hover:bg-white/30 text-white"
            title="Regenerate"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <a
            href={item.url}
            download
            className="p-1.5 rounded-md bg-white/20 hover:bg-white/30 text-white"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      )}

      {/* Position Badge */}
      <div
        className={cn(
          'absolute top-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
          isDark ? 'bg-zinc-900/80 text-zinc-300' : 'bg-white/80 text-zinc-600'
        )}
      >
        P{item.position + 1}
      </div>
    </div>
  )
}

export { AIVisualizerPanel }
