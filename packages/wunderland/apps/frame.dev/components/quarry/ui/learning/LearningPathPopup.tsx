/**
 * Learning Path Popover - Feature-rich exploration panel
 * @module codex/ui/LearningPathPopup
 * 
 * @remarks
 * Rich learning path exploration with:
 * - Prerequisites and references with search
 * - Tag-based filtering and quick navigation
 * - Visual mastery indicators
 * - Quick actions and deep linking
 */

'use client'

import React, { useRef, useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { 
  X, Route, ArrowLeft, ArrowRight, BookOpen, ExternalLink, Sparkles, 
  ChevronRight, Search, Tag, Target, Play,
  GraduationCap, Zap, TreePine, Network, ChevronDown
} from 'lucide-react'
import type { StrandMetadata, GitHubFile } from '../../types'

interface LearningPathPopupProps {
  isOpen: boolean
  onClose: () => void
  metadata: StrandMetadata
  currentPath: string
  currentFile?: GitHubFile | null
  allFiles?: GitHubFile[]
  onNavigate?: (path: string) => void
  theme?: string
}

type ViewTab = 'relations' | 'tags' | 'suggest'

export default function LearningPathPopup({
  isOpen,
  onClose,
  metadata,
  currentPath,
  currentFile: _currentFile,
  allFiles = [],
  onNavigate,
  theme = 'light',
}: LearningPathPopupProps) {
  // _currentFile is available but not currently used
  const isDark = theme.includes('dark')
  const popoverRef = useRef<HTMLDivElement>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<ViewTab>('relations')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    prerequisites: true,
    references: true,
    seeAlso: false,
  })
  
  const prerequisites = metadata.relationships?.prerequisites || []
  const references = metadata.relationships?.references || []
  const seeAlso = metadata.relationships?.seeAlso || []
  
  // Memoize tags to prevent dependency changes on every render
  const tags = useMemo(() => {
    return Array.isArray(metadata.tags) ? metadata.tags : metadata.tags ? [metadata.tags] : []
  }, [metadata.tags])
  
  const hasContent = prerequisites.length > 0 || references.length > 0 || seeAlso.length > 0
  const totalCount = prerequisites.length + references.length + seeAlso.length

  // Find related files by tags
  const relatedByTags = useMemo(() => {
    if (tags.length === 0 || allFiles.length === 0) return []
    
    return allFiles
      .filter(f => f.path !== currentPath && f.name.endsWith('.md'))
      .map(file => {
        // This is a simplified check - in production, you'd parse frontmatter
        const matchingTags = tags.filter(tag => 
          file.path.toLowerCase().includes(tag.toLowerCase()) ||
          file.name.toLowerCase().includes(tag.toLowerCase())
        )
        return { file, matchingTags, score: matchingTags.length }
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
  }, [tags, allFiles, currentPath])

  // Suggested next steps based on structure
  const suggestedNext = useMemo(() => {
    if (allFiles.length === 0) return []
    
    const currentDir = currentPath.split('/').slice(0, -1).join('/')
    const siblings = allFiles.filter(f => 
      f.path !== currentPath &&
      f.name.endsWith('.md') &&
      f.path.startsWith(currentDir) &&
      f.path.split('/').length === currentPath.split('/').length
    )
    return siblings.slice(0, 5)
  }, [allFiles, currentPath])

  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen || !isMounted) return null

  const handleNavigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path)
      onClose()
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const filterBySearch = (items: string[]) => {
    if (!searchQuery) return items
    const q = searchQuery.toLowerCase()
    return items.filter(item => 
      item.toLowerCase().includes(q) ||
      item.split('/').pop()?.replace('.md', '').replace(/-/g, ' ').toLowerCase().includes(q)
    )
  }

  const filteredPrereqs = filterBySearch(prerequisites)
  const filteredRefs = filterBySearch(references)

  const popoverContent = (
    <AnimatePresence>
      {/* Mobile backdrop - matches QAInterface */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[299]"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      {isOpen && (
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }}
          className={`
            fixed z-[300] flex flex-col
            /* Desktop: bottom-right panel */
            md:bottom-4 md:right-4 md:w-[min(92vw,640px)] md:max-h-[80vh]
            /* Mobile portrait: full screen with safe areas */
            max-md:inset-0 max-md:w-full max-md:h-full
            /* Mobile landscape: constrained width, full height */
            max-md:landscape:inset-y-0 max-md:landscape:right-0 max-md:landscape:left-auto
            max-md:landscape:w-[min(85vw,480px)]
            overflow-hidden
            md:rounded-2xl md:shadow-2xl
            max-md:rounded-none
            /* Safe area padding for notched devices */
            max-md:pb-[env(safe-area-inset-bottom)]
            max-md:pt-[env(safe-area-inset-top)]
            ${isDark 
              ? 'bg-zinc-900 border border-zinc-700/80' 
              : 'bg-white border border-zinc-200'
            }
          `}
        >
          {/* Header - responsive sizing */}
          <div className={`
            relative px-3 py-3 sm:px-4 sm:py-4 border-b shrink-0
            ${isDark 
              ? 'border-zinc-800 bg-gradient-to-r from-cyan-950/50 via-zinc-900 to-emerald-950/30' 
              : 'border-zinc-200 bg-gradient-to-r from-cyan-50/80 via-white to-emerald-50/50'
            }
          `}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                {/* Icon - smaller on mobile */}
                <div className={`
                  p-2 sm:p-2.5 rounded-xl shrink-0
                  ${isDark 
                    ? 'bg-gradient-to-br from-cyan-900/70 to-emerald-900/50 ring-1 ring-cyan-700/50 shadow-lg shadow-cyan-900/20' 
                    : 'bg-gradient-to-br from-cyan-100 to-emerald-100 ring-1 ring-cyan-200 shadow-lg shadow-cyan-200/30'
                  }
                `}>
                  <Route className={`w-5 h-5 sm:w-6 sm:h-6 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className={`text-base sm:text-lg font-bold truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    Spiral Learning Path
                  </h2>
                  <p className={`text-[10px] sm:text-xs flex items-center gap-1 sm:gap-2 flex-wrap ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    <span className="hidden sm:inline">Navigate prerequisites & relationships</span>
                    <span className="sm:hidden">Prerequisites & links</span>
                    <span className={`
                      inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-semibold uppercase tracking-wide
                      ${totalCount > 0 
                        ? isDark ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                        : isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'
                      }
                    `}>
                      <GraduationCap className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      {totalCount}
                    </span>
                  </p>
                </div>
              </div>
              {/* Close button - larger touch target on mobile */}
              <button
                onClick={onClose}
                className={`
                  p-2 sm:p-2.5 rounded-xl transition-all shrink-0
                  min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0
                  flex items-center justify-center
                  ${isDark 
                    ? 'hover:bg-zinc-800 active:bg-zinc-700 text-zinc-400 hover:text-zinc-200' 
                    : 'hover:bg-zinc-100 active:bg-zinc-200 text-zinc-500 hover:text-zinc-700'
                  }
                `}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Tab Navigation - scrollable on very small screens */}
            <div className="flex gap-1.5 sm:gap-2 mt-3 sm:mt-4 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
              {[
                { id: 'relations' as ViewTab, label: 'Relations', icon: Network, count: totalCount, color: 'cyan' },
                { id: 'tags' as ViewTab, label: 'Tags', icon: Tag, count: tags.length, color: 'purple' },
                { id: 'suggest' as ViewTab, label: 'Suggested', icon: Zap, count: suggestedNext.length, color: 'amber' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex-1 flex items-center justify-center gap-1 sm:gap-2 
                    px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl 
                    text-xs sm:text-sm font-semibold transition-all
                    min-h-[44px] /* Touch-friendly minimum height */
                    ${activeTab === tab.id
                      ? isDark 
                        ? `bg-${tab.color}-900/50 text-${tab.color}-100 ring-2 ring-${tab.color}-700/50 shadow-lg shadow-${tab.color}-900/20` 
                        : `bg-${tab.color}-100 text-${tab.color}-800 ring-2 ring-${tab.color}-300 shadow-lg shadow-${tab.color}-200/50`
                      : isDark
                        ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/70 active:bg-zinc-800'
                        : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200'
                    }
                  `}
                >
                  <tab.icon className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`
                      px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold
                      ${activeTab === tab.id
                        ? isDark ? 'bg-white/20 text-white' : 'bg-black/10 text-current'
                        : isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-200 text-zinc-600'
                      }
                    `}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* Search Bar - responsive sizing */}
          <div className={`px-3 sm:px-4 py-2 sm:py-3 border-b shrink-0 ${isDark ? 'border-zinc-800 bg-zinc-950/50' : 'border-zinc-100 bg-zinc-50/80'}`}>
            <div className="relative">
              <Search className={`absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === 'relations' ? "Search prerequisites..." :
                  activeTab === 'tags' ? "Search tags..." :
                  "Search paths..."
                }
                className={`
                  w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm transition-all
                  ${isDark 
                    ? 'bg-zinc-800/80 border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-600' 
                    : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500'
                  }
                  border-2 focus:outline-none
                `}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`
                    absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors
                    ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}
                  `}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          
          {/* Content - FIXED height to prevent tab switching size changes */}
          <div className={`
            overflow-y-auto
            /* Fixed heights - no flex-1 to prevent size changes between tabs */
            md:h-[400px]
            max-md:portrait:h-[calc(100vh-360px)] 
            max-md:landscape:h-[calc(100vh-220px)]
            min-h-[280px]
            p-3 sm:p-4 space-y-3 sm:space-y-4
            overscroll-contain
            -webkit-overflow-scrolling-touch
          `}>
            
            {/* Relations Tab */}
            {activeTab === 'relations' && (
              <>
                {/* Current Strand Card - responsive sizing */}
                <div className={`
                  p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2
                  ${isDark 
                    ? 'bg-gradient-to-br from-emerald-950/40 to-cyan-950/30 border-emerald-800/60 shadow-lg shadow-emerald-900/10' 
                    : 'bg-gradient-to-br from-emerald-50 to-cyan-50 border-emerald-200 shadow-lg shadow-emerald-100'
                  }
                `}>
                  <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                    <div className={`p-1 sm:p-1.5 rounded-lg ${isDark ? 'bg-emerald-900/50' : 'bg-emerald-100'}`}>
                      <Sparkles className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    </div>
                    <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      You are here
                    </span>
                  </div>
                  <p className={`text-sm sm:text-base font-bold line-clamp-2 ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
                    {metadata.title || currentPath.split('/').pop()?.replace('.md', '').replace(/-/g, ' ')}
                  </p>
                  {metadata.summary && (
                    <p className={`text-xs sm:text-sm mt-1.5 sm:mt-2 line-clamp-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {metadata.summary}
                    </p>
                  )}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-2 sm:mt-3">
                      {tags.slice(0, 4).map((tag, i) => (
                        <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-zinc-800/80 text-zinc-400' : 'bg-white/80 text-zinc-600'}`}>
                          {tag}
                        </span>
                      ))}
                      {tags.length > 4 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-zinc-800/80 text-zinc-500' : 'bg-white/80 text-zinc-500'}`}>
                          +{tags.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {!hasContent && !searchQuery ? (
                  <div className={`text-center py-12 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                      <BookOpen className="w-8 h-8 opacity-40" />
                    </div>
                    <p className="text-base font-semibold">No relationships defined</p>
                    <p className="text-sm mt-2 opacity-70 max-w-xs mx-auto">
                      Add prerequisites and references to the strand&apos;s YAML frontmatter to enable learning path navigation
                    </p>
                    <button
                      onClick={() => setActiveTab('suggest')}
                      className={`
                        mt-4 px-4 py-2 rounded-xl text-sm font-medium transition-all
                        ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'}
                      `}
                    >
                      <Zap className="w-4 h-4 inline mr-2" />
                      View Suggested Paths
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Prerequisites Section */}
                    {(filteredPrereqs.length > 0 || (prerequisites.length > 0 && !searchQuery)) && (
                      <div className={`rounded-xl border ${isDark ? 'border-zinc-800 bg-zinc-800/30' : 'border-zinc-200 bg-zinc-50/50'}`}>
                        <button
                          onClick={() => toggleSection('prerequisites')}
                          className={`w-full flex items-center justify-between px-4 py-3 text-left ${isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100/50'} rounded-t-xl transition-colors`}
                        >
                          <div className="flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4 text-rose-500" />
                            <span className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                              Prerequisites
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-rose-900/40 text-rose-300' : 'bg-rose-100 text-rose-600'}`}>
                              {filteredPrereqs.length}
                            </span>
                          </div>
                          <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.prerequisites ? 'rotate-180' : ''} ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                        </button>
                        
                        <AnimatePresence>
                          {expandedSections.prerequisites && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-3 pb-3 space-y-2">
                                {filteredPrereqs.map((prereq, i) => (
                                  <button
                                    key={i}
                                    onClick={() => handleNavigate(prereq)}
                                    className={`
                                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group
                                      ${isDark 
                                        ? 'bg-zinc-800/50 hover:bg-rose-950/40 border border-zinc-700/50 hover:border-rose-700/50' 
                                        : 'bg-white hover:bg-rose-50 border border-zinc-200 hover:border-rose-300 shadow-sm'
                                      }
                                    `}
                                  >
                                    <BookOpen className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-rose-400' : 'text-rose-500'}`} />
                                    <div className="flex-1 min-w-0">
                                      <span className={`block text-sm font-medium truncate ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                                        {prereq.split('/').pop()?.replace('.md', '').replace(/-/g, ' ')}
                                      </span>
                                      <span className={`block text-[10px] truncate ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                        {prereq}
                                      </span>
                                    </div>
                                    <ChevronRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                    
                    {/* References Section */}
                    {(filteredRefs.length > 0 || (references.length > 0 && !searchQuery)) && (
                      <div className={`rounded-xl border ${isDark ? 'border-zinc-800 bg-zinc-800/30' : 'border-zinc-200 bg-zinc-50/50'}`}>
                        <button
                          onClick={() => toggleSection('references')}
                          className={`w-full flex items-center justify-between px-4 py-3 text-left ${isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100/50'} rounded-t-xl transition-colors`}
                        >
                          <div className="flex items-center gap-2">
                            <ArrowRight className="w-4 h-4 text-blue-500" />
                            <span className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                              References
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-600'}`}>
                              {filteredRefs.length}
                            </span>
                          </div>
                          <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.references ? 'rotate-180' : ''} ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                        </button>
                        
                        <AnimatePresence>
                          {expandedSections.references && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-3 pb-3 space-y-2">
                                {filteredRefs.map((ref, i) => (
                                  <button
                                    key={i}
                                    onClick={() => handleNavigate(ref)}
                                    className={`
                                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group
                                      ${isDark 
                                        ? 'bg-zinc-800/50 hover:bg-blue-950/40 border border-zinc-700/50 hover:border-blue-700/50' 
                                        : 'bg-white hover:bg-blue-50 border border-zinc-200 hover:border-blue-300 shadow-sm'
                                      }
                                    `}
                                  >
                                    <BookOpen className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                                    <div className="flex-1 min-w-0">
                                      <span className={`block text-sm font-medium truncate ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                                        {ref.split('/').pop()?.replace('.md', '').replace(/-/g, ' ')}
                                      </span>
                                      <span className={`block text-[10px] truncate ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                        {ref}
                                      </span>
                                    </div>
                                    <ChevronRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                    
                    {/* See Also Section */}
                    {seeAlso.length > 0 && (
                      <div className={`rounded-xl border ${isDark ? 'border-zinc-800 bg-zinc-800/30' : 'border-zinc-200 bg-zinc-50/50'}`}>
                        <button
                          onClick={() => toggleSection('seeAlso')}
                          className={`w-full flex items-center justify-between px-4 py-3 text-left ${isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100/50'} rounded-t-xl transition-colors`}
                        >
                          <div className="flex items-center gap-2">
                            <ExternalLink className="w-4 h-4 text-amber-500" />
                            <span className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                              External Links
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-600'}`}>
                              {seeAlso.length}
                            </span>
                          </div>
                          <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.seeAlso ? 'rotate-180' : ''} ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                        </button>
                        
                        <AnimatePresence>
                          {expandedSections.seeAlso && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-3 pb-3 space-y-2">
                                {seeAlso.map((link, i) => (
                                  <a
                                    key={i}
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`
                                      flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group
                                      ${isDark 
                                        ? 'bg-zinc-800/50 hover:bg-amber-950/40 border border-zinc-700/50 hover:border-amber-700/50' 
                                        : 'bg-white hover:bg-amber-50 border border-zinc-200 hover:border-amber-300 shadow-sm'
                                      }
                                    `}
                                  >
                                    <ExternalLink className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
                                    <span className={`flex-1 truncate text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                                      {link.length > 50 ? link.slice(0, 50) + '...' : link}
                                    </span>
                                  </a>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            
            {/* Tags Tab */}
            {activeTab === 'tags' && (
              <div className="space-y-4">
                {tags.length === 0 ? (
                  <div className={`text-center py-8 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No tags defined</p>
                    <p className="text-xs mt-1 opacity-70">
                      Add tags to the strand frontmatter
                    </p>
                  </div>
                ) : (
                  <>
                    <div className={`p-3 rounded-xl ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
                      <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        Strand Tags
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag, i) => (
                          <span
                            key={i}
                            className={`
                              px-3 py-1.5 rounded-full text-sm font-medium
                              ${isDark 
                                ? 'bg-cyan-900/50 text-cyan-300 border border-cyan-800/50' 
                                : 'bg-cyan-100 text-cyan-700 border border-cyan-200'
                              }
                            `}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {relatedByTags.length > 0 && (
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          Related by Tags
                        </p>
                        <div className="space-y-2">
                          {relatedByTags.map((item, i) => (
                            <button
                              key={i}
                              onClick={() => handleNavigate(item.file.path)}
                              className={`
                                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group
                                ${isDark 
                                  ? 'bg-zinc-800/50 hover:bg-cyan-950/40 border border-zinc-700/50 hover:border-cyan-700/50' 
                                  : 'bg-white hover:bg-cyan-50 border border-zinc-200 hover:border-cyan-300 shadow-sm'
                                }
                              `}
                            >
                              <BookOpen className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-cyan-400' : 'text-cyan-500'}`} />
                              <div className="flex-1 min-w-0">
                                <span className={`block text-sm font-medium truncate ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                                  {item.file.name.replace('.md', '').replace(/-/g, ' ')}
                                </span>
                                <div className="flex gap-1 mt-0.5">
                                  {item.matchingTags.slice(0, 2).map((tag, j) => (
                                    <span key={j} className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <ChevronRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            
            {/* Suggested Tab */}
            {activeTab === 'suggest' && (
              <div className="space-y-4">
                {suggestedNext.length === 0 ? (
                  <div className={`text-center py-8 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No suggestions available</p>
                    <p className="text-xs mt-1 opacity-70">
                      Explore the full Spiral Path for more options
                    </p>
                  </div>
                ) : (
                  <>
                    <div className={`p-3 rounded-xl ${isDark ? 'bg-violet-950/30 border border-violet-800/50' : 'bg-violet-50 border border-violet-200'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="w-4 h-4 text-violet-500" />
                        <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
                          Next Steps
                        </span>
                      </div>
                      <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        Based on your current location in the knowledge tree
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      {suggestedNext.map((file, i) => (
                        <button
                          key={i}
                          onClick={() => handleNavigate(file.path)}
                          className={`
                            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group
                            ${isDark 
                              ? 'bg-zinc-800/50 hover:bg-violet-950/40 border border-zinc-700/50 hover:border-violet-700/50' 
                              : 'bg-white hover:bg-violet-50 border border-zinc-200 hover:border-violet-300 shadow-sm'
                            }
                          `}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? 'bg-violet-900/50 text-violet-400' : 'bg-violet-100 text-violet-600'}`}>
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={`block text-sm font-medium truncate ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                              {file.name.replace('.md', '').replace(/-/g, ' ')}
                            </span>
                            <span className={`block text-[10px] truncate ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                              {file.path}
                            </span>
                          </div>
                          <Play className={`w-4 h-4 ${isDark ? 'text-violet-400' : 'text-violet-500'}`} />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Footer - responsive, safe-area aware */}
          <div className={`
            px-3 sm:px-4 py-3 sm:py-4 border-t shrink-0
            flex items-center justify-between gap-2 sm:gap-3
            /* Safe area for bottom notch */
            pb-[max(12px,env(safe-area-inset-bottom))]
            ${isDark ? 'border-zinc-800 bg-zinc-950/80' : 'border-zinc-200 bg-zinc-50/90'}
          `}>
            <Link
              href={`/quarry/spiral-path?strand=${encodeURIComponent(currentPath)}`}
              className={`
                flex-1 flex items-center justify-center gap-1.5 sm:gap-2 
                px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl 
                text-xs sm:text-sm font-semibold transition-all
                min-h-[44px] /* Touch-friendly */
                active:scale-[0.98]
                ${isDark 
                  ? 'bg-gradient-to-r from-cyan-900/50 to-emerald-900/40 text-cyan-300 hover:from-cyan-900/70 hover:to-emerald-900/60 active:from-cyan-900/80 border border-cyan-800/50 shadow-lg shadow-cyan-900/20' 
                  : 'bg-gradient-to-r from-cyan-100 to-emerald-100 text-cyan-700 hover:from-cyan-200 hover:to-emerald-200 active:from-cyan-300 border border-cyan-300 shadow-lg shadow-cyan-200/50'
                }
              `}
            >
              <TreePine className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="hidden sm:inline">Explore Full Spiral Path</span>
              <span className="sm:hidden">Full Path</span>
              <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-60 shrink-0" />
            </Link>
            <button
              onClick={onClose}
              className={`
                px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg sm:rounded-xl 
                text-xs sm:text-sm font-semibold transition-all
                min-h-[44px] min-w-[60px] /* Touch-friendly */
                active:scale-[0.98]
                ${isDark 
                  ? 'bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-300 border border-zinc-700' 
                  : 'bg-zinc-200 hover:bg-zinc-300 active:bg-zinc-400 text-zinc-700 border border-zinc-300'
                }
              `}
            >
              Close
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return createPortal(popoverContent, document.body)
}
