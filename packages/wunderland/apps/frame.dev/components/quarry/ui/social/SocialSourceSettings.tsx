/**
 * Social Source Settings Component
 * @module codex/ui/SocialSourceSettings
 *
 * @remarks
 * Settings tab for managing social media imports.
 * Shows import history, statistics by platform, and allows
 * bulk management of imported sources.
 */

'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Share2,
  Trash2,
  ExternalLink,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Calendar,
  AlertCircle,
  Link2,
  Check,
  X,
  Filter,
  HelpCircle,
  Info,
} from 'lucide-react'
import { Tooltip } from '../common/Tooltip'
import { SOCIAL_PLATFORMS, getPlatformById, type SocialPlatform } from '@/lib/social/platforms'
import {
  getSocialImportHistory,
  getSocialImportStats,
  removeFromSocialImportHistory,
  type SocialStrandData,
} from '@/lib/social/strandCreator'
import SocialPlatformIcon, { SocialPlatformStack } from './SocialPlatformIcon'
import SocialSourceBadge, { SocialEngagementBar } from './SocialSourceBadge'
import SocialImportCard from './SocialImportCard'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface SocialSourceSettingsProps {
  /** Callback when a strand is created from import */
  onStrandCreated?: (strandData: SocialStrandData) => void
}

type SortOption = 'newest' | 'oldest' | 'platform' | 'title'
type ViewMode = 'list' | 'grouped'

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function SocialSourceSettings({
  onStrandCreated,
}: SocialSourceSettingsProps) {
  const [history, setHistory] = useState<SocialStrandData[]>(() =>
    getSocialImportHistory()
  )
  const [stats] = useState(() => getSocialImportStats())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPlatform, setFilterPlatform] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [showImportCard, setShowImportCard] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  // Platform stats
  const platformStats = useMemo(() => {
    return Object.entries(stats)
      .map(([id, count]) => ({
        platform: getPlatformById(id),
        count,
      }))
      .filter((s) => s.platform)
      .sort((a, b) => b.count - a.count)
  }, [stats])

  // Filtered and sorted history
  const filteredHistory = useMemo(() => {
    let items = [...history]

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      items = items.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.sourceUrl.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
      )
    }

    // Apply platform filter
    if (filterPlatform) {
      items = items.filter((s) => s.platformId === filterPlatform)
    }

    // Apply sorting
    switch (sortBy) {
      case 'oldest':
        items.sort(
          (a, b) =>
            new Date(a.scrapedAt).getTime() - new Date(b.scrapedAt).getTime()
        )
        break
      case 'platform':
        items.sort((a, b) => a.platformId.localeCompare(b.platformId))
        break
      case 'title':
        items.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'newest':
      default:
        items.sort(
          (a, b) =>
            new Date(b.scrapedAt).getTime() - new Date(a.scrapedAt).getTime()
        )
    }

    return items
  }, [history, searchQuery, filterPlatform, sortBy])

  // Grouped view
  const groupedHistory = useMemo(() => {
    if (viewMode !== 'grouped') return null

    const groups: Record<string, SocialStrandData[]> = {}
    for (const item of filteredHistory) {
      if (!groups[item.platformId]) {
        groups[item.platformId] = []
      }
      groups[item.platformId].push(item)
    }
    return groups
  }, [filteredHistory, viewMode])

  // Handlers
  const handleDelete = (id: string) => {
    removeFromSocialImportHistory(id)
    setHistory(getSocialImportHistory())
    setSelectedItems((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const handleBulkDelete = () => {
    for (const id of selectedItems) {
      removeFromSocialImportHistory(id)
    }
    setHistory(getSocialImportHistory())
    setSelectedItems(new Set())
  }

  const handleImport = (result: any, url: string) => {
    // This would integrate with the strand creation flow
    // For now, just close the import card
    setShowImportCard(false)
    // Refresh history
    setHistory(getSocialImportHistory())
  }

  const toggleGroup = (platformId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(platformId)) {
        next.delete(platformId)
      } else {
        next.add(platformId)
      }
      return next
    })
  }

  const toggleSelect = (id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedItems(new Set(filteredHistory.map((s) => s.id)))
  }

  const clearSelection = () => {
    setSelectedItems(new Set())
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
          <Share2 className="w-5 h-5 text-pink-600 dark:text-pink-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Social Sources
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Import and manage content from social platforms
          </p>
        </div>
      </div>

      {/* Platform Stats */}
      {platformStats.length > 0 && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
            Imports by Platform
          </h4>
          <div className="flex flex-wrap gap-3">
            {platformStats.map(({ platform, count }) => (
              <button
                key={platform!.id}
                onClick={() =>
                  setFilterPlatform(
                    filterPlatform === platform!.id ? null : platform!.id
                  )
                }
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-full
                  border transition-colors
                  ${
                    filterPlatform === platform!.id
                      ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
              >
                <SocialPlatformIcon platform={platform!} size="xs" showBackground />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Import Button & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => setShowImportCard(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Link2 className="w-4 h-4" />
          Import from URL
        </button>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search imports..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="platform">By platform</option>
            <option value="title">By title</option>
          </select>

          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'grouped' : 'list')}
            className={`px-3 py-2 rounded-lg border transition-colors ${
              viewMode === 'grouped'
                ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/30 text-pink-600'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title={viewMode === 'list' ? 'Group by platform' : 'Show as list'}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Import Card Modal */}
      <AnimatePresence>
        {showImportCard && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
          >
            <SocialImportCard
              onImport={handleImport}
              onCancel={() => setShowImportCard(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
          <span className="text-sm text-pink-700 dark:text-pink-300">
            {selectedItems.size} selected
          </span>
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
          <button
            onClick={clearSelection}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Clear
          </button>
          <div className="flex-1" />
          <button
            onClick={selectAll}
            className="text-sm text-pink-600 hover:text-pink-700"
          >
            Select all
          </button>
        </div>
      )}

      {/* Import History */}
      {filteredHistory.length === 0 ? (
        <div className="text-center py-12">
          <Share2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {history.length === 0
              ? 'No social imports yet'
              : 'No imports match your search'}
          </p>
          {history.length === 0 && (
            <button
              onClick={() => setShowImportCard(true)}
              className="mt-4 text-sm text-pink-600 hover:text-pink-700"
            >
              Import your first URL →
            </button>
          )}
        </div>
      ) : viewMode === 'grouped' && groupedHistory ? (
        // Grouped view
        <div className="space-y-4">
          {Object.entries(groupedHistory).map(([platformId, items]) => {
            const platform = getPlatformById(platformId)
            const isExpanded = expandedGroups.has(platformId)

            return (
              <div
                key={platformId}
                className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => toggleGroup(platformId)}
                  className="w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <SocialPlatformIcon
                    platform={platform || platformId}
                    size="md"
                    showBackground
                  />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {platform?.name || platformId}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {items.length} import{items.length !== 1 && 's'}
                  </span>
                  <div className="flex-1" />
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {items.map((item) => (
                          <ImportListItem
                            key={item.id}
                            item={item}
                            isSelected={selectedItems.has(item.id)}
                            onToggleSelect={() => toggleSelect(item.id)}
                            onDelete={() => handleDelete(item.id)}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      ) : (
        // List view
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
          {filteredHistory.map((item) => (
            <ImportListItem
              key={item.id}
              item={item}
              isSelected={selectedItems.has(item.id)}
              onToggleSelect={() => toggleSelect(item.id)}
              onDelete={() => handleDelete(item.id)}
              showPlatform
            />
          ))}
        </div>
      )}

      {/* Supported Platforms */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Supported platforms:
          </p>
          <Tooltip
            content="We extract public metadata from these platforms. No login required."
            placement="right"
          >
            <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
          </Tooltip>
        </div>
        <div className="flex flex-wrap gap-2">
          {SOCIAL_PLATFORMS.map((platform) => (
            <Tooltip
              key={platform.id}
              content={`Import from ${platform.name} posts, profiles, and content`}
              placement="top"
            >
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 cursor-help"
              >
                <SocialPlatformIcon platform={platform} size="xs" />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {platform.name}
                </span>
              </div>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <SocialImportFAQ />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   FAQ SECTION
═══════════════════════════════════════════════════════════════════════════ */

const FAQ_ITEMS = [
  {
    question: 'What data is extracted from social posts?',
    answer: 'We extract publicly available metadata: post title, content, author/username, engagement stats (likes, comments, shares), hashtags, mentions, and media thumbnails. No private data is accessed.',
  },
  {
    question: 'Do I need to log in to import?',
    answer: 'No. We only scrape public metadata from post URLs. No authentication or account linking is required.',
  },
  {
    question: 'What happens to imported content?',
    answer: 'Imported content is saved locally as a strand. Hashtags become tags, the author becomes the creator attribution, and engagement stats are stored for reference.',
  },
  {
    question: 'Can I link imports to existing strands?',
    answer: 'Yes! After importing, you can add relationships (references, related, extends) to connect the import to your existing strands.',
  },
  {
    question: 'Why is some metadata missing?',
    answer: 'Some platforms limit what\'s available in public metadata. We extract everything available from OG tags, Twitter cards, and JSON-LD data.',
  },
]

function SocialImportFAQ() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  return (
    <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-2 mb-3">
        <HelpCircle className="w-4 h-4 text-gray-400" />
        <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Frequently Asked Questions
        </h4>
      </div>

      <div className="space-y-2">
        {FAQ_ITEMS.map((item, index) => (
          <div
            key={index}
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {item.question}
              </span>
              {expandedIndex === index ? (
                <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              )}
            </button>

            <AnimatePresence>
              {expandedIndex === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   IMPORT LIST ITEM
═══════════════════════════════════════════════════════════════════════════ */

function ImportListItem({
  item,
  isSelected,
  onToggleSelect,
  onDelete,
  showPlatform = false,
}: {
  item: SocialStrandData
  isSelected: boolean
  onToggleSelect: () => void
  onDelete: () => void
  showPlatform?: boolean
}) {
  const platform = getPlatformById(item.platformId)

  return (
    <div
      className={`
        flex items-start gap-3 p-4 transition-colors
        ${isSelected ? 'bg-pink-50 dark:bg-pink-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}
      `}
    >
      {/* Selection checkbox */}
      <button
        onClick={onToggleSelect}
        className={`
          w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5
          ${
            isSelected
              ? 'border-pink-500 bg-pink-500 text-white'
              : 'border-gray-300 dark:border-gray-600 hover:border-pink-400'
          }
        `}
      >
        {isSelected && <Check className="w-3 h-3" />}
      </button>

      {/* Platform icon */}
      {showPlatform && platform && (
        <SocialPlatformIcon
          platform={platform}
          size="sm"
          showBackground
          className="flex-shrink-0 mt-0.5"
        />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h5 className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {item.title}
        </h5>

        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
          {item.sourceMetadata.socialUsername && (
            <span style={{ color: platform?.color }}>
              {item.sourceMetadata.socialUsername}
            </span>
          )}
          <span>•</span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(item.scrapedAt).toLocaleDateString()}
          </span>
        </div>

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 text-[10px] rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
              >
                {tag}
              </span>
            ))}
            {item.tags.length > 5 && (
              <span className="text-[10px] text-gray-400">
                +{item.tags.length - 5}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          title="View original"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
        <button
          onClick={onDelete}
          className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
