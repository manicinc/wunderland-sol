'use client'

/**
 * Current Time Indicator
 *
 * Red line showing the current time in day/week views
 * @module components/quarry/ui/planner/CurrentTimeIndicator
 */

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface CurrentTimeIndicatorProps {
  startHour?: number // Default 6 (6 AM)
  endHour?: number // Default 23 (11 PM)
  slotHeight?: number // Height of each hour slot in pixels
  className?: string
}

export function CurrentTimeIndicator({
  startHour = 6,
  endHour = 23,
  slotHeight = 60,
  className,
}: CurrentTimeIndicatorProps) {
  const [now, setNow] = useState(new Date())

  // Update every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const currentHour = now.getHours()
  const currentMinutes = now.getMinutes()

  // Check if current time is within display range
  if (currentHour < startHour || currentHour > endHour) {
    return null
  }

  // Calculate position
  const hoursFromStart = currentHour - startHour + currentMinutes / 60
  const topPosition = hoursFromStart * slotHeight

  return (
    <div
      className={cn(
        'absolute left-0 right-0 z-20 pointer-events-none',
        className
      )}
      style={{ top: `${topPosition}px` }}
    >
      {/* Time label */}
      <div className="absolute -left-1 -top-2.5 flex items-center gap-1">
        <span
          className={cn(
            'text-[10px] font-medium px-1 py-0.5 rounded',
            'bg-red-500 text-white'
          )}
        >
          {now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </span>
      </div>

      {/* Dot at the left edge */}
      <div
        className={cn(
          'absolute -left-1 -top-1 w-2 h-2 rounded-full',
          'bg-red-500 shadow-sm shadow-red-500/50'
        )}
      />

      {/* The line itself */}
      <div
        className={cn(
          'absolute left-1 right-0 h-[2px]',
          'bg-red-500 shadow-sm shadow-red-500/50'
        )}
      />
    </div>
  )
}

/**
 * Hook to check if a given date is today
 */
export function useIsToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

export default CurrentTimeIndicator
