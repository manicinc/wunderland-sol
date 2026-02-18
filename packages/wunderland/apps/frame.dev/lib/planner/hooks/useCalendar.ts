/**
 * useCalendar Hook
 *
 * Manages calendar events with date range navigation.
 * Provides CRUD operations and view helpers.
 *
 * @module lib/planner/hooks/useCalendar
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  isSameDay,
  format,
  eachDayOfInterval,
  eachHourOfInterval,
} from 'date-fns'
import type { CalendarEvent, CreateEventInput, UpdateEventInput, PlannerView, TimeSlot, Task } from '../types'
import * as db from '../database'
import { getTasks } from '../database'

export interface UseCalendarOptions {
  initialDate?: Date
  initialView?: PlannerView
}

export interface UseCalendarReturn {
  // Current state
  currentDate: Date
  view: PlannerView
  dateRange: { start: Date; end: Date }

  // Data
  events: CalendarEvent[]
  tasks: Task[]
  isLoading: boolean
  error: Error | null

  // Navigation
  goToDate: (date: Date) => void
  goToToday: () => void
  goToPrevious: () => void
  goToNext: () => void
  setView: (view: PlannerView) => void

  // CRUD
  createEvent: (input: CreateEventInput) => Promise<CalendarEvent | null>
  updateEvent: (id: string, input: UpdateEventInput) => Promise<CalendarEvent | null>
  deleteEvent: (id: string) => Promise<boolean>

  // Helpers
  getEventsForDate: (date: Date) => CalendarEvent[]
  getTasksForDate: (date: Date) => Task[]
  getTimeSlots: (date: Date) => TimeSlot[]

  // Refresh
  refresh: () => Promise<void>
}

/**
 * Hook for managing calendar events and navigation
 */
export function useCalendar(options: UseCalendarOptions = {}): UseCalendarReturn {
  const [currentDate, setCurrentDate] = useState(options.initialDate || new Date())
  const [view, setView] = useState<PlannerView>(options.initialView || 'week')
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Calculate date range based on view
  const dateRange = useMemo(() => {
    switch (view) {
      case 'day':
        return {
          start: startOfDay(currentDate),
          end: endOfDay(currentDate),
        }
      case 'week':
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 0 }),
          end: endOfWeek(currentDate, { weekStartsOn: 0 }),
        }
      case 'month':
        // Include days from prev/next month that appear in the grid
        const monthStart = startOfMonth(currentDate)
        const monthEnd = endOfMonth(currentDate)
        return {
          start: startOfWeek(monthStart, { weekStartsOn: 0 }),
          end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
        }
      case 'agenda':
        // Show next 30 days for agenda view
        return {
          start: startOfDay(currentDate),
          end: endOfDay(addDays(currentDate, 30)),
        }
      default:
        return {
          start: startOfDay(currentDate),
          end: endOfDay(currentDate),
        }
    }
  }, [currentDate, view])

  // Load events and tasks for date range
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [loadedEvents, loadedTasks] = await Promise.all([
        db.getEvents({
          startAfter: dateRange.start.toISOString(),
          endBefore: dateRange.end.toISOString(),
        }),
        getTasks({
          dueAfter: format(dateRange.start, 'yyyy-MM-dd'),
          dueBefore: format(dateRange.end, 'yyyy-MM-dd'),
        }),
      ])

      setEvents(loadedEvents)
      setTasks(loadedTasks)
    } catch (err) {
      console.error('[useCalendar] Failed to load data:', err)
      setError(err instanceof Error ? err : new Error('Failed to load calendar data'))
    } finally {
      setIsLoading(false)
    }
  }, [dateRange.start, dateRange.end])

  // Initial load and reload on date range change
  useEffect(() => {
    loadData()
  }, [loadData])

  // Navigation helpers
  const goToDate = useCallback((date: Date) => {
    setCurrentDate(date)
  }, [])

  const goToToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [])

  const goToPrevious = useCallback(() => {
    switch (view) {
      case 'day':
        setCurrentDate((d) => subDays(d, 1))
        break
      case 'week':
        setCurrentDate((d) => subWeeks(d, 1))
        break
      case 'month':
      case 'agenda':
        setCurrentDate((d) => subMonths(d, 1))
        break
    }
  }, [view])

  const goToNext = useCallback(() => {
    switch (view) {
      case 'day':
        setCurrentDate((d) => addDays(d, 1))
        break
      case 'week':
        setCurrentDate((d) => addWeeks(d, 1))
        break
      case 'month':
      case 'agenda':
        setCurrentDate((d) => addMonths(d, 1))
        break
    }
  }, [view])

  // CRUD operations
  const createEvent = useCallback(
    async (input: CreateEventInput): Promise<CalendarEvent | null> => {
      try {
        const event = await db.createEvent(input)
        if (event) {
          await loadData() // Refresh list
        }
        return event
      } catch (err) {
        console.error('[useCalendar] Failed to create event:', err)
        setError(err instanceof Error ? err : new Error('Failed to create event'))
        return null
      }
    },
    [loadData]
  )

  const updateEvent = useCallback(
    async (id: string, input: UpdateEventInput): Promise<CalendarEvent | null> => {
      try {
        const event = await db.updateEvent(id, input)
        if (event) {
          await loadData() // Refresh list
        }
        return event
      } catch (err) {
        console.error('[useCalendar] Failed to update event:', err)
        setError(err instanceof Error ? err : new Error('Failed to update event'))
        return null
      }
    },
    [loadData]
  )

  const deleteEvent = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const success = await db.deleteEvent(id)
        if (success) {
          await loadData() // Refresh list
        }
        return success
      } catch (err) {
        console.error('[useCalendar] Failed to delete event:', err)
        setError(err instanceof Error ? err : new Error('Failed to delete event'))
        return false
      }
    },
    [loadData]
  )

  // Helper to get events for a specific date
  const getEventsForDate = useCallback(
    (date: Date): CalendarEvent[] => {
      return events.filter((event) => {
        const eventStart = new Date(event.startDatetime)
        const eventEnd = new Date(event.endDatetime)

        if (event.allDay) {
          // All-day events span the entire date
          return isSameDay(eventStart, date) || (eventStart <= date && eventEnd >= date)
        }

        // Timed events
        return isSameDay(eventStart, date) || (eventStart <= endOfDay(date) && eventEnd >= startOfDay(date))
      })
    },
    [events]
  )

  // Helper to get tasks for a specific date
  const getTasksForDate = useCallback(
    (date: Date): Task[] => {
      const dateStr = format(date, 'yyyy-MM-dd')
      return tasks.filter((task) => task.dueDate === dateStr)
    },
    [tasks]
  )

  // Generate time slots for day/week view
  const getTimeSlots = useCallback(
    (date: Date): TimeSlot[] => {
      const now = new Date()
      const dayStart = startOfDay(date)
      const dayEnd = endOfDay(date)

      const hours = eachHourOfInterval({ start: dayStart, end: dayEnd })

      return hours.map((hour) => ({
        hour: hour.getHours(),
        minute: 0,
        date: hour,
        events: getEventsForDate(date).filter((event) => {
          if (event.allDay) return false
          const eventHour = new Date(event.startDatetime).getHours()
          return eventHour === hour.getHours()
        }),
        tasks: getTasksForDate(date).filter((task) => {
          if (!task.dueTime) return false
          const [taskHour] = task.dueTime.split(':').map(Number)
          return taskHour === hour.getHours()
        }),
        isNow: isSameDay(date, now) && now.getHours() === hour.getHours(),
        isPast: hour < now,
      }))
    },
    [getEventsForDate, getTasksForDate]
  )

  return {
    currentDate,
    view,
    dateRange,
    events,
    tasks,
    isLoading,
    error,
    goToDate,
    goToToday,
    goToPrevious,
    goToNext,
    setView,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate,
    getTasksForDate,
    getTimeSlots,
    refresh: loadData,
  }
}

/**
 * Hook for getting days in current view
 */
export function useCalendarDays(currentDate: Date, view: PlannerView): Date[] {
  return useMemo(() => {
    switch (view) {
      case 'day':
        return [currentDate]
      case 'week':
        return eachDayOfInterval({
          start: startOfWeek(currentDate, { weekStartsOn: 0 }),
          end: endOfWeek(currentDate, { weekStartsOn: 0 }),
        })
      case 'month':
        const monthStart = startOfMonth(currentDate)
        const monthEnd = endOfMonth(currentDate)
        return eachDayOfInterval({
          start: startOfWeek(monthStart, { weekStartsOn: 0 }),
          end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
        })
      default:
        return [currentDate]
    }
  }, [currentDate, view])
}
