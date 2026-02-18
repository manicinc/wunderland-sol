/**
 * Dashboard Grid
 *
 * Responsive grid layout for dashboard widgets with drag-and-drop reordering.
 * Uses CSS Grid for layout and @dnd-kit for drag functionality.
 * @module components/quarry/dashboard/DashboardGrid
 */

'use client'

import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { WidgetWrapper } from './widgets/WidgetWrapper'
import { getWidget } from './widgets'
import type { WidgetLayout, WidgetId } from './types'

interface DashboardGridProps {
  /** Widget layouts to render */
  layouts: WidgetLayout[]
  /** Theme setting */
  theme: string
  /** Whether in edit mode (shows drag handles) */
  isEditing?: boolean
  /** Navigation handler */
  onNavigate: (path: string) => void
  /** Remove widget handler */
  onRemoveWidget?: (id: string) => void
  /** Resize widget handler */
  onResizeWidget?: (id: WidgetId, size: 'small' | 'medium' | 'large') => void
  /** Layout update handler */
  onLayoutChange?: (layouts: WidgetLayout[]) => void
}

interface SortableWidgetProps {
  layout: WidgetLayout
  theme: string
  isEditing: boolean
  isDragging?: boolean
  onNavigate: (path: string) => void
  onRemove?: (id: string) => void
  onResize?: (id: WidgetId, size: 'small' | 'medium' | 'large') => void
}

function SortableWidget({
  layout,
  theme,
  isEditing,
  isDragging,
  onNavigate,
  onRemove,
  onResize,
}: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: layout.id, disabled: !isEditing })

  const widget = getWidget(layout.id)
  if (!widget) return null

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
    minHeight: getContentAwareHeight(layout),
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={getResponsiveClass(layout)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0 }}
      layout
    >
      <WidgetWrapper
        widget={widget}
        layout={layout}
        theme={theme}
        isEditing={isEditing}
        onNavigate={onNavigate}
        onRemove={onRemove}
        onResize={onResize}
        dragHandleProps={isEditing ? { ...attributes, ...listeners } : undefined}
      />
    </motion.div>
  )
}

// Calculate responsive width and height classes for masonry-like layout
function getResponsiveClass(layout: WidgetLayout) {
  const baseClasses = []

  // Mobile: full width for all
  baseClasses.push('col-span-12')

  // Widget-specific responsive sizes for visual variety
  switch (layout.id) {
    case 'planner':
      // Planner is the hero widget - full width on tablet, 8 cols on desktop
      baseClasses.push('sm:col-span-12', 'lg:col-span-8')
      break
    case 'mini-calendar':
      // Calendar takes moderate space
      baseClasses.push('sm:col-span-6', 'lg:col-span-4')
      break
    case 'recent-strands':
      // Recent items need room to breathe
      baseClasses.push('sm:col-span-12', 'lg:col-span-6')
      break
    case 'task-summary':
    case 'writing-stats':
    case 'learning-progress':
      // Stats are compact cards
      baseClasses.push('sm:col-span-6', 'lg:col-span-4')
      break
    case 'quick-capture':
      // Quick capture is frequently used
      baseClasses.push('sm:col-span-6', 'lg:col-span-4')
      break
    case 'clock':
    case 'ambience':
      // Utility widgets are small
      baseClasses.push('sm:col-span-6', 'lg:col-span-3')
      break
    case 'templates':
    case 'bookmarks':
      // Reference widgets
      baseClasses.push('sm:col-span-6', 'lg:col-span-4')
      break
    default:
      // Fallback based on w value
      if (layout.w <= 4) {
        baseClasses.push('sm:col-span-6', 'lg:col-span-4')
      } else if (layout.w <= 6) {
        baseClasses.push('sm:col-span-6', 'lg:col-span-6')
      } else {
        baseClasses.push('sm:col-span-12', 'lg:col-span-8')
      }
  }

  return baseClasses.join(' ')
}

// Content-aware height for widgets
function getContentAwareHeight(layout: WidgetLayout) {
  switch (layout.id) {
    case 'planner': return 280
    case 'mini-calendar': return 240
    case 'recent-strands': return 180
    case 'task-summary':
    case 'writing-stats':
    case 'learning-progress': return 140
    case 'quick-capture':
    case 'templates':
    case 'bookmarks': return 160
    case 'clock':
    case 'ambience': return 120
    default:
      return layout.h <= 2 ? 140 : layout.h <= 3 ? 200 : 260
  }
}

export function DashboardGrid({
  layouts,
  theme,
  isEditing = false,
  onNavigate,
  onRemoveWidget,
  onResizeWidget,
  onLayoutChange,
}: DashboardGridProps) {
  const isDark = theme.includes('dark')
  const [activeId, setActiveId] = useState<WidgetId | null>(null)

  // Filter visible widgets and sort by position
  const visibleLayouts = useMemo(() =>
    layouts
      .filter((l) => l.visible)
      .sort((a, b) => {
        // Sort by row first, then column
        if (a.y !== b.y) return a.y - b.y
        return a.x - b.x
      }),
    [layouts]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as WidgetId)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (over && active.id !== over.id) {
      const oldIndex = visibleLayouts.findIndex((l) => l.id === active.id)
      const newIndex = visibleLayouts.findIndex((l) => l.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        // Reorder the visible layouts
        const newVisibleLayouts = arrayMove(visibleLayouts, oldIndex, newIndex)

        // Update y positions to reflect new order
        const updatedLayouts = layouts.map((layout) => {
          const newPosition = newVisibleLayouts.findIndex((l) => l.id === layout.id)
          if (newPosition !== -1) {
            return { ...layout, y: newPosition }
          }
          return layout
        })

        onLayoutChange?.(updatedLayouts)
      }
    }
  }

  const activeLayout = activeId ? visibleLayouts.find((l) => l.id === activeId) : null

  if (visibleLayouts.length === 0) {
    return (
      <div className={`
        flex flex-col items-center justify-center py-16
        ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
      `}>
        <p className="text-lg mb-2">No widgets visible</p>
        <p className="text-sm">Add widgets from the settings menu</p>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={visibleLayouts.map((l) => l.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-12 gap-3 auto-rows-auto grid-flow-dense">
          {visibleLayouts.map((layout) => (
            <SortableWidget
              key={layout.id}
              layout={layout}
              theme={theme}
              isEditing={isEditing}
              isDragging={activeId === layout.id}
              onNavigate={onNavigate}
              onRemove={onRemoveWidget}
              onResize={onResizeWidget}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeLayout && (
          <div
            className={`${getResponsiveClass(activeLayout)} opacity-80`}
            style={{ minHeight: getContentAwareHeight(activeLayout) }}
          >
            <WidgetWrapper
              widget={getWidget(activeLayout.id)!}
              layout={activeLayout}
              theme={theme}
              isEditing={false}
              onNavigate={() => {}}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

export default DashboardGrid
