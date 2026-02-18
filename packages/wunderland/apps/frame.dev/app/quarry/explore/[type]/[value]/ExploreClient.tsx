'use client'

/**
 * ExploreClient - Client component for tag/subject/topic exploration
 * @module codex/explore/ExploreClient
 */

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Tag, 
  Folder, 
  Hash, 
  ArrowLeft, 
  Search,
  Filter,
  Grid3X3,
  List,
  FileText,
  Layers,
  ChevronRight,
  ExternalLink,
  Network,
  BookOpen,
  Clock,
  TrendingUp,
  Eye,
} from 'lucide-react'
import { useTheme } from 'next-themes'

interface ExploreClientProps {
  type: 'tag' | 'subject' | 'topic'
  value: string
  searchParams: { [key: string]: string | string[] | undefined }
}

// Mock data - in production this would come from the index
interface StrandResult {
  path: string
  title: string
  description?: string
  tags?: string[]
  subjects?: string[]
  topics?: string[]
  lastModified?: string
  readingTime?: number
}

// Type configuration
const TYPE_CONFIG = {
  tag: {
    icon: Tag,
    color: 'emerald',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-300 dark:border-emerald-700',
    description: 'Tags are the most specific labels, often used for fine-grained categorization.',
  },
  subject: {
    icon: Folder,
    color: 'amber',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-300 dark:border-amber-700',
    description: 'Subjects are broad, generalized categories that encompass multiple topics.',
  },
  topic: {
    icon: Hash,
    color: 'blue',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-300',
    borderColor: 'border-blue-300 dark:border-blue-700',
    description: 'Topics are more specific areas within a subject.',
  },
}

type ViewMode = 'grid' | 'list'
type SortBy = 'relevance' | 'recent' | 'alphabetical'

export default function ExploreClient({ type, value, searchParams }: ExploreClientProps) {
  const router = useRouter()
  const { theme } = useTheme()
  const isDark = theme?.includes('dark')
  
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortBy>('relevance')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [strands, setStrands] = useState<StrandResult[]>([])
  const [relatedItems, setRelatedItems] = useState<Array<{ type: 'tag' | 'subject' | 'topic'; value: string; count: number }>>([])
  
  // Validate type and get config (with fallback)
  const validType = (type in TYPE_CONFIG) ? type : 'tag'
  const config = TYPE_CONFIG[validType]
  const Icon = config.icon
  
  // Handle placeholder value from static export
  const isPlaceholder = value === '_' || !value
  
  // Simulate loading strands - in production, fetch from index
  useEffect(() => {
    setLoading(true)
    
    // Mock data generation
    const mockStrands: StrandResult[] = [
      {
        path: 'weaves/tech/ai/machine-learning.md',
        title: 'Introduction to Machine Learning',
        description: 'A comprehensive guide to ML fundamentals and applications.',
        tags: ['ai', 'machine-learning', 'data-science', value],
        subjects: ['Technology'],
        topics: ['Artificial Intelligence', 'Data Science'],
        lastModified: '2024-01-15',
        readingTime: 12,
      },
      {
        path: 'weaves/tech/programming/typescript.md',
        title: 'TypeScript Best Practices',
        description: 'Modern TypeScript patterns and conventions.',
        tags: ['typescript', 'javascript', 'programming', value],
        subjects: ['Technology'],
        topics: ['Programming Languages'],
        lastModified: '2024-02-20',
        readingTime: 8,
      },
      {
        path: 'weaves/philosophy/ethics.md',
        title: 'Ethics in AI Development',
        description: 'Exploring ethical considerations in artificial intelligence.',
        tags: ['ethics', 'ai', 'philosophy', value],
        subjects: ['Philosophy', 'Technology'],
        topics: ['Ethics', 'Artificial Intelligence'],
        lastModified: '2024-03-10',
        readingTime: 15,
      },
    ]
    
    // Simulate network delay
    setTimeout(() => {
      setStrands(mockStrands)
      setRelatedItems([
        { type: 'tag', value: 'related-tag-1', count: 12 },
        { type: 'tag', value: 'related-tag-2', count: 8 },
        { type: 'topic', value: 'Related Topic', count: 5 },
        { type: 'subject', value: 'Related Subject', count: 3 },
      ])
      setLoading(false)
    }, 500)
  }, [type, value])
  
  // Filter strands by search query
  const filteredStrands = useMemo(() => {
    if (!searchQuery) return strands
    const query = searchQuery.toLowerCase()
    return strands.filter(s => 
      s.title.toLowerCase().includes(query) ||
      s.description?.toLowerCase().includes(query) ||
      s.tags?.some(t => t.toLowerCase().includes(query))
    )
  }, [strands, searchQuery])
  
  // Sort strands
  const sortedStrands = useMemo(() => {
    const sorted = [...filteredStrands]
    switch (sortBy) {
      case 'recent':
        return sorted.sort((a, b) => 
          new Date(b.lastModified || 0).getTime() - new Date(a.lastModified || 0).getTime()
        )
      case 'alphabetical':
        return sorted.sort((a, b) => a.title.localeCompare(b.title))
      default:
        return sorted
    }
  }, [filteredStrands, sortBy])
  
  // Handle placeholder value - show landing page
  if (isPlaceholder) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-zinc-950' : 'bg-zinc-50'} flex items-center justify-center`}>
        <div className="text-center space-y-4 p-8">
          <h1 className={`text-2xl font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
            Explore Quarry Codex
          </h1>
          <p className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
            Navigate to a specific tag, subject, or topic to explore related content.
          </p>
          <Link
            href="/quarry"
            className="inline-block px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
          >
            Go to Codex
          </Link>
        </div>
      </div>
    )
  }
  
  return (
    <div className={`min-h-screen ${isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 border-b ${isDark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white/95 border-zinc-200'} backdrop-blur-sm`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Navigation */}
          <div className="flex items-center gap-4 mb-4">
            <Link 
              href="/quarry"
              className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            
            <nav className="flex items-center gap-2 text-sm">
              <Link href="/quarry" className={`${isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}>
                Codex
              </Link>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
              <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>Explore</span>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
              <span className={`capitalize ${config.textColor}`}>{type}</span>
            </nav>
          </div>
          
          {/* Title */}
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${config.bgColor} border ${config.borderColor}`}>
              <Icon className={`w-8 h-8 ${config.textColor}`} />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <span className="capitalize">{type}:</span>
                <span className={config.textColor}>{value}</span>
              </h1>
              <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {config.description}
              </p>
            </div>
            
            {/* Quick stats */}
            <div className="flex items-center gap-4 text-sm">
              <div className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                <FileText className="w-4 h-4" />
                <span>{strands.length} strands</span>
              </div>
              <Link
                href={`/quarry/graph?highlight=${type}:${value}`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200'}`}
              >
                <Network className="w-4 h-4" />
                <span>View in Graph</span>
              </Link>
            </div>
          </div>
        </div>
      </header>
      
      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Main content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-4">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter strands..."
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${isDark ? 'bg-zinc-900 border-zinc-700 focus:border-cyan-500' : 'bg-white border-zinc-200 focus:border-cyan-500'} focus:outline-none focus:ring-2 focus:ring-cyan-500/20`}
                />
              </div>
              
              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className={`px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}`}
              >
                <option value="relevance">Relevance</option>
                <option value="recent">Most Recent</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
              
              {/* View mode */}
              <div className={`flex items-center rounded-lg border ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? (isDark ? 'bg-zinc-800' : 'bg-zinc-100') : ''}`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? (isDark ? 'bg-zinc-800' : 'bg-zinc-100') : ''}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Results */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Layers className="w-8 h-8 text-cyan-500" />
                </motion.div>
              </div>
            ) : sortedStrands.length === 0 ? (
              <div className="text-center py-12">
                <FileText className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-zinc-700' : 'text-zinc-300'}`} />
                <p className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
                  {searchQuery ? 'No strands match your search' : 'No strands found for this ' + type}
                </p>
              </div>
            ) : (
              <motion.div 
                className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}
                initial="hidden"
                animate="visible"
                variants={{
                  visible: { transition: { staggerChildren: 0.05 } }
                }}
              >
                {sortedStrands.map((strand) => (
                  <motion.div
                    key={strand.path}
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      visible: { opacity: 1, y: 0 }
                    }}
                  >
                    <Link
                      href={`/quarry/${strand.path}`}
                      className={`block p-4 rounded-xl border transition-all hover:scale-[1.02] ${isDark ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:border-zinc-300'} hover:shadow-lg`}
                    >
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-cyan-500" />
                        {strand.title}
                      </h3>
                      
                      {strand.description && (
                        <p className={`text-sm mb-3 line-clamp-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          {strand.description}
                        </p>
                      )}
                      
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {strand.tags?.slice(0, 4).map(tag => (
                          <span
                            key={tag}
                            className={`px-2 py-0.5 rounded-full text-xs ${tag === value ? `${config.bgColor} ${config.textColor}` : (isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-600')}`}
                          >
                            #{tag}
                          </span>
                        ))}
                        {(strand.tags?.length || 0) > 4 && (
                          <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            +{(strand.tags?.length || 0) - 4} more
                          </span>
                        )}
                      </div>
                      
                      {/* Meta */}
                      <div className={`flex items-center gap-3 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        {strand.readingTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {strand.readingTime} min
                          </span>
                        )}
                        {strand.lastModified && (
                          <span>{new Date(strand.lastModified).toLocaleDateString()}</span>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
          
          {/* Sidebar - Related items */}
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <div className={`sticky top-32 p-4 rounded-xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-500" />
                Related
              </h3>
              
              <div className="space-y-2">
                {relatedItems.map((item) => {
                  const itemConfig = TYPE_CONFIG[item.type]
                  const ItemIcon = itemConfig.icon
                  return (
                    <Link
                      key={`${item.type}-${item.value}`}
                      href={`/quarry/explore/${item.type}/${encodeURIComponent(item.value)}`}
                      className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
                    >
                      <ItemIcon className={`w-3.5 h-3.5 ${itemConfig.textColor}`} />
                      <span className="flex-1 text-sm truncate">{item.value}</span>
                      <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{item.count}</span>
                    </Link>
                  )
                })}
              </div>
              
              {/* View all link */}
              <Link
                href="/quarry?view=tags"
                className={`mt-4 flex items-center justify-center gap-2 p-2 rounded-lg text-sm transition-colors ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'}`}
              >
                <Eye className="w-4 h-4" />
                View All Tags
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}



