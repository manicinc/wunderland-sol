/**
 * Picture Book View
 * @module components/quarry/ui/PictureBookView
 *
 * Visual mode that displays document content alongside
 * AI-generated illustrations in a picture book / graphic novel format.
 *
 * Features:
 * - Split view: text on left, image on right
 * - Click paragraph to generate illustration
 * - Reorder/swap images
 * - Export as illustrated document
 */

'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import {
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Download,
  ChevronUp,
  ChevronDown,
  X,
  BookOpen,
  Sparkles,
  AlertCircle,
  FileDown,
  Printer,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type PictureBookPage,
  splitIntoPictureBookPages,
  generateParagraphIllustration,
  VISUALIZATION_STYLES,
} from '@/lib/ai/documentVisualizer'
import { hasAnyLLMKey, hasImageGenerationKey } from '@/lib/llm'

// ============================================================================
// TYPES
// ============================================================================

export interface PictureBookViewProps {
  /** Document content */
  content: string
  /** Current theme */
  isDark: boolean
  /** Callback when user wants to close the view */
  onClose?: () => void
  /** Callback to export the illustrated document */
  onExport?: (pages: PictureBookPage[]) => void
  /** Default visual style */
  defaultStyle?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function PictureBookView({
  content,
  isDark,
  onClose,
  onExport,
  defaultStyle = 'storybook',
}: PictureBookViewProps) {
  // Parse content into pages
  const initialPages = useMemo(() => splitIntoPictureBookPages(content), [content])

  // State
  const [pages, setPages] = useState<PictureBookPage[]>(initialPages)
  const [style, setStyle] = useState(defaultStyle)
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [isGenerating, setIsGenerating] = useState<number | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [mobileView, setMobileView] = useState<'text' | 'image'>('text')

  // Check for API keys
  const hasLLM = useMemo(() => hasAnyLLMKey(), [])
  const hasImageGen = useMemo(() => hasImageGenerationKey(), [])
  const isEnabled = hasLLM && hasImageGen

  // Update pages when content changes
  useEffect(() => {
    setPages(splitIntoPictureBookPages(content))
    setCurrentPageIndex(0)
  }, [content])

  // Generate illustration for a page
  const generateIllustration = useCallback(
    async (pageIndex: number) => {
      if (!isEnabled || isGenerating !== null) return

      const page = pages[pageIndex]
      if (!page || page.text.length < 30) return

      setIsGenerating(pageIndex)

      try {
        const result = await generateParagraphIllustration(page.text, { style })

        setPages((prev) =>
          prev.map((p, i) =>
            i === pageIndex
              ? {
                  ...p,
                  imageUrl: result.url,
                  imagePrompt: result.prompt,
                }
              : p
          )
        )
      } catch (error) {
        console.error('[PictureBookView] Failed to generate illustration:', error)
      } finally {
        setIsGenerating(null)
      }
    },
    [pages, style, isEnabled, isGenerating]
  )

  // Navigate pages
  const goToPage = useCallback(
    (index: number) => {
      if (index >= 0 && index < pages.length) {
        setCurrentPageIndex(index)
      }
    },
    [pages.length]
  )

  // Export pages
  const handleExport = useCallback(() => {
    onExport?.(pages)
  }, [pages, onExport])

  // Print view
  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  // Current page
  const currentPage = pages[currentPageIndex]

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col',
        isDark ? 'bg-zinc-950' : 'bg-zinc-50'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex-shrink-0 flex items-center justify-between px-4 py-3 border-b',
          isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white/80 border-zinc-200',
          'backdrop-blur-sm'
        )}
      >
        {/* Left: Close and Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors touch-manipulation',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50',
              isDark
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200'
            )}
          >
            <X className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">Close</span>
          </button>
          <div className="flex items-center gap-2">
            <BookOpen className={cn('w-4 h-4', isDark ? 'text-amber-400' : 'text-amber-600')} />
            <span className={cn('text-sm font-medium', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
              Picture Book View
            </span>
          </div>
        </div>

        {/* Center: Page Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToPage(currentPageIndex - 1)}
            disabled={currentPageIndex === 0}
            className={cn(
              'p-2.5 rounded-lg transition-colors disabled:opacity-40 touch-manipulation',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50',
              isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'
            )}
          >
            <ChevronUp className="w-5 h-5 rotate-[-90deg]" />
          </button>
          <span className={cn('text-sm tabular-nums', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
            Page {currentPageIndex + 1} of {pages.length}
          </span>
          <button
            onClick={() => goToPage(currentPageIndex + 1)}
            disabled={currentPageIndex >= pages.length - 1}
            className={cn(
              'p-2.5 rounded-lg transition-colors disabled:opacity-40 touch-manipulation',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50',
              isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'
            )}
          >
            <ChevronDown className="w-5 h-5 rotate-[-90deg]" />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Style Selector */}
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className={cn(
              'px-2.5 py-1.5 text-sm rounded-lg border',
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

          <button
            onClick={handlePrint}
            className={cn(
              'p-2.5 rounded-lg transition-colors touch-manipulation hidden sm:flex',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50',
              isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'
            )}
            title="Print"
          >
            <Printer className="w-5 h-5" />
          </button>

          {onExport && (
            <button
              onClick={handleExport}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50',
                'bg-amber-600 hover:bg-amber-500 text-white'
              )}
            >
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}
        </div>
      </div>

      {/* API Key Warning */}
      {!isEnabled && (
        <div
          className={cn(
            'flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 border-b',
            isDark ? 'border-zinc-800 bg-amber-500/10' : 'border-zinc-200 bg-amber-50'
          )}
        >
          <AlertCircle className={cn('w-4 h-4', isDark ? 'text-amber-400' : 'text-amber-600')} />
          <span className={cn('text-sm', isDark ? 'text-amber-300' : 'text-amber-700')}>
            Configure LLM and image generation API keys in Settings to generate illustrations.
          </span>
        </div>
      )}

      {/* Mobile View Toggle */}
      <div
        className={cn(
          'md:hidden flex-shrink-0 flex border-b',
          isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-100/50'
        )}
      >
        <button
          onClick={() => setMobileView('text')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors touch-manipulation',
            mobileView === 'text'
              ? isDark
                ? 'bg-amber-500/20 text-amber-400 border-b-2 border-amber-500'
                : 'bg-amber-100 text-amber-700 border-b-2 border-amber-500'
              : isDark
                ? 'text-zinc-400 hover:text-zinc-200'
                : 'text-zinc-500 hover:text-zinc-800'
          )}
        >
          <BookOpen className="w-4 h-4" />
          Text
        </button>
        <button
          onClick={() => setMobileView('image')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors touch-manipulation',
            mobileView === 'image'
              ? isDark
                ? 'bg-amber-500/20 text-amber-400 border-b-2 border-amber-500'
                : 'bg-amber-100 text-amber-700 border-b-2 border-amber-500'
              : isDark
                ? 'text-zinc-400 hover:text-zinc-200'
                : 'text-zinc-500 hover:text-zinc-800'
          )}
        >
          <ImageIcon className="w-4 h-4" />
          Image
        </button>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Text Panel */}
        <div
          className={cn(
            'flex flex-col overflow-hidden',
            // Mobile: full width, hidden when viewing image
            mobileView === 'image' ? 'hidden md:flex' : 'flex',
            // Desktop: half width with border
            'md:w-1/2 md:border-r',
            isDark ? 'md:border-zinc-800' : 'md:border-zinc-200'
          )}
        >
          {/* Text Content */}
          <div className="flex-1 overflow-y-auto p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPageIndex}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="max-w-lg mx-auto"
              >
                <div
                  className={cn(
                    'text-lg leading-relaxed whitespace-pre-wrap',
                    isDark ? 'text-zinc-200' : 'text-zinc-800'
                  )}
                >
                  {currentPage?.text}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Page Thumbnails */}
          <div
            className={cn(
              'flex-shrink-0 flex items-center gap-2 px-4 py-3 border-t overflow-x-auto',
              isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-100/50'
            )}
          >
            {pages.map((page, index) => (
              <button
                key={page.id}
                onClick={() => goToPage(index)}
                className={cn(
                  'flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center text-xs font-medium transition-all touch-manipulation',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50',
                  currentPageIndex === index
                    ? isDark
                      ? 'bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/30'
                      : 'bg-amber-100 text-amber-700 ring-2 ring-amber-200'
                    : isDark
                      ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      : 'bg-zinc-200 text-zinc-500 hover:bg-zinc-300',
                  page.imageUrl && 'ring-2 ring-green-500/30'
                )}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Image Panel */}
        <div
          className={cn(
            'flex flex-col',
            // Mobile: full width, hidden when viewing text
            mobileView === 'text' ? 'hidden md:flex' : 'flex flex-1',
            // Desktop: half width
            'md:w-1/2',
            isDark ? 'bg-zinc-900' : 'bg-zinc-100'
          )}
        >
          <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPageIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="relative w-full max-w-md aspect-square"
              >
                {currentPage?.imageUrl ? (
                  <div className="relative w-full h-full group">
                    <img
                      src={currentPage.imageUrl}
                      alt={`Illustration for page ${currentPageIndex + 1}`}
                      className="w-full h-full object-cover rounded-xl shadow-2xl"
                    />
                    {/* Overlay Actions */}
                    <div
                      className={cn(
                        'absolute inset-0 flex items-center justify-center gap-2 rounded-xl',
                        'opacity-0 group-hover:opacity-100 transition-opacity',
                        'bg-black/50'
                      )}
                    >
                      <button
                        onClick={() => generateIllustration(currentPageIndex)}
                        disabled={isGenerating !== null}
                        className={cn(
                          'p-3.5 rounded-full bg-white/20 hover:bg-white/30 text-white touch-manipulation',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50'
                        )}
                        title="Regenerate"
                      >
                        <RefreshCw className="w-5 h-5" />
                      </button>
                      <a
                        href={currentPage.imageUrl}
                        download={`page-${currentPageIndex + 1}.png`}
                        className={cn(
                          'p-3.5 rounded-full bg-white/20 hover:bg-white/30 text-white touch-manipulation',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50'
                        )}
                        title="Download"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                    </div>
                  </div>
                ) : isGenerating === currentPageIndex ? (
                  <div
                    className={cn(
                      'w-full h-full rounded-xl flex flex-col items-center justify-center gap-4',
                      isDark ? 'bg-zinc-800' : 'bg-zinc-200'
                    )}
                  >
                    <Loader2
                      className={cn(
                        'w-12 h-12 animate-spin',
                        isDark ? 'text-amber-400' : 'text-amber-600'
                      )}
                    />
                    <span className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                      Generating illustration...
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => generateIllustration(currentPageIndex)}
                    disabled={!isEnabled || currentPage.text.length < 30}
                    className={cn(
                      'w-full h-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-colors touch-manipulation',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50',
                      isDark
                        ? 'border-zinc-700 hover:border-amber-500/50 hover:bg-zinc-800/50'
                        : 'border-zinc-300 hover:border-amber-500/50 hover:bg-zinc-200/50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-16 h-16 rounded-full flex items-center justify-center',
                        isDark ? 'bg-zinc-800' : 'bg-zinc-200'
                      )}
                    >
                      <ImageIcon
                        className={cn('w-8 h-8', isDark ? 'text-zinc-500' : 'text-zinc-400')}
                      />
                    </div>
                    <div className="text-center">
                      <p
                        className={cn(
                          'text-sm font-medium',
                          isDark ? 'text-zinc-300' : 'text-zinc-600'
                        )}
                      >
                        Click to Generate Illustration
                      </p>
                      <p
                        className={cn(
                          'text-xs mt-1',
                          isDark ? 'text-zinc-500' : 'text-zinc-400'
                        )}
                      >
                        {VISUALIZATION_STYLES[style]?.label || 'Illustration'} style
                      </p>
                    </div>
                  </button>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Image Info */}
          {currentPage?.imagePrompt && (
            <div
              className={cn(
                'flex-shrink-0 px-4 py-3 border-t',
                isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-100/50'
              )}
            >
              <p
                className={cn('text-xs line-clamp-2', isDark ? 'text-zinc-500' : 'text-zinc-400')}
              >
                <span className="font-medium">Prompt:</span> {currentPage.imagePrompt}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .fixed {
            position: relative !important;
          }
          button,
          select {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}

export { PictureBookView }
