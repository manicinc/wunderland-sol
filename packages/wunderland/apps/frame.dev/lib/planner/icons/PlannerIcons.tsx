/**
 * Custom SVG Icons for Planner
 *
 * Polished, cohesive icon set for the calendar/planner views
 * @module lib/planner/icons/PlannerIcons
 */

import { cn } from '@/lib/utils'

interface IconProps {
  className?: string
  size?: number
}

// ============================================================================
// VIEW ICONS
// ============================================================================

/**
 * Day View Icon - Single column with hour lines
 */
export function DayViewIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('text-current', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="4"
        y="3"
        width="16"
        height="18"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <line x1="7" y1="7" x2="17" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7" y1="11" x2="17" y2="11" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <line x1="7" y1="15" x2="17" y2="15" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <line x1="7" y1="19" x2="17" y2="19" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      {/* Event block */}
      <rect x="8" y="9" width="8" height="3" rx="1" fill="currentColor" opacity="0.3" />
    </svg>
  )
}

/**
 * Week View Icon - 7-column grid
 */
export function WeekViewIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('text-current', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="2"
        y="3"
        width="20"
        height="18"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Header line */}
      <line x1="2" y1="7" x2="22" y2="7" stroke="currentColor" strokeWidth="1.5" />
      {/* Vertical dividers */}
      {[5.5, 8.5, 11.5, 14.5, 17.5].map((x, i) => (
        <line
          key={i}
          x1={x}
          y1="7"
          x2={x}
          y2="21"
          stroke="currentColor"
          strokeWidth="0.75"
          opacity="0.3"
        />
      ))}
      {/* Event blocks */}
      <rect x="3" y="9" width="2" height="4" rx="0.5" fill="currentColor" opacity="0.4" />
      <rect x="9" y="12" width="2" height="3" rx="0.5" fill="currentColor" opacity="0.4" />
      <rect x="15" y="10" width="2" height="5" rx="0.5" fill="currentColor" opacity="0.4" />
    </svg>
  )
}

/**
 * Month View Icon - Calendar grid with dates
 */
export function MonthViewIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('text-current', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="2"
        y="3"
        width="20"
        height="18"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Header */}
      <line x1="2" y1="7" x2="22" y2="7" stroke="currentColor" strokeWidth="1.5" />
      {/* Grid lines */}
      <line x1="8" y1="7" x2="8" y2="21" stroke="currentColor" strokeWidth="0.75" opacity="0.3" />
      <line x1="14" y1="7" x2="14" y2="21" stroke="currentColor" strokeWidth="0.75" opacity="0.3" />
      <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="0.75" opacity="0.3" />
      <line x1="2" y1="17" x2="22" y2="17" stroke="currentColor" strokeWidth="0.75" opacity="0.3" />
      {/* Date dots */}
      <circle cx="5" cy="9.5" r="1" fill="currentColor" opacity="0.5" />
      <circle cx="11" cy="9.5" r="1" fill="currentColor" opacity="0.5" />
      <circle cx="17" cy="14.5" r="1" fill="currentColor" opacity="0.5" />
    </svg>
  )
}

/**
 * Agenda View Icon - List of items
 */
export function AgendaViewIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('text-current', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      {/* List items */}
      <circle cx="6.5" cy="8" r="1" fill="currentColor" />
      <line x1="9" y1="8" x2="18" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="6.5" cy="12" r="1" fill="currentColor" />
      <line x1="9" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="6.5" cy="16" r="1" fill="currentColor" />
      <line x1="9" y1="16" x2="14" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// ============================================================================
// TIME PERIOD ICONS
// ============================================================================

/**
 * Morning Icon - Sunrise with gradient
 */
export function MorningIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('text-current', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="sunriseGradient" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>
      {/* Horizon line */}
      <line x1="2" y1="16" x2="22" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Sun */}
      <circle cx="12" cy="16" r="5" fill="url(#sunriseGradient)" />
      {/* Rays */}
      <line x1="12" y1="5" x2="12" y2="8" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5.5" y1="9.5" x2="7.5" y2="11.5" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18.5" y1="9.5" x2="16.5" y2="11.5" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Evening Icon - Sunset with gradient
 */
export function EveningIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('text-current', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="sunsetGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="50%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      {/* Horizon line */}
      <line x1="2" y1="14" x2="22" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Sun (half visible) */}
      <path
        d="M 7 14 A 5 5 0 0 1 17 14"
        fill="url(#sunsetGradient)"
      />
      {/* Stars appearing */}
      <circle cx="6" cy="6" r="0.75" fill="currentColor" opacity="0.5" />
      <circle cx="18" cy="8" r="0.5" fill="currentColor" opacity="0.4" />
      <circle cx="20" cy="5" r="0.75" fill="currentColor" opacity="0.6" />
    </svg>
  )
}

// ============================================================================
// SYNC STATUS ICONS
// ============================================================================

/**
 * Syncing Icon - Rotating arrows
 */
export function SyncingIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('text-current animate-spin', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 12a8 8 0 0 1 14.93-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M20 12a8 8 0 0 1-14.93 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <polyline
        points="19 4 19 8 15 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="5 20 5 16 9 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Synced Icon - Checkmark with circle
 */
export function SyncedIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('text-green-500', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 12l3 3 5-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Sync Error Icon - Warning triangle
 */
export function SyncErrorIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('text-red-500', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 3L2 21h20L12 3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      <line x1="12" y1="9" x2="12" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
  )
}

/**
 * Sync Pending Icon - Clock with arrow
 */
export function SyncPendingIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('text-yellow-500', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <polyline
        points="12 7 12 12 15 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Google Calendar Icon
 */
export function GoogleCalendarIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn('', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Calendar base */}
      <rect x="3" y="4" width="18" height="17" rx="2" fill="#4285F4" />
      {/* White center */}
      <rect x="5" y="8" width="14" height="11" fill="white" />
      {/* Top hooks */}
      <rect x="7" y="2" width="2" height="4" rx="1" fill="#EA4335" />
      <rect x="15" y="2" width="2" height="4" rx="1" fill="#EA4335" />
      {/* Grid lines */}
      <line x1="5" y1="12" x2="19" y2="12" stroke="#E0E0E0" strokeWidth="0.5" />
      <line x1="5" y1="15" x2="19" y2="15" stroke="#E0E0E0" strokeWidth="0.5" />
      <line x1="10" y1="8" x2="10" y2="19" stroke="#E0E0E0" strokeWidth="0.5" />
      <line x1="14" y1="8" x2="14" y2="19" stroke="#E0E0E0" strokeWidth="0.5" />
      {/* Blue accent */}
      <rect x="11" y="10" width="2" height="2" fill="#4285F4" />
    </svg>
  )
}

// ============================================================================
// ACTION ICONS
// ============================================================================

/**
 * Add Event Icon - Calendar with plus
 */
export function AddEventIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('text-current', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="17"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="1.5" />
      <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Plus sign */}
      <line x1="12" y1="12" x2="12" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="9" y1="15" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Add Task Icon - Checkbox with plus
 */
export function AddTaskIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('text-current', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="3"
        y="3"
        width="12"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* Plus sign in circle */}
      <circle cx="17" cy="17" r="5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="17" y1="14" x2="17" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="17" x2="20" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Recurring Event Icon - Calendar with repeat arrows
 */
export function RecurringIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('text-current', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 12a8 8 0 0 1 8-8c3.5 0 6.5 2.2 7.6 5.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M20 12a8 8 0 0 1-8 8c-3.5 0-6.5-2.2-7.6-5.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <polyline
        points="20 4 20 9 15 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="4 20 4 15 9 15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Drag Handle Icon - Six dots grid
 */
export function DragHandleIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('text-current', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="9" cy="6" r="1.5" fill="currentColor" />
      <circle cx="15" cy="6" r="1.5" fill="currentColor" />
      <circle cx="9" cy="12" r="1.5" fill="currentColor" />
      <circle cx="15" cy="12" r="1.5" fill="currentColor" />
      <circle cx="9" cy="18" r="1.5" fill="currentColor" />
      <circle cx="15" cy="18" r="1.5" fill="currentColor" />
    </svg>
  )
}

/**
 * Time Slot Icon - Clock segment
 */
export function TimeSlotIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('text-current', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 12L12 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 12L16 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Time segment highlight */}
      <path
        d="M12 3 A 9 9 0 0 1 21 12 L 12 12 Z"
        fill="currentColor"
        opacity="0.15"
      />
    </svg>
  )
}

// ============================================================================
// NAVIGATION ICONS
// ============================================================================

/**
 * Timeline View Icon - Vertical spine with cards
 */
export function TimelineViewIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('text-current', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Vertical spine */}
      <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Event cards branching off */}
      <rect x="14" y="4" width="7" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="3" y="10" width="7" height="3" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="14" y="15" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
      {/* Connection dots on spine */}
      <circle cx="12" cy="6" r="2" fill="currentColor" />
      <circle cx="12" cy="11.5" r="2" fill="currentColor" />
      <circle cx="12" cy="17.5" r="2" fill="currentColor" />
    </svg>
  )
}

/**
 * Kanban View Icon - Three columns with task cards
 */
export function KanbanViewIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('text-current', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Three columns */}
      <rect x="2" y="3" width="5.5" height="18" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="9.25" y="3" width="5.5" height="18" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="16.5" y="3" width="5.5" height="18" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
      {/* Cards in first column (To Do) */}
      <rect x="3" y="5" width="3.5" height="3" rx="0.5" fill="currentColor" opacity="0.4" />
      <rect x="3" y="9.5" width="3.5" height="2.5" rx="0.5" fill="currentColor" opacity="0.4" />
      <rect x="3" y="13.5" width="3.5" height="2" rx="0.5" fill="currentColor" opacity="0.25" />
      {/* Cards in middle column (In Progress) */}
      <rect x="10.25" y="5" width="3.5" height="4" rx="0.5" fill="currentColor" opacity="0.4" />
      <rect x="10.25" y="10.5" width="3.5" height="2.5" rx="0.5" fill="currentColor" opacity="0.25" />
      {/* Cards in last column (Done) */}
      <rect x="17.5" y="5" width="3.5" height="2" rx="0.5" fill="currentColor" opacity="0.4" />
      <rect x="17.5" y="8.5" width="3.5" height="2.5" rx="0.5" fill="currentColor" opacity="0.4" />
      <rect x="17.5" y="12.5" width="3.5" height="3" rx="0.5" fill="currentColor" opacity="0.4" />
      <rect x="17.5" y="17" width="3.5" height="2" rx="0.5" fill="currentColor" opacity="0.25" />
    </svg>
  )
}

/**
 * Today Icon - Calendar with dot on today
 */
export function TodayIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('text-current', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="17"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="1.5" />
      <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Today indicator */}
      <circle cx="12" cy="14" r="3" fill="currentColor" />
    </svg>
  )
}

/**
 * Habits View Icon - Flame for streak tracking
 */
export function HabitsViewIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('text-current', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Flame shape */}
      <path
        d="M12 2C12 2 8 6 8 10C8 11.5 8.5 12.5 9.5 13.5C8.5 12 9 10.5 10 10C10 12 11 14 12 15C13 14 14 12 14 10C15 10.5 15.5 12 14.5 13.5C15.5 12.5 16 11.5 16 10C16 6 12 2 12 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        opacity="0.3"
      />
      {/* Inner flame */}
      <path
        d="M12 22C15.3137 22 18 19.3137 18 16C18 12.6863 12 7 12 7C12 7 6 12.6863 6 16C6 19.3137 8.68629 22 12 22Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Core flame */}
      <path
        d="M12 18C13.1046 18 14 17.1046 14 16C14 14.5 12 12 12 12C12 12 10 14.5 10 16C10 17.1046 10.8954 18 12 18Z"
        fill="currentColor"
        opacity="0.5"
      />
    </svg>
  )
}
