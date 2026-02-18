/**
 * Collections Page - Bento grid view of all collections
 * @module app/quarry/collections/page
 *
 * Main page for browsing and managing strand collections.
 * Features tabbed navigation, search, and bento grid layout.
 * Uses QuarryPageLayout for consistent navigation and sidebars.
 */

'use client'

import { useState, useMemo, useCallback, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Pin,
  Clock,
  FolderPlus,
  Layers,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCollections } from '@/lib/collections/useCollections'
import {
  CollectionBentoGrid,
  CreateCollectionModal
} from '@/components/quarry/ui/collections'
import QuarryPageLayout from '@/components/quarry/QuarryPageLayout'
import { DashboardLeftSidebar } from '@/components/quarry/dashboard/DashboardLeftSidebar'
import { DashboardRightSidebar } from '@/components/quarry/dashboard/DashboardRightSidebar'
import { ToastProvider } from '@/components/quarry/ui/common/Toast'
import { InstanceConfigProvider } from '@/lib/config'
import type { CollectionMetadata } from '@/components/quarry/types'

/** Tab types */
type TabId = 'all' | 'pinned' | 'recent'

interface TabConfig {
  id: TabId
  label: string
  icon: typeof Layers
  filter: (collections: CollectionMetadata[]) => CollectionMetadata[]
}

const TABS: TabConfig[] = [
  {
    id: 'all',
    label: 'All',
    icon: Layers,
    filter: (collections) => collections,
  },
  {
    id: 'pinned',
    label: 'Pinned',
    icon: Pin,
    filter: (collections) => collections.filter(c => c.pinned),
  },
  {
    id: 'recent',
    label: 'Recent',
    icon: Clock,
    filter: (collections) =>
      [...collections]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 10),
  },
]

/**
 * Mock strand previews (in real app, fetch from strand index)
 */
function mockStrandPreviews(strandPaths: string[]): Record<string, { path: string; title: string; isSupernote?: boolean }> {
  const previews: Record<string, { path: string; title: string; isSupernote?: boolean }> = {}
  for (const path of strandPaths) {
    const name = path.split('/').pop()?.replace(/\.(md|yaml|yml)$/, '') || 'Untitled'
    previews[path] = {
      path,
      title: name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      isSupernote: path.includes('supernote') || Math.random() > 0.7,
    }
  }
  return previews
}

/**
 * Collections page content component
 */
function CollectionsContent() {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const theme = resolvedTheme || 'dark'
  const isDark = theme.includes('dark')

  const [activeTab, setActiveTab] = useState<TabId>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const {
    collections,
    isLoading,
    error,
    createCollection,
    deleteCollection,
    duplicateCollection,
    togglePin,
  } = useCollections()

  // Apply tab filter
  const tabConfig = TABS.find(t => t.id === activeTab) || TABS[0]
  const tabFilteredCollections = useMemo(() =>
    tabConfig.filter(collections),
    [collections, tabConfig]
  )

  // Apply search filter
  const filteredCollections = useMemo(() => {
    if (!searchQuery.trim()) return tabFilteredCollections
    const query = searchQuery.toLowerCase()
    return tabFilteredCollections.filter(c =>
      c.title.toLowerCase().includes(query) ||
      c.description?.toLowerCase().includes(query)
    )
  }, [tabFilteredCollections, searchQuery])

  // Generate mock strand previews for all collections
  const strandPreviews = useMemo(() => {
    const allPaths = collections.flatMap(c => c.strandPaths)
    return mockStrandPreviews(allPaths)
  }, [collections])

  // Handlers
  const handleNavigate = (path: string) => {
    router.push(path)
  }

  const handleNavigateToCollection = useCallback((id: string) => {
    router.push(`/quarry/collections/${id}`)
  }, [router])

  const handleCreateCollection = useCallback(async (data: {
    title: string
    description?: string
    icon?: string
    color?: string
  }) => {
    await createCollection(data)
  }, [createCollection])

  const handleDeleteCollection = useCallback(async (id: string) => {
    if (window.confirm('Are you sure you want to delete this collection?')) {
      await deleteCollection(id)
    }
  }, [deleteCollection])

  const handleDuplicateCollection = useCallback(async (id: string) => {
    await duplicateCollection(id)
  }, [duplicateCollection])

  return (
    <QuarryPageLayout
      title="Collections"
      description="Organize strands into collections"
      forceSidebarSmall={true}
      leftPanelWidth={240}
      rightPanelWidth={200}
      showRightPanel={true}
      leftPanelContent={<DashboardRightSidebar theme={theme} onNavigate={handleNavigate} />}
      rightPanelContent={<DashboardLeftSidebar theme={theme} onNavigate={handleNavigate} />}
    >
      <div className={cn('min-h-[calc(100vh-120px)]', isDark ? 'bg-zinc-950' : 'bg-zinc-50')}>
        {/* Page Header */}
        <div className={cn(
          'sticky top-0 z-20 backdrop-blur-lg border-b px-6 py-4',
          isDark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-zinc-50/80 border-zinc-200'
        )}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className={cn(
                'text-2xl font-bold tracking-tight',
                isDark ? 'text-zinc-100' : 'text-zinc-900'
              )}>
                Collections
              </h1>
              <p className={cn('text-sm mt-0.5', isDark ? 'text-zinc-500' : 'text-zinc-500')}>
                {collections.length} collection{collections.length !== 1 ? 's' : ''} ·
                {collections.reduce((sum, c) => sum + c.strandPaths.length, 0)} strands total
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm',
                'bg-violet-600 text-white hover:bg-violet-700',
                'shadow-lg shadow-violet-500/25 hover:shadow-violet-500/35',
                'transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2',
                isDark && 'focus:ring-offset-zinc-950'
              )}
            >
              <FolderPlus className="w-4 h-4" />
              <span className="hidden sm:inline">New Collection</span>
            </button>
          </div>

          {/* Tabs and search */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Tabs */}
            <nav
              className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/50"
              role="tablist"
              aria-label="Collection filters"
            >
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`panel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    activeTab === tab.id
                      ? isDark
                        ? 'bg-zinc-700 text-white shadow-sm'
                        : 'bg-white text-zinc-900 shadow-sm'
                      : isDark
                        ? 'text-zinc-400 hover:text-zinc-200'
                        : 'text-zinc-500 hover:text-zinc-700'
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.id === 'pinned' && (
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded-full',
                      isDark ? 'bg-zinc-600 text-zinc-300' : 'bg-zinc-200 text-zinc-600'
                    )}>
                      {collections.filter(c => c.pinned).length}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            {/* Search */}
            <div className="relative flex-1 max-w-md">
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
                    : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500',
                  'focus:outline-none focus:ring-2 focus:ring-violet-500/20'
                )}
              />
            </div>
          </div>
        </div>

        {/* Main content */}
        <main className="px-6 py-6">
          {/* Error state */}
          {error && (
            <div className={cn(
              'mb-6 px-4 py-3 rounded-xl border',
              isDark ? 'bg-red-950/30 border-red-900 text-red-400' : 'bg-red-50 border-red-200 text-red-600'
            )}>
              {error}
            </div>
          )}

          {/* Search results indicator */}
          <AnimatePresence>
            {searchQuery && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4"
              >
                <p className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
                  {filteredCollections.length === 0
                    ? `No collections matching "${searchQuery}"`
                    : `${filteredCollections.length} collection${filteredCollections.length !== 1 ? 's' : ''} matching "${searchQuery}"`
                  }
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collection grid */}
          <div
            id={`panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
          >
            <CollectionBentoGrid
              collections={filteredCollections}
              strandPreviews={strandPreviews}
              isDark={isDark}
              isLoading={isLoading}
              onCollectionClick={handleNavigateToCollection}
              onTogglePin={(id) => togglePin(id)}
              onEdit={(id) => router.push(`/quarry/collections/${id}?edit=true`)}
              onDelete={handleDeleteCollection}
              onDuplicate={handleDuplicateCollection}
              onCreateNew={() => setShowCreateModal(true)}
            />
          </div>
        </main>

        {/* Create collection modal */}
        <CreateCollectionModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateCollection}
          isDark={isDark}
        />
      </div>
    </QuarryPageLayout>
  )
}

/**
 * Collections page component with providers
 */
export default function CollectionsPage() {
  return (
    <Suspense fallback={
      <QuarryPageLayout title="Collections">
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      </QuarryPageLayout>
    }>
      <InstanceConfigProvider>
        <ToastProvider>
          <CollectionsContent />
        </ToastProvider>
      </InstanceConfigProvider>
    </Suspense>
  )
}
