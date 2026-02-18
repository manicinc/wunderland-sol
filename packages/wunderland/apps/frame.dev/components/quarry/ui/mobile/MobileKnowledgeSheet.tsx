'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion'
import { 
  X, 
  GripHorizontal,
  List,
  Link2,
  Info,
  ChevronRight,
  Tag,
  Clock,
  User,
  FileText
} from 'lucide-react'
import type { StrandMetadata } from '../../types'

interface TOCItem {
  id: string
  text: string
  level: number
}

interface MobileKnowledgeSheetProps {
  isOpen: boolean
  onClose: () => void
  metadata?: StrandMetadata
  tocItems?: TOCItem[]
  theme?: string
  onNavigateToHeading?: (id: string) => void
}

type SheetHeight = 'peek' | 'half' | 'full'

const SHEET_HEIGHTS: Record<SheetHeight, string> = {
  peek: '25vh',
  half: '50vh',
  full: '90vh'
}

export default function MobileKnowledgeSheet({
  isOpen,
  onClose,
  metadata,
  tocItems = [],
  theme = 'light',
  onNavigateToHeading
}: MobileKnowledgeSheetProps) {
  const [sheetHeight, setSheetHeight] = useState<SheetHeight>('half')
  const [activeTab, setActiveTab] = useState<'toc' | 'meta' | 'related'>('toc')
  const dragControls = useDragControls()
  const constraintsRef = useRef<HTMLDivElement>(null)

  const isDark = theme?.includes('dark')

  // Handle drag end to snap to heights
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const velocity = info.velocity.y
    const offset = info.offset.y

    // Fast swipe down = close or shrink
    if (velocity > 500) {
      if (sheetHeight === 'peek') {
        onClose()
      } else if (sheetHeight === 'half') {
        setSheetHeight('peek')
      } else {
        setSheetHeight('half')
      }
      return
    }

    // Fast swipe up = expand
    if (velocity < -500) {
      if (sheetHeight === 'peek') {
        setSheetHeight('half')
      } else if (sheetHeight === 'half') {
        setSheetHeight('full')
      }
      return
    }

    // Slow drag - snap based on position
    if (offset > 100) {
      if (sheetHeight === 'peek') {
        onClose()
      } else if (sheetHeight === 'half') {
        setSheetHeight('peek')
      } else {
        setSheetHeight('half')
      }
    } else if (offset < -100) {
      if (sheetHeight === 'peek') {
        setSheetHeight('half')
      } else if (sheetHeight === 'half') {
        setSheetHeight('full')
      }
    }
  }

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const tabs = [
    { id: 'toc' as const, label: 'Contents', icon: List },
    { id: 'meta' as const, label: 'Info', icon: Info },
    { id: 'related' as const, label: 'Related', icon: Link2 }
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40 md:hidden"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            ref={constraintsRef}
            initial={{ y: '100%' }}
            animate={{ y: 0, height: SHEET_HEIGHTS[sheetHeight] }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className={`
              fixed bottom-0 left-0 right-0 z-50 md:hidden
              rounded-t-3xl shadow-2xl overflow-hidden
              ${isDark ? 'bg-zinc-900' : 'bg-white'}
            `}
          >
            {/* Drag Handle */}
            <div
              className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className={`w-12 h-1.5 rounded-full ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
            </div>

            {/* Header with Tabs */}
            <div className={`px-4 pb-2 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <div className="flex items-center gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${activeTab === tab.id
                        ? isDark
                          ? 'bg-zinc-800 text-cyan-400'
                          : 'bg-zinc-100 text-cyan-600'
                        : isDark
                          ? 'text-zinc-400 hover:text-zinc-200'
                          : 'text-zinc-500 hover:text-zinc-700'
                      }
                    `}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span className="hidden xs:inline">{tab.label}</span>
                  </button>
                ))}

                <button
                  onClick={onClose}
                  className={`p-2 rounded-lg ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: `calc(${SHEET_HEIGHTS[sheetHeight]} - 100px)` }}>
              {/* Table of Contents */}
              {activeTab === 'toc' && (
                <div className="space-y-1">
                  {tocItems.length > 0 ? (
                    tocItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          onNavigateToHeading?.(item.id)
                          if (sheetHeight !== 'peek') {
                            setSheetHeight('peek')
                          }
                        }}
                        className={`
                          w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2
                          ${isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'}
                        `}
                        style={{ paddingLeft: `${(item.level - 1) * 16 + 12}px` }}
                      >
                        <ChevronRight className={`w-3 h-3 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
                        <span className={`text-sm ${item.level === 1 ? 'font-medium' : ''}`}>
                          {item.text}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className={`text-center py-8 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      <List className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No headings found</p>
                    </div>
                  )}
                </div>
              )}

              {/* Metadata */}
              {activeTab === 'meta' && (
                <div className="space-y-4">
                  {metadata?.title && (
                    <div>
                      <h3 className={`text-lg font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                        {metadata.title}
                      </h3>
                      {metadata.summary && (
                        <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          {metadata.summary}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Tags */}
                  {metadata?.tags && (Array.isArray(metadata.tags) ? metadata.tags : [metadata.tags]).length > 0 && (
                    <div className="space-y-2">
                      <div className={`flex items-center gap-2 text-xs font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        <Tag className="w-3 h-3" />
                        <span>Tags</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(Array.isArray(metadata.tags) ? metadata.tags : [metadata.tags]).map((tag, i) => (
                          <span
                            key={i}
                            className={`px-2 py-1 rounded-full text-xs ${
                              isDark
                                ? 'bg-zinc-800 text-zinc-300'
                                : 'bg-zinc-100 text-zinc-600'
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Author */}
                  {metadata?.author && (
                    <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      <User className="w-4 h-4" />
                      <span>{typeof metadata.author === 'string' ? metadata.author : metadata.author.name}</span>
                    </div>
                  )}

                  {/* Date */}
                  {metadata?.date && (
                    <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      <Clock className="w-4 h-4" />
                      <span>{new Date(metadata.date).toLocaleDateString()}</span>
                    </div>
                  )}

                  {!metadata && (
                    <div className={`text-center py-8 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No metadata available</p>
                    </div>
                  )}
                </div>
              )}

              {/* Related */}
              {activeTab === 'related' && (() => {
                // Flatten relationships object into array
                const relatedItems: Array<{ target: string; type: string }> = []
                if (metadata?.relationships) {
                  const rels = metadata.relationships
                  if (rels.references) {
                    rels.references.forEach(ref => relatedItems.push({ target: ref, type: 'reference' }))
                  }
                  if (rels.prerequisites) {
                    rels.prerequisites.forEach(ref => relatedItems.push({ target: ref, type: 'prerequisite' }))
                  }
                  if (rels.seeAlso) {
                    rels.seeAlso.forEach(ref => relatedItems.push({ target: ref, type: 'see also' }))
                  }
                }
                
                return (
                  <div className="space-y-3">
                    {relatedItems.length > 0 ? (
                      relatedItems.map((rel, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}`}
                        >
                          <div className="flex items-center gap-2">
                            <FileText className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                            <span className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                              {rel.target}
                            </span>
                          </div>
                          <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            {rel.type}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className={`text-center py-8 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        <Link2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No related strands</p>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
