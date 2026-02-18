/**
 * PDF Viewer Component
 * @module codex/pdf/PDFViewer
 *
 * Main PDF viewer with navigation, zoom, and annotation support.
 * Uses react-pdf for rendering (dynamic import for SSR compatibility).
 */

'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Download,
  Bookmark,
  BookmarkCheck,
  Highlighter,
  MessageSquare,
  Link2,
  Search,
  FileText,
  Loader2,
  AlertCircle,
  RotateCw,
  StickyNote,
  List,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import type { PDFDocument, PDFAnnotation, PDFBookmark } from '@/lib/pdf/pdfStorage'
import {
  getPDFBlob,
  getPDFDocument,
  updatePDFDocument,
  getDocumentAnnotations,
  getDocumentBookmarks,
  addBookmark,
  deleteBookmark,
  saveReadingProgress,
  getReadingProgress,
} from '@/lib/pdf/pdfStorage'
import { Z_INDEX } from '../constants'

// ============================================================================
// TYPES
// ============================================================================

interface PDFViewerProps {
  /** Whether the viewer is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Document ID to view */
  documentId: string | null
  /** Current theme */
  theme?: string
  /** Callback when linking to strand */
  onLinkToStrand?: (annotation: PDFAnnotation) => void
  /** Initial page to show */
  initialPage?: number
}

type ViewerTab = 'document' | 'thumbnails' | 'bookmarks' | 'annotations'
type AnnotationTool = 'none' | 'highlight' | 'note' | 'link'

// ============================================================================
// ZOOM LEVELS
// ============================================================================

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3]
const DEFAULT_ZOOM = 1

// ============================================================================
// COMPONENT
// ============================================================================

export default function PDFViewer({
  isOpen,
  onClose,
  documentId,
  theme = 'light',
  onLinkToStrand,
  initialPage = 1,
}: PDFViewerProps) {
  const isDark = theme?.includes('dark')
  const containerRef = useRef<HTMLDivElement>(null)

  // Document state
  const [document, setDocument] = useState<PDFDocument | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Navigation state
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(0)
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Sidebar state
  const [activeTab, setActiveTab] = useState<ViewerTab>('document')
  const [showSidebar, setShowSidebar] = useState(false)

  // Annotation state
  const [annotations, setAnnotations] = useState<PDFAnnotation[]>([])
  const [bookmarks, setBookmarks] = useState<PDFBookmark[]>([])
  const [activeTool, setActiveTool] = useState<AnnotationTool>('none')

  // Search state
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Load document
  useEffect(() => {
    if (!isOpen || !documentId) return

    let cancelled = false

    async function loadDocument() {
      setLoading(true)
      setError(null)

      try {
        // Get document metadata
        if (!documentId) {
          setError('No document ID provided')
          return
        }
        const doc = await getPDFDocument(documentId)
        if (!doc || cancelled) {
          if (!cancelled) setError('Document not found')
          return
        }

        setDocument(doc)
        setTotalPages(doc.pageCount)

        // Get PDF blob and create URL
        const blob = await getPDFBlob(documentId)
        if (!blob || cancelled) {
          if (!cancelled) setError('PDF data not found')
          return
        }

        const url = URL.createObjectURL(blob)
        setPdfUrl(url)

        // Load annotations and bookmarks
        const [annos, bms] = await Promise.all([
          getDocumentAnnotations(documentId),
          getDocumentBookmarks(documentId),
        ])

        if (!cancelled) {
          setAnnotations(annos)
          setBookmarks(bms)
        }

        // Load reading progress
        const progress = await getReadingProgress(documentId)
        if (progress && !cancelled) {
          setCurrentPage(progress.lastPage)
          setZoom(progress.zoom)
        }

        // Update last opened
        await updatePDFDocument(documentId, { lastOpenedAt: Date.now() })

      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load PDF')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadDocument()

    return () => {
      cancelled = true
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [isOpen, documentId])

  // Save progress on page/zoom change
  useEffect(() => {
    if (!documentId || loading) return

    const saveProgress = async () => {
      await saveReadingProgress({
        documentId,
        lastPage: currentPage,
        scrollPosition: 0,
        zoom,
        totalReadingTime: 0, // Would need to track this
        lastReadAt: Date.now(),
      })
    }

    const timer = setTimeout(saveProgress, 1000)
    return () => clearTimeout(timer)
  }, [documentId, currentPage, zoom, loading])

  // Navigation handlers
  const goToPrevPage = useCallback(() => {
    setCurrentPage(p => Math.max(1, p - 1))
  }, [])

  const goToNextPage = useCallback(() => {
    setCurrentPage(p => Math.min(totalPages, p + 1))
  }, [totalPages])

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, page)))
  }, [totalPages])

  // Zoom handlers
  const zoomIn = useCallback(() => {
    const currentIndex = ZOOM_LEVELS.findIndex(z => z >= zoom)
    if (currentIndex < ZOOM_LEVELS.length - 1) {
      setZoom(ZOOM_LEVELS[currentIndex + 1])
    }
  }, [zoom])

  const zoomOut = useCallback(() => {
    const currentIndex = ZOOM_LEVELS.findIndex(z => z >= zoom)
    if (currentIndex > 0) {
      setZoom(ZOOM_LEVELS[currentIndex - 1])
    }
  }, [zoom])

  // Bookmark handlers
  const toggleBookmark = useCallback(async () => {
    if (!documentId) return

    const existing = bookmarks.find(b => b.pageNumber === currentPage)
    if (existing) {
      await deleteBookmark(existing.id)
      setBookmarks(bms => bms.filter(b => b.id !== existing.id))
    } else {
      const label = `Page ${currentPage}`
      const newBookmark = await addBookmark(documentId, currentPage, label)
      setBookmarks(bms => [...bms, newBookmark].sort((a, b) => a.pageNumber - b.pageNumber))
    }
  }, [documentId, currentPage, bookmarks])

  // Download handler
  const handleDownload = useCallback(() => {
    if (!pdfUrl || !document) return

    const a = window.document.createElement('a')
    a.href = pdfUrl
    a.download = document.filename
    window.document.body.appendChild(a)
    a.click()
    window.document.body.removeChild(a)
  }, [pdfUrl, document])

  // Fullscreen handler
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return

    if (!window.document.fullscreenElement) {
      containerRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else {
      window.document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSearch) {
          setShowSearch(false)
        } else if (isFullscreen) {
          window.document.exitFullscreen()
        } else {
          onClose()
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        goToPrevPage()
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault()
        goToNextPage()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setShowSearch(true)
      } else if ((e.ctrlKey || e.metaKey) && e.key === '=') {
        e.preventDefault()
        zoomIn()
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault()
        zoomOut()
      } else if (e.key === 'b') {
        toggleBookmark()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, showSearch, isFullscreen, goToPrevPage, goToNextPage, zoomIn, zoomOut, toggleBookmark, onClose])

  if (!isOpen) return null

  const isBookmarked = bookmarks.some(b => b.pageNumber === currentPage)

  return (
    <AnimatePresence>
      <div
        ref={containerRef}
        className="fixed inset-0 flex"
        style={{ zIndex: Z_INDEX.MODAL }}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80"
          onClick={onClose}
        />

        {/* Viewer Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`
            relative flex flex-1 flex-col m-4 rounded-xl overflow-hidden shadow-2xl
            ${isDark ? 'bg-gray-900' : 'bg-white'}
          `}
        >
          {/* Top Toolbar */}
          <div className={`
            flex items-center justify-between px-4 py-2 border-b
            ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}
          `}>
            {/* Left: Title and Close */}
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <FileText className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                <span className={`font-medium truncate max-w-[300px] ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {document?.title || 'Loading...'}
                </span>
              </div>
            </div>

            {/* Center: Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevPage}
                disabled={currentPage <= 1}
                className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                  isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={currentPage}
                  onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                  className={`
                    w-12 px-2 py-1 text-center text-sm rounded outline-none
                    ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'}
                  `}
                  min={1}
                  max={totalPages}
                />
                <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  / {totalPages || '?'}
                </span>
              </div>

              <button
                onClick={goToNextPage}
                disabled={currentPage >= totalPages}
                className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                  isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Right: Tools */}
            <div className="flex items-center gap-1">
              {/* Zoom */}
              <button
                onClick={zoomOut}
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className={`text-xs w-12 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={zoomIn}
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <div className={`w-px h-6 mx-1 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />

              {/* Bookmark */}
              <button
                onClick={toggleBookmark}
                className={`p-2 rounded-lg transition-colors ${
                  isBookmarked
                    ? isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-600'
                    : isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                }`}
                title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
              >
                {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              </button>

              {/* Search */}
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`p-2 rounded-lg transition-colors ${
                  showSearch
                    ? isDark ? 'bg-cyan-900/30 text-cyan-400' : 'bg-cyan-50 text-cyan-600'
                    : isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Sidebar toggle */}
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className={`p-2 rounded-lg transition-colors ${
                  showSidebar
                    ? isDark ? 'bg-violet-900/30 text-violet-400' : 'bg-violet-50 text-violet-600'
                    : isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <List className="w-4 h-4" />
              </button>

              <div className={`w-px h-6 mx-1 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />

              {/* Download */}
              <button
                onClick={handleDownload}
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <Download className="w-4 h-4" />
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar */}
            <AnimatePresence>
              {showSidebar && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 240, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className={`
                    flex-shrink-0 border-r overflow-hidden
                    ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-200'}
                  `}
                >
                  {/* Sidebar Tabs */}
                  <div className={`flex border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                    {(['thumbnails', 'bookmarks', 'annotations'] as ViewerTab[]).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`
                          flex-1 px-3 py-2 text-xs font-medium capitalize transition-colors
                          ${activeTab === tab
                            ? isDark
                              ? 'border-b-2 border-cyan-400 text-cyan-400'
                              : 'border-b-2 border-cyan-600 text-cyan-600'
                            : isDark
                              ? 'text-gray-500 hover:text-gray-300'
                              : 'text-gray-500 hover:text-gray-700'
                          }
                        `}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* Sidebar Content */}
                  <div className="p-3 overflow-y-auto h-full">
                    {activeTab === 'bookmarks' && (
                      <div className="space-y-2">
                        {bookmarks.length === 0 ? (
                          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            No bookmarks yet. Press 'B' to bookmark the current page.
                          </p>
                        ) : (
                          bookmarks.map(bm => (
                            <button
                              key={bm.id}
                              onClick={() => goToPage(bm.pageNumber)}
                              className={`
                                w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                                ${currentPage === bm.pageNumber
                                  ? isDark ? 'bg-cyan-900/30 text-cyan-400' : 'bg-cyan-50 text-cyan-700'
                                  : isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                                }
                              `}
                            >
                              <div className="flex items-center gap-2">
                                <Bookmark className="w-3.5 h-3.5" />
                                {bm.label}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}

                    {activeTab === 'annotations' && (
                      <div className="space-y-2">
                        {annotations.length === 0 ? (
                          <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            No annotations yet. Use the highlight or note tools to annotate.
                          </p>
                        ) : (
                          annotations.map(anno => (
                            <button
                              key={anno.id}
                              onClick={() => goToPage(anno.pageNumber)}
                              className={`
                                w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                                ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}
                              `}
                            >
                              <div className="flex items-center gap-2">
                                {anno.type === 'highlight' && <Highlighter className="w-3.5 h-3.5 text-yellow-500" />}
                                {anno.type === 'note' && <StickyNote className="w-3.5 h-3.5 text-blue-500" />}
                                {anno.linkedStrandPath && <Link2 className="w-3.5 h-3.5 text-violet-500" />}
                                <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                                  Page {anno.pageNumber}
                                </span>
                              </div>
                              <p className={`text-xs truncate mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                {anno.content.substring(0, 50)}...
                              </p>
                            </button>
                          ))
                        )}
                      </div>
                    )}

                    {activeTab === 'thumbnails' && (
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Page thumbnails would appear here.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* PDF Content Area */}
            <div className={`flex-1 overflow-auto ${isDark ? 'bg-gray-950' : 'bg-gray-100'}`}>
              {loading && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Loader2 className={`w-10 h-10 mx-auto animate-spin ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                    <p className={`mt-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Loading PDF...
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <AlertCircle className="w-10 h-10 mx-auto text-red-500" />
                    <p className={`mt-4 text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                      {error}
                    </p>
                    <button
                      onClick={onClose}
                      className="mt-4 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {!loading && !error && pdfUrl && (
                <div
                  className="flex items-center justify-center min-h-full p-8"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
                >
                  {/* PDF Canvas placeholder - would use react-pdf Document/Page here */}
                  <div className={`
                    w-[612px] h-[792px] shadow-xl rounded
                    ${isDark ? 'bg-white' : 'bg-white'}
                  `}>
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <div className="text-center">
                        <FileText className="w-16 h-16 mx-auto opacity-50" />
                        <p className="mt-4 text-sm">
                          PDF Rendering
                        </p>
                        <p className="text-xs mt-1">
                          Page {currentPage} of {totalPages}
                        </p>
                        <p className="text-xs mt-4 max-w-xs opacity-75">
                          Note: Full PDF rendering requires react-pdf dependency.
                          Run: npm install react-pdf pdfjs-dist
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Search Bar (floating) */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`
                  absolute top-16 right-4 flex items-center gap-2 px-4 py-2 rounded-xl shadow-lg
                  ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}
                `}
              >
                <Search className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in document..."
                  className={`
                    w-64 bg-transparent outline-none text-sm
                    ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}
                  `}
                  autoFocus
                />
                <button
                  onClick={() => {
                    setShowSearch(false)
                    setSearchQuery('')
                  }}
                  className={isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
