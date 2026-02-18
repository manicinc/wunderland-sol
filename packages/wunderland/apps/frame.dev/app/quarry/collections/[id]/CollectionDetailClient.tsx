'use client'

/**
 * Collection Detail Client Component - View and manage strands in a collection
 * @module app/quarry/collections/[id]/CollectionDetailClient
 *
 * Detailed view of a single collection with strand management,
 * multiple view modes, and drag-to-reorder functionality.
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { 
  ArrowLeft, 
  Edit2, 
  Trash2, 
  Plus, 
  LayoutGrid, 
  List, 
  Layers,
  Pin,
  MoreHorizontal,
  FileText,
  StickyNote,
  X,
  Check,
  GripVertical,
  ExternalLink,
  Settings,
  FolderOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCollections } from '@/lib/collections/useCollections'
import type { CollectionMetadata, CollectionViewMode } from '@/components/quarry/types'

/** View mode options */
type ViewMode = 'bento' | 'grid' | 'list'

interface StrandItem {
  path: string
  title: string
  description?: string
  thumbnail?: string
  isSupernote?: boolean
  tags?: string[]
  updatedAt?: string
}

interface CollectionDetailClientProps {
  collectionId: string
}

/**
 * Mock strand data (in production, fetch from strand index)
 */
function mockStrandData(strandPaths: string[]): StrandItem[] {
  return strandPaths.map(path => {
    const name = path.split('/').pop()?.replace(/\.(md|yaml|yml)$/, '') || 'Untitled'
    const isSupernote = path.includes('supernote') || Math.random() > 0.7
    return {
      path,
      title: name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      description: isSupernote 
        ? 'A quick note for reference' 
        : 'Detailed documentation about this topic with comprehensive coverage.',
      isSupernote,
      tags: isSupernote ? ['#idea', '#quick'] : ['#documentation'],
      updatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    }
  })
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays < 1) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Strand list item component
 */
function StrandListItem({ 
  strand, 
  isDark, 
  onRemove,
  onNavigate,
}: { 
  strand: StrandItem
  isDark: boolean
  onRemove: () => void
  onNavigate: () => void
}) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <Reorder.Item
      value={strand.path}
      className={cn(
        'group flex items-center gap-4 p-4 rounded-xl border transition-all cursor-grab active:cursor-grabbing',
        isDark 
          ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700' 
          : 'bg-white border-zinc-200 hover:border-zinc-300',
        strand.isSupernote && (isDark ? 'bg-amber-950/20' : 'bg-amber-50')
      )}
    >
      {/* Drag handle */}
      <div className={cn(
        'flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity touch-manipulation',
        isDark ? 'text-zinc-600' : 'text-zinc-400'
      )}>
        <GripVertical className="w-5 h-5" />
      </div>

      {/* Icon */}
      <div className={cn(
        'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
        strand.isSupernote
          ? isDark ? 'bg-amber-900/30 text-amber-500' : 'bg-amber-100 text-amber-600'
          : isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'
      )}>
        {strand.isSupernote ? (
          <StickyNote className="w-5 h-5" />
        ) : (
          <FileText className="w-5 h-5" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0" onClick={onNavigate}>
        <h3 className={cn(
          'font-medium truncate cursor-pointer hover:underline',
          isDark ? 'text-zinc-100' : 'text-zinc-900'
        )}>
          {strand.title}
        </h3>
        {strand.description && (
          <p className={cn(
            'text-sm truncate mt-0.5',
            isDark ? 'text-zinc-500' : 'text-zinc-500'
          )}>
            {strand.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          {strand.tags?.slice(0, 3).map(tag => (
            <span 
              key={tag} 
              className={cn(
                'text-xs px-1.5 py-0.5 rounded',
                isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'
              )}
            >
              {tag}
            </span>
          ))}
          {strand.updatedAt && (
            <span className={cn(
              'text-xs',
              isDark ? 'text-zinc-600' : 'text-zinc-400'
            )}>
              {formatRelativeTime(strand.updatedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={onNavigate}
          className={cn(
            'p-2 rounded-lg transition-colors',
            isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
          )}
          title="Open strand"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className={cn(
            'p-2 rounded-lg transition-colors text-red-500',
            isDark ? 'hover:bg-red-950/30' : 'hover:bg-red-50'
          )}
          title="Remove from collection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </Reorder.Item>
  )
}

/**
 * Strand grid card component
 */
function StrandGridCard({ 
  strand, 
  isDark, 
  onRemove,
  onNavigate,
}: { 
  strand: StrandItem
  isDark: boolean
  onRemove: () => void
  onNavigate: () => void
}) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        'group relative rounded-xl border overflow-hidden transition-all cursor-pointer',
        isDark 
          ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:shadow-lg' 
          : 'bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-lg',
        strand.isSupernote && (isDark ? 'bg-amber-950/20' : 'bg-amber-50')
      )}
      onClick={onNavigate}
    >
      {/* Thumbnail area */}
      <div className={cn(
        'aspect-video flex items-center justify-center',
        strand.isSupernote
          ? isDark ? 'bg-amber-900/20' : 'bg-amber-100/50'
          : isDark ? 'bg-zinc-800' : 'bg-zinc-50'
      )}>
        {strand.isSupernote ? (
          <StickyNote className={cn(
            'w-12 h-12',
            isDark ? 'text-amber-500/50' : 'text-amber-600/50'
          )} />
        ) : (
          <FileText className={cn(
            'w-12 h-12',
            isDark ? 'text-zinc-600' : 'text-zinc-300'
          )} />
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className={cn(
          'font-medium truncate',
          isDark ? 'text-zinc-100' : 'text-zinc-900'
        )}>
          {strand.title}
        </h3>
        {strand.description && (
          <p className={cn(
            'text-sm line-clamp-2 mt-1',
            isDark ? 'text-zinc-500' : 'text-zinc-500'
          )}>
            {strand.description}
          </p>
        )}
      </div>

      {/* Supernote badge */}
      {strand.isSupernote && (
        <div className={cn(
          'absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium',
          isDark ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-200 text-amber-800'
        )}>
          Supernote
        </div>
      )}

      {/* Remove button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        className={cn(
          'absolute top-2 left-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity',
          isDark ? 'bg-zinc-900/90 text-zinc-400 hover:text-red-400' : 'bg-white/90 text-zinc-500 hover:text-red-500'
        )}
        title="Remove from collection"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.article>
  )
}

/**
 * Collection detail client component
 */
export default function CollectionDetailClient({ collectionId }: CollectionDetailClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEditMode = searchParams?.get('edit') === 'true'

  const [isDark, setIsDark] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [strandOrder, setStrandOrder] = useState<string[]>([])

  const {
    collections,
    isLoading,
    getCollection,
    updateCollection,
    deleteCollection,
    removeStrandFromCollection,
    togglePin,
  } = useCollections()

  const collection = useMemo(() => 
    getCollection(collectionId),
    [getCollection, collectionId]
  )

  // Detect dark mode
  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    checkDark()
    const observer = new MutationObserver(checkDark)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // Initialize strand order from collection
  useEffect(() => {
    if (collection) {
      setStrandOrder(collection.strandPaths)
      setEditTitle(collection.title)
      setEditDescription(collection.description || '')
    }
  }, [collection])

  // Start edit mode from URL param
  useEffect(() => {
    if (isEditMode && collection) {
      setIsEditing(true)
    }
  }, [isEditMode, collection])

  // Generate strand data
  const strands = useMemo(() => 
    mockStrandData(strandOrder),
    [strandOrder]
  )

  // Handlers
  const handleRemoveStrand = useCallback(async (strandPath: string) => {
    if (!collection) return
    if (window.confirm('Remove this strand from the collection?')) {
      await removeStrandFromCollection(collection.id, strandPath)
      setStrandOrder(prev => prev.filter(p => p !== strandPath))
    }
  }, [collection, removeStrandFromCollection])

  const handleSaveEdit = useCallback(async () => {
    if (!collection) return
    await updateCollection(collection.id, {
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      strandPaths: strandOrder,
    })
    setIsEditing(false)
    router.replace(`/quarry/collections/${collection.id}`)
  }, [collection, updateCollection, editTitle, editDescription, strandOrder, router])

  const handleDelete = useCallback(async () => {
    if (!collection) return
    if (window.confirm(`Delete "${collection.title}"? This cannot be undone.`)) {
      await deleteCollection(collection.id)
      router.push('/quarry/collections')
    }
  }, [collection, deleteCollection, router])

  const handleNavigateToStrand = useCallback((strandPath: string) => {
    // In production, navigate to the actual strand viewer
    console.log('Navigate to strand:', strandPath)
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className={cn(
        'min-h-screen flex items-center justify-center',
        isDark ? 'bg-zinc-950' : 'bg-zinc-50'
      )}>
        <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  // Not found
  if (!collection) {
    return (
      <div className={cn(
        'min-h-screen flex flex-col items-center justify-center gap-4',
        isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'
      )}>
        <FolderOpen className="w-16 h-16 opacity-30" />
        <h1 className="text-xl font-semibold">Collection not found</h1>
        <button
          type="button"
          onClick={() => router.push('/quarry/collections')}
          className="text-violet-500 hover:underline"
        >
          Back to collections
        </button>
      </div>
    )
  }

  return (
    <div className={cn(
      'min-h-screen transition-colors',
      isDark ? 'bg-zinc-950' : 'bg-zinc-50'
    )}>
      {/* Header */}
      <header className={cn(
        'sticky top-0 z-40 backdrop-blur-lg border-b',
        isDark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-zinc-50/80 border-zinc-200'
      )}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Back button and title */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => router.push('/quarry/collections')}
                className={cn(
                  'flex-shrink-0 p-2 rounded-lg transition-colors',
                  isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                )}
                aria-label="Back to collections"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {isEditing ? (
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className={cn(
                      'w-full text-xl font-bold bg-transparent border-b-2 pb-1 focus:outline-none',
                      isDark 
                        ? 'text-zinc-100 border-zinc-700 focus:border-violet-500' 
                        : 'text-zinc-900 border-zinc-300 focus:border-violet-500'
                    )}
                    placeholder="Collection title"
                  />
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className={cn(
                      'w-full text-sm bg-transparent border-b pb-1 focus:outline-none',
                      isDark 
                        ? 'text-zinc-400 border-zinc-800 focus:border-violet-500' 
                        : 'text-zinc-500 border-zinc-200 focus:border-violet-500'
                    )}
                    placeholder="Add a description..."
                  />
                </div>
              ) : (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <div 
                      className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ 
                        backgroundColor: `${collection.color}20`,
                        color: collection.color,
                      }}
                    >
                      {collection.icon ? (
                        <span className="text-xl">{collection.icon}</span>
                      ) : (
                        <Layers className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h1 className={cn(
                        'text-xl font-bold truncate',
                        isDark ? 'text-zinc-100' : 'text-zinc-900'
                      )}>
                        {collection.title}
                      </h1>
                      {collection.description && (
                        <p className={cn(
                          'text-sm truncate',
                          isDark ? 'text-zinc-500' : 'text-zinc-500'
                        )}>
                          {collection.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false)
                      setEditTitle(collection.title)
                      setEditDescription(collection.description || '')
                      router.replace(`/quarry/collections/${collection.id}`)
                    }}
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm transition-colors',
                      isDark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'
                    )}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Save
                  </button>
                </>
              ) : (
                <>
                  {/* View mode toggle */}
                  <div className={cn(
                    'flex items-center gap-0.5 p-1 rounded-lg',
                    isDark ? 'bg-zinc-800' : 'bg-zinc-100'
                  )}>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      className={cn(
                        'p-1.5 rounded transition-colors',
                        viewMode === 'list'
                          ? isDark ? 'bg-zinc-700 text-white' : 'bg-white text-zinc-900 shadow-sm'
                          : isDark ? 'text-zinc-500' : 'text-zinc-400'
                      )}
                      aria-label="List view"
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={cn(
                        'p-1.5 rounded transition-colors',
                        viewMode === 'grid'
                          ? isDark ? 'bg-zinc-700 text-white' : 'bg-white text-zinc-900 shadow-sm'
                          : isDark ? 'text-zinc-500' : 'text-zinc-400'
                      )}
                      aria-label="Grid view"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Pin toggle */}
                  <button
                    type="button"
                    onClick={() => togglePin(collection.id)}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      collection.pinned
                        ? 'text-amber-500'
                        : isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'
                    )}
                    aria-label={collection.pinned ? 'Unpin' : 'Pin'}
                  >
                    <Pin className="w-5 h-5" />
                  </button>

                  {/* Edit button */}
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      isDark ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
                    )}
                    aria-label="Edit collection"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={handleDelete}
                    className={cn(
                      'p-2 rounded-lg transition-colors text-red-500',
                      isDark ? 'hover:bg-red-950/30' : 'hover:bg-red-50'
                    )}
                    aria-label="Delete collection"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Stats bar */}
          <div className={cn(
            'flex items-center gap-4 mt-4 pt-4 border-t',
            isDark ? 'border-zinc-800' : 'border-zinc-200'
          )}>
            <span className={cn(
              'text-sm',
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            )}>
              {strands.length} strand{strands.length !== 1 ? 's' : ''}
            </span>
            <span className={cn(
              'text-sm',
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            )}>
              {strands.filter(s => s.isSupernote).length} supernote{strands.filter(s => s.isSupernote).length !== 1 ? 's' : ''}
            </span>
            <span className={cn(
              'text-sm',
              isDark ? 'text-zinc-600' : 'text-zinc-400'
            )}>
              Updated {formatRelativeTime(collection.updatedAt)}
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {strands.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center mb-4',
              isDark ? 'bg-zinc-800' : 'bg-zinc-100'
            )}>
              <Layers className={cn(
                'w-8 h-8',
                isDark ? 'text-zinc-600' : 'text-zinc-400'
              )} />
            </div>
            <h3 className={cn(
              'text-lg font-semibold mb-2',
              isDark ? 'text-zinc-200' : 'text-zinc-800'
            )}>
              No strands yet
            </h3>
            <p className={cn(
              'text-sm max-w-sm mb-6',
              isDark ? 'text-zinc-500' : 'text-zinc-500'
            )}>
              Add strands to this collection from any strand card using the "Add to Collection" action.
            </p>
          </div>
        ) : viewMode === 'list' ? (
          <Reorder.Group 
            axis="y" 
            values={strandOrder} 
            onReorder={setStrandOrder}
            className="space-y-3"
          >
            {strands.map((strand) => (
              <StrandListItem
                key={strand.path}
                strand={strand}
                isDark={isDark}
                onRemove={() => handleRemoveStrand(strand.path)}
                onNavigate={() => handleNavigateToStrand(strand.path)}
              />
            ))}
          </Reorder.Group>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence>
              {strands.map((strand) => (
                <StrandGridCard
                  key={strand.path}
                  strand={strand}
                  isDark={isDark}
                  onRemove={() => handleRemoveStrand(strand.path)}
                  onNavigate={() => handleNavigateToStrand(strand.path)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Add strands hint */}
        {strands.length > 0 && (
          <div className={cn(
            'mt-8 text-center text-sm',
            isDark ? 'text-zinc-600' : 'text-zinc-400'
          )}>
            {viewMode === 'list' && 'Drag strands to reorder'}
          </div>
        )}
      </main>
    </div>
  )
}

