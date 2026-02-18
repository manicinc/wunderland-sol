/**
 * Embedded List View
 * @module components/quarry/views/embeddable/ListView
 *
 * @description
 * Simple list view for displaying items with grouping support.
 */

import React, { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { EmbeddableViewConfig, ViewData, ListViewSettings } from '@/lib/views'
import type { MentionableEntity } from '@/lib/mentions/types'
import {
  ChevronRight,
  Circle,
  CheckCircle2,
  Hash,
  User,
  MapPin,
  Calendar,
  FileText,
  List,
} from 'lucide-react'

interface ListViewProps {
  config: EmbeddableViewConfig
  data: ViewData
  onItemClick?: (item: ViewData['items'][0]) => void
  className?: string
}

const ENTITY_ICONS: Record<string, React.FC<{ className?: string }>> = {
  person: User,
  place: MapPin,
  date: Calendar,
  event: Calendar,
  strand: FileText,
  tag: Hash,
}

const ListView: React.FC<ListViewProps> = ({
  config,
  data,
  onItemClick,
  className,
}) => {
  const settings = config.settings as ListViewSettings

  // Group items if needed
  const groups = useMemo(() => {
    if (data.groups && data.groups.length > 0) {
      return data.groups
    }

    if (settings.groupBy) {
      const grouped = new Map<string, ViewData['items']>()

      for (const item of data.items) {
        const entity = item.entity as Record<string, unknown>
        const value = String(entity[settings.groupBy] ?? 'Other')

        if (!grouped.has(value)) {
          grouped.set(value, [])
        }
        grouped.get(value)!.push(item)
      }

      return Array.from(grouped.entries()).map(([key, items]) => ({
        key,
        label: key,
        items,
      }))
    }

    return [{ key: 'all', label: '', items: data.items }]
  }, [data, settings.groupBy])

  // Sort items within groups
  const sortedGroups = useMemo(() => {
    if (!settings.sortBy) return groups

    return groups.map(group => ({
      ...group,
      items: [...group.items].sort((a, b) => {
        const aEntity = a.entity as Record<string, unknown>
        const bEntity = b.entity as Record<string, unknown>

        const aValue = aEntity[settings.sortBy!]
        const bValue = bEntity[settings.sortBy!]

        const comparison = String(aValue ?? '').localeCompare(String(bValue ?? ''))
        return settings.sortDirection === 'desc' ? -comparison : comparison
      }),
    }))
  }, [groups, settings.sortBy, settings.sortDirection])

  // Get icon for entity type
  const getIcon = (entity: MentionableEntity) => {
    if (!settings.showIcons) return null
    const Icon = ENTITY_ICONS[entity.type] || Circle
    return (
      <span style={{ color: entity.color }}>
        <Icon className="h-4 w-4 flex-shrink-0" />
      </span>
    )
  }

  // Render list item
  const renderItem = (item: ViewData['items'][0], index: number) => {
    const entity = item.entity as MentionableEntity

    if (settings.style === 'cards') {
      return (
        <button
          key={item.id}
          onClick={() => onItemClick?.(item)}
          className={cn(
            'w-full p-3 rounded-lg text-left',
            'bg-white dark:bg-gray-800 shadow-sm',
            'border border-gray-200 dark:border-gray-700',
            'hover:shadow-md transition-shadow',
            settings.compact && 'p-2'
          )}
        >
          <div className="flex items-start gap-3">
            {getIcon(entity)}
            <div className="flex-1 min-w-0">
              <p
                className="font-medium text-gray-800 dark:text-gray-100 truncate"
                style={{ color: entity.color }}
              >
                {entity.label}
              </p>
              {entity.description && !settings.compact && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {entity.description}
                </p>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
          </div>
        </button>
      )
    }

    if (settings.style === 'checklist') {
      return (
        <button
          key={item.id}
          onClick={() => onItemClick?.(item)}
          className={cn(
            'flex items-center gap-2 py-1.5 px-2 rounded w-full text-left',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            settings.compact && 'py-1'
          )}
        >
          <CheckCircle2 className="h-4 w-4 text-gray-300" />
          <span className="text-gray-700 dark:text-gray-300">{entity.label}</span>
        </button>
      )
    }

    // Default bullet or numbered style
    return (
      <button
        key={item.id}
        onClick={() => onItemClick?.(item)}
        className={cn(
          'flex items-center gap-2 py-1.5 px-2 rounded w-full text-left',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          settings.compact && 'py-1'
        )}
      >
        {settings.style === 'numbered' ? (
          <span className="text-xs text-gray-400 w-5">{index + 1}.</span>
        ) : (
          getIcon(entity) || (
            <Circle className="h-2 w-2 text-gray-400" />
          )
        )}
        <span
          className="text-gray-700 dark:text-gray-300"
          style={{ color: entity.color }}
        >
          {entity.label}
        </span>
      </button>
    )
  }

  // Empty state - Enhanced
  if (data.items.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center h-full min-h-[200px] p-6',
          'bg-gradient-to-br from-orange-50 to-amber-50',
          'dark:from-orange-950/30 dark:to-amber-950/30',
          'border-2 border-dashed border-orange-200 dark:border-orange-800 rounded-xl',
          className
        )}
      >
        <div className="relative mb-4">
          <div className="absolute inset-0 bg-orange-500/10 blur-xl rounded-full" />
          <List className="relative h-14 w-14 text-orange-400 dark:text-orange-500" />
        </div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          No items to display
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-xs mb-4">
          This list will show items extracted from your document
        </p>
        <div className="flex flex-col gap-2 text-xs text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
          <p className="font-medium text-gray-600 dark:text-gray-300">💡 How to add items:</p>
          <ul className="space-y-1.5 list-none">
            <li className="flex items-start gap-2">
              <span className="text-orange-500">@</span>
              <span>Use @mentions to create entity references</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500">•</span>
              <span>Create bullet lists with items</span>
            </li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('overflow-auto h-full p-3', className)}>
      {sortedGroups.map(group => (
        <div key={group.key} className="mb-4 last:mb-0">
          {group.label && (
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
              {group.label}
            </h4>
          )}
          <div className={cn(
            settings.style === 'cards' && 'space-y-2',
            settings.style !== 'cards' && 'space-y-0.5'
          )}>
            {group.items.map((item, index) => renderItem(item, index))}
          </div>
        </div>
      ))}
    </div>
  )
}

export { ListView }
export type { ListViewProps }

