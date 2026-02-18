'use client'

/**
 * Drag and Drop Provider for Calendar
 *
 * Context provider for managing drag state across calendar views
 * @module components/quarry/ui/planner/DragDropProvider
 */

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import { CalendarEvent, DragState } from '@/lib/planner/types'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

interface DragDropContextValue {
  // Current drag state
  dragState: DragState | null

  // Dragging control
  startDrag: (
    event: CalendarEvent,
    type: 'move' | 'resize-start' | 'resize-end',
    initialPosition: { x: number; y: number }
  ) => void
  updateDrag: (position: { x: number; y: number }) => void
  endDrag: () => CalendarEvent | null // Returns updated event or null if cancelled

  // Preview position (for ghost element)
  previewPosition: { x: number; y: number } | null

  // Snap settings
  snapMinutes: number
  setSnapMinutes: (minutes: number) => void
}

interface DragDropProviderProps {
  children: ReactNode
  startHour?: number
  endHour?: number
  slotHeight?: number // Pixels per hour
  onEventUpdate?: (event: CalendarEvent, newStart: Date, newEnd: Date) => void
}

// ============================================================================
// CONTEXT
// ============================================================================

const DragDropContext = createContext<DragDropContextValue | null>(null)

export function useDragDrop() {
  const context = useContext(DragDropContext)
  if (!context) {
    throw new Error('useDragDrop must be used within a DragDropProvider')
  }
  return context
}

// ============================================================================
// PROVIDER
// ============================================================================

export function DragDropProvider({
  children,
  startHour = 6,
  endHour = 23,
  slotHeight = 60,
  onEventUpdate,
}: DragDropProviderProps) {
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number } | null>(null)
  const [snapMinutes, setSnapMinutes] = useState(15)

  const draggedEventRef = useRef<CalendarEvent | null>(null)

  // Calculate time from Y position
  const getTimeFromY = useCallback(
    (y: number, containerTop: number): { hour: number; minute: number } => {
      const relativeY = y - containerTop
      const totalMinutes = startHour * 60 + (relativeY / slotHeight) * 60

      // Snap to interval
      const snappedMinutes = Math.round(totalMinutes / snapMinutes) * snapMinutes

      const hour = Math.floor(snappedMinutes / 60)
      const minute = snappedMinutes % 60

      return {
        hour: Math.max(startHour, Math.min(endHour, hour)),
        minute: Math.max(0, Math.min(59, minute)),
      }
    },
    [startHour, endHour, slotHeight, snapMinutes]
  )

  // Start dragging
  const startDrag = useCallback(
    (
      event: CalendarEvent,
      type: 'move' | 'resize-start' | 'resize-end',
      initialPosition: { x: number; y: number }
    ) => {
      draggedEventRef.current = event

      setDragState({
        eventId: event.id,
        type,
        originalStart: new Date(event.startDatetime),
        originalEnd: new Date(event.endDatetime),
        currentPosition: initialPosition,
      })

      setPreviewPosition(initialPosition)
    },
    []
  )

  // Update drag position
  const updateDrag = useCallback(
    (position: { x: number; y: number }) => {
      if (!dragState) return

      setDragState((prev) =>
        prev
          ? {
              ...prev,
              currentPosition: position,
            }
          : null
      )

      setPreviewPosition(position)
    },
    [dragState]
  )

  // End drag and calculate new times
  const endDrag = useCallback((): CalendarEvent | null => {
    if (!dragState || !draggedEventRef.current) {
      setDragState(null)
      setPreviewPosition(null)
      draggedEventRef.current = null
      return null
    }

    const event = draggedEventRef.current
    const { type, originalStart, originalEnd, currentPosition } = dragState

    // Calculate movement
    const originalDuration =
      originalEnd.getTime() - originalStart.getTime()

    let newStart = new Date(originalStart)
    let newEnd = new Date(originalEnd)

    // Get time grid container for calculations
    // This is a simplified calculation - in production, you'd use refs
    const deltaY = currentPosition.y - (dragState.currentPosition.y || 0)
    const deltaMinutes = Math.round((deltaY / slotHeight) * 60 / snapMinutes) * snapMinutes

    if (type === 'move') {
      // Move entire event
      newStart = new Date(originalStart.getTime() + deltaMinutes * 60000)
      newEnd = new Date(newStart.getTime() + originalDuration)
    } else if (type === 'resize-start') {
      // Resize from start
      newStart = new Date(originalStart.getTime() + deltaMinutes * 60000)
      // Ensure minimum 15 min duration
      if (newStart >= newEnd) {
        newStart = new Date(newEnd.getTime() - 15 * 60000)
      }
    } else if (type === 'resize-end') {
      // Resize from end
      newEnd = new Date(originalEnd.getTime() + deltaMinutes * 60000)
      // Ensure minimum 15 min duration
      if (newEnd <= newStart) {
        newEnd = new Date(newStart.getTime() + 15 * 60000)
      }
    }

    // Create updated event
    const updatedEvent: CalendarEvent = {
      ...event,
      startDatetime: newStart.toISOString(),
      endDatetime: newEnd.toISOString(),
      updatedAt: new Date().toISOString(),
      localVersion: event.localVersion + 1,
      syncStatus: event.googleEventId ? 'pending_sync' : 'local',
    }

    // Callback to parent
    onEventUpdate?.(updatedEvent, newStart, newEnd)

    // Reset state
    setDragState(null)
    setPreviewPosition(null)
    draggedEventRef.current = null

    return updatedEvent
  }, [dragState, slotHeight, snapMinutes, onEventUpdate])

  const value: DragDropContextValue = {
    dragState,
    startDrag,
    updateDrag,
    endDrag,
    previewPosition,
    snapMinutes,
    setSnapMinutes,
  }

  return (
    <DragDropContext.Provider value={value}>
      {children}
      {/* Ghost element during drag */}
      {dragState && previewPosition && draggedEventRef.current && (
        <DragGhostElement
          event={draggedEventRef.current}
          position={previewPosition}
          dragType={dragState.type}
        />
      )}
    </DragDropContext.Provider>
  )
}

// ============================================================================
// GHOST ELEMENT
// ============================================================================

interface DragGhostElementProps {
  event: CalendarEvent
  position: { x: number; y: number }
  dragType: 'move' | 'resize-start' | 'resize-end'
}

function DragGhostElement({ event, position, dragType }: DragGhostElementProps) {
  return (
    <div
      className={cn(
        'fixed z-[9999] pointer-events-none',
        'px-2 py-1 rounded-md',
        'bg-emerald-500/80 text-white',
        'shadow-lg backdrop-blur-sm',
        'text-sm font-medium',
        'transition-transform duration-75'
      )}
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="truncate max-w-[200px]">{event.title}</div>
      <div className="text-[10px] opacity-80">
        {dragType === 'move' ? 'Moving...' : 'Resizing...'}
      </div>
    </div>
  )
}

// ============================================================================
// DRAGGABLE EVENT WRAPPER
// ============================================================================

interface DraggableEventProps {
  event: CalendarEvent
  children: ReactNode
  onDragEnd?: (event: CalendarEvent) => void
  disabled?: boolean
  className?: string
}

export function DraggableEvent({
  event,
  children,
  onDragEnd,
  disabled = false,
  className,
}: DraggableEventProps) {
  const { startDrag, updateDrag, endDrag, dragState } = useDragDrop()
  const isDragging = dragState?.eventId === event.id

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return
      e.preventDefault()

      startDrag(event, 'move', { x: e.clientX, y: e.clientY })

      const handleMouseMove = (e: MouseEvent) => {
        updateDrag({ x: e.clientX, y: e.clientY })
      }

      const handleMouseUp = () => {
        const updatedEvent = endDrag()
        if (updatedEvent) {
          onDragEnd?.(updatedEvent)
        }
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [disabled, event, startDrag, updateDrag, endDrag, onDragEnd]
  )

  return (
    <div
      className={cn(
        'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50',
        className
      )}
      onMouseDown={handleMouseDown}
    >
      {children}
    </div>
  )
}

// ============================================================================
// RESIZE HANDLES
// ============================================================================

interface ResizeHandleProps {
  event: CalendarEvent
  position: 'top' | 'bottom'
  onResizeEnd?: (event: CalendarEvent) => void
  disabled?: boolean
}

export function ResizeHandle({
  event,
  position,
  onResizeEnd,
  disabled = false,
}: ResizeHandleProps) {
  const { startDrag, updateDrag, endDrag, dragState } = useDragDrop()
  const isResizing =
    dragState?.eventId === event.id &&
    (dragState.type === 'resize-start' || dragState.type === 'resize-end')

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return
      e.preventDefault()
      e.stopPropagation()

      const type = position === 'top' ? 'resize-start' : 'resize-end'
      startDrag(event, type, { x: e.clientX, y: e.clientY })

      const handleMouseMove = (e: MouseEvent) => {
        updateDrag({ x: e.clientX, y: e.clientY })
      }

      const handleMouseUp = () => {
        const updatedEvent = endDrag()
        if (updatedEvent) {
          onResizeEnd?.(updatedEvent)
        }
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [disabled, event, position, startDrag, updateDrag, endDrag, onResizeEnd]
  )

  return (
    <div
      className={cn(
        'absolute left-0 right-0 h-2 cursor-ns-resize',
        'opacity-0 hover:opacity-100 transition-opacity',
        'bg-stone-500/20 hover:bg-emerald-500/30',
        position === 'top' ? 'top-0' : 'bottom-0',
        isResizing && 'opacity-100 bg-emerald-500/50'
      )}
      onMouseDown={handleMouseDown}
    >
      <div
        className={cn(
          'absolute left-1/2 -translate-x-1/2 w-8 h-1',
          'bg-stone-400 rounded-full',
          position === 'top' ? 'top-0.5' : 'bottom-0.5'
        )}
      />
    </div>
  )
}

export default DragDropProvider
