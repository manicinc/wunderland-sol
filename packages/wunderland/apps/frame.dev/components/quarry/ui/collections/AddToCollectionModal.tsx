/**
 * Add to Collection Modal - Add strands to existing or new collections
 * @module codex/ui/collections/AddToCollectionModal
 *
 * Modal for adding one or more strands to collections.
 * Shows existing collections with checkboxes and quick-create option.
 */

'use client'

import { memo, useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Check, 
  Plus, 
  FolderPlus, 
  Search,
  Layers,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCollections } from '@/lib/collections/useCollections'
import type { CollectionMetadata } from '@/components/quarry/types'

interface AddToCollectionModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Close handler */
  onClose: () => void
  /** Strand path(s) to add */
  strandPaths: string | string[]
  /** Strand title for display (optional) */
  strandTitle?: string
  /** Dark mode */
  isDark?: boolean
  /** Callback after successful add */
  onSuccess?: (collectionIds: string[]) => void
}

/**
 * Collection row component
 */
const CollectionRow = memo(function CollectionRow({
  collection,
  isSelected,
  isAlreadyIn,
  onToggle,
  isDark,
}: {
  collection: CollectionMetadata
  isSelected: boolean
  isAlreadyIn: boolean
  onToggle: () => void
  isDark: boolean
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isAlreadyIn}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left',
        isAlreadyIn
          ? isDark ? 'opacity-50 cursor-not-allowed' : 'opacity-50 cursor-not-allowed'
          : isSelected
            ? isDark ? 'bg-violet-600/20 border border-violet-500' : 'bg-violet-50 border border-violet-200'
            : isDark ? 'hover:bg-zinc-800 border border-transparent' : 'hover:bg-zinc-50 border border-transparent',
      )}
    >
      {/* Checkbox */}
      <div className="flex-shrink-0">
        {isAlreadyIn ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : isSelected ? (
          <div className="w-5 h-5 rounded-md bg-violet-600 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-white" />
          </div>
        ) : (
          <Circle className={cn(
            'w-5 h-5',
            isDark ? 'text-zinc-600' : 'text-zinc-300'
          )} />
        )}
      </div>

      {/* Icon */}
      <div 
        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ 
          backgroundColor: `${collection.color}20`,
          color: collection.color,
        }}
      >
        {collection.icon ? (
          <span className="text-sm">{collection.icon}</span>
        ) : (
          <Layers className="w-4 h-4" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className={cn(
          'font-medium truncate',
          isDark ? 'text-zinc-100' : 'text-zinc-900'
        )}>
          {collection.title}
        </div>
        <div className={cn(
          'text-xs truncate',
          isDark ? 'text-zinc-500' : 'text-zinc-500'
        )}>
          {collection.strandPaths.length} strand{collection.strandPaths.length !== 1 ? 's' : ''}
          {isAlreadyIn && ' · Already added'}
        </div>
      </div>
    </button>
  )
})

/**
 * Modal overlay with backdrop
 */
const Overlay = memo(function Overlay({ 
  children, 
  onClose 
}: { 
  children: React.ReactNode
  onClose: () => void 
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {children}
    </motion.div>
  )
})

/**
 * Add to collection modal
 */
export const AddToCollectionModal = memo(function AddToCollectionModal({
  isOpen,
  onClose,
  strandPaths: strandPathsProp,
  strandTitle,
  isDark = false,
  onSuccess,
}: AddToCollectionModalProps) {
  const strandPaths = Array.isArray(strandPathsProp) ? strandPathsProp : [strandPathsProp]
  
  const {
    collections,
    isLoading,
    createCollection,
    addStrandToCollection,
    getCollectionsForStrand,
  } = useCollections()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newCollectionTitle, setNewCollectionTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get collections that already contain this strand
  const existingCollectionIds = useMemo(() => {
    if (strandPaths.length === 1) {
      return new Set(getCollectionsForStrand(strandPaths[0]).map(c => c.id))
    }
    // For multiple strands, show as "already in" only if ALL strands are in the collection
    return new Set(
      collections
        .filter(c => strandPaths.every(path => c.strandPaths.includes(path)))
        .map(c => c.id)
    )
  }, [collections, strandPaths, getCollectionsForStrand])

  // Filter collections by search
  const filteredCollections = useMemo(() => {
    if (!searchQuery.trim()) return collections
    const query = searchQuery.toLowerCase()
    return collections.filter(c => 
      c.title.toLowerCase().includes(query) ||
      c.description?.toLowerCase().includes(query)
    )
  }, [collections, searchQuery])

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setSelectedIds(new Set())
      setSearchQuery('')
      setShowCreateForm(false)
      setNewCollectionTitle('')
    }
  }, [isOpen])

  // Toggle collection selection
  const handleToggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Create new collection and add strand
  const handleCreateAndAdd = useCallback(async () => {
    if (!newCollectionTitle.trim()) return

    setIsSubmitting(true)
    try {
      const newCollection = await createCollection({
        title: newCollectionTitle.trim(),
        strandPaths: strandPaths,
      })
      setShowCreateForm(false)
      setNewCollectionTitle('')
      onSuccess?.([newCollection.id])
      onClose()
    } catch (error) {
      console.error('Failed to create collection:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [newCollectionTitle, strandPaths, createCollection, onSuccess, onClose])

  // Add to selected collections
  const handleSubmit = useCallback(async () => {
    if (selectedIds.size === 0) return

    setIsSubmitting(true)
    try {
      const promises: Promise<void>[] = []
      for (const collectionId of selectedIds) {
        for (const strandPath of strandPaths) {
          promises.push(addStrandToCollection(collectionId, strandPath))
        }
      }
      await Promise.all(promises)
      onSuccess?.(Array.from(selectedIds))
      onClose()
    } catch (error) {
      console.error('Failed to add to collections:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedIds, strandPaths, addStrandToCollection, onSuccess, onClose])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showCreateForm) {
          setShowCreateForm(false)
        } else {
          onClose()
        }
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        if (showCreateForm) {
          handleCreateAndAdd()
        } else {
          handleSubmit()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, showCreateForm, handleCreateAndAdd, handleSubmit, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <Overlay onClose={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0.2 }}
            className={cn(
              'w-full max-w-md rounded-2xl shadow-2xl overflow-hidden',
              isDark ? 'bg-zinc-900' : 'bg-white'
            )}
            role="dialog"
            aria-labelledby="add-to-collection-title"
            aria-modal="true"
          >
            {/* Header */}
            <div className={cn(
              'flex items-center justify-between px-6 py-4 border-b',
              isDark ? 'border-zinc-800' : 'border-zinc-100'
            )}>
              <div>
                <h2 
                  id="add-to-collection-title"
                  className={cn(
                    'text-lg font-semibold',
                    isDark ? 'text-zinc-100' : 'text-zinc-900'
                  )}
                >
                  Add to Collection
                </h2>
                {strandTitle && (
                  <p className={cn(
                    'text-sm truncate max-w-[250px]',
                    isDark ? 'text-zinc-500' : 'text-zinc-500'
                  )}>
                    {strandPaths.length > 1 
                      ? `${strandPaths.length} strands selected`
                      : strandTitle
                    }
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                )}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4">
              {showCreateForm ? (
                /* Create new collection form */
                <div className="space-y-4">
                  <div>
                    <label 
                      htmlFor="new-collection-name" 
                      className={cn(
                        'block text-sm font-medium mb-2',
                        isDark ? 'text-zinc-400' : 'text-zinc-600'
                      )}
                    >
                      Collection Name
                    </label>
                    <input
                      id="new-collection-name"
                      type="text"
                      value={newCollectionTitle}
                      onChange={(e) => setNewCollectionTitle(e.target.value)}
                      placeholder="e.g., Research Notes"
                      autoFocus
                      className={cn(
                        'w-full px-4 py-2.5 rounded-xl border text-sm transition-colors',
                        isDark 
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500' 
                          : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500',
                        'focus:outline-none focus:ring-2 focus:ring-violet-500/20'
                      )}
                      maxLength={100}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className={cn(
                        'flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                        isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'
                      )}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateAndAdd}
                      disabled={!newCollectionTitle.trim() || isSubmitting}
                      className={cn(
                        'flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                        'bg-violet-600 text-white hover:bg-violet-700',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      {isSubmitting ? 'Creating...' : 'Create & Add'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Search */}
                  <div className="relative mb-4">
                    <Search className={cn(
                      'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4',
                      isDark ? 'text-zinc-500' : 'text-zinc-400'
                    )} />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search collections..."
                      className={cn(
                        'w-full pl-10 pr-4 py-2 rounded-xl border text-sm transition-colors',
                        isDark 
                          ? 'bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500' 
                          : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500',
                        'focus:outline-none focus:ring-2 focus:ring-violet-500/20'
                      )}
                    />
                  </div>

                  {/* Create new button */}
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(true)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed mb-4 transition-colors',
                      isDark 
                        ? 'border-zinc-700 hover:border-violet-600/50 hover:bg-zinc-800/50 text-zinc-400' 
                        : 'border-zinc-300 hover:border-violet-400 hover:bg-violet-50/50 text-zinc-500'
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center',
                      isDark ? 'bg-zinc-800' : 'bg-zinc-100'
                    )}>
                      <FolderPlus className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-sm">Create new collection</span>
                  </button>

                  {/* Collections list */}
                  <div className="max-h-[300px] overflow-y-auto space-y-2 -mx-2 px-2">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : filteredCollections.length === 0 ? (
                      <div className={cn(
                        'text-center py-8 text-sm',
                        isDark ? 'text-zinc-500' : 'text-zinc-400'
                      )}>
                        {searchQuery ? 'No collections match your search' : 'No collections yet'}
                      </div>
                    ) : (
                      filteredCollections.map((collection) => (
                        <CollectionRow
                          key={collection.id}
                          collection={collection}
                          isSelected={selectedIds.has(collection.id)}
                          isAlreadyIn={existingCollectionIds.has(collection.id)}
                          onToggle={() => handleToggle(collection.id)}
                          isDark={isDark}
                        />
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            {!showCreateForm && (
              <div className={cn(
                'flex items-center justify-between px-6 py-4 border-t',
                isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-100 bg-zinc-50/50'
              )}>
                <span className={cn(
                  'text-sm',
                  isDark ? 'text-zinc-500' : 'text-zinc-500'
                )}>
                  {selectedIds.size} selected
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className={cn(
                      'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                      isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'
                    )}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={selectedIds.size === 0 || isSubmitting}
                    className={cn(
                      'px-5 py-2 rounded-xl text-sm font-medium transition-colors',
                      'bg-violet-600 text-white hover:bg-violet-700',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {isSubmitting ? 'Adding...' : `Add to ${selectedIds.size || ''} Collection${selectedIds.size !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </Overlay>
      )}
    </AnimatePresence>
  )
})

export default AddToCollectionModal


