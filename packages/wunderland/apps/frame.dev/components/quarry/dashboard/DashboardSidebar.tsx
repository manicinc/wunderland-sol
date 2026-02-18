/**
 * Dashboard Sidebar
 *
 * Right sidebar for dashboard with welcome banner and quick actions.
 * @module components/quarry/dashboard/DashboardSidebar
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Calendar,
  CheckCircle2,
  PenLine,
  Brain,
  ArrowRight,
  Settings2,
  Sun,
  Moon,
  Coffee,
  Sunrise,
  Sunset,
} from 'lucide-react'
import { format } from 'date-fns'
import { useTasks } from '@/lib/planner/hooks/useTasks'

interface DashboardSidebarProps {
  /** Theme setting */
  theme: string
  /** Navigation handler */
  onNavigate: (path: string) => void
  /** Open settings */
  onOpenSettings?: () => void
}

function getGreeting(): { text: string; icon: typeof Sun } {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) {
    return { text: 'Good morning', icon: Sunrise }
  } else if (hour >= 12 && hour < 17) {
    return { text: 'Good afternoon', icon: Sun }
  } else if (hour >= 17 && hour < 21) {
    return { text: 'Good evening', icon: Sunset }
  } else {
    return { text: 'Good night', icon: Moon }
  }
}

export function DashboardSidebar({
  theme,
  onNavigate,
  onOpenSettings,
}: DashboardSidebarProps) {
  const isDark = theme.includes('dark')
  const [currentTime, setCurrentTime] = useState(new Date())
  const { stats } = useTasks({ includeCompleted: false })

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const greeting = getGreeting()
  const GreetingIcon = greeting.icon

  const quickLinks = [
    {
      label: 'Today\'s Tasks',
      icon: CheckCircle2,
      count: stats.dueToday,
      color: 'text-amber-500',
      path: '/quarry/plan',
    },
    {
      label: 'Start Writing',
      icon: PenLine,
      color: 'text-blue-500',
      path: '/quarry/new',
    },
    {
      label: 'Templates',
      icon: Brain,
      color: 'text-purple-500',
      path: '/quarry/templates',
    },
    {
      label: 'Full Calendar',
      icon: Calendar,
      color: 'text-emerald-500',
      path: '/quarry/plan?view=month',
    },
  ]

  return (
    <div className="h-full flex flex-col p-4 space-y-6">
      {/* Welcome Banner */}
      <motion.div
        className={`
          p-4 rounded-xl
          ${isDark
            ? 'bg-gradient-to-br from-rose-500/20 via-purple-500/20 to-indigo-500/20'
            : 'bg-gradient-to-br from-rose-50 via-purple-50 to-indigo-50'
          }
        `}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <GreetingIcon className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
          <span className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
            {greeting.text}
          </span>
        </div>

        <h2 className={`text-2xl font-bold mb-1 ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
          {format(currentTime, 'EEEE')}
        </h2>
        <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          {format(currentTime, 'MMMM d, yyyy')}
        </p>

        {/* Daily summary */}
        {stats.dueToday > 0 && (
          <div className={`
            mt-4 p-3 rounded-lg
            ${isDark ? 'bg-zinc-800/50' : 'bg-white/60'}
          `}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-500" />
              <span className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                <strong className="text-amber-500">{stats.dueToday}</strong> tasks due today
              </span>
            </div>
            {stats.overdue > 0 && (
              <div className="flex items-center gap-2 mt-1.5">
                <span className="w-4 h-4" /> {/* Spacer */}
                <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  <strong className="text-red-500">{stats.overdue}</strong> overdue
                </span>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Quick Links */}
      <div className="space-y-2">
        <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          Quick Actions
        </h3>
        <div className="space-y-1">
          {quickLinks.map((link, index) => {
            const Icon = link.icon
            return (
              <motion.button
                key={link.label}
                onClick={() => onNavigate(link.path)}
                className={`
                  w-full flex items-center justify-between p-3 rounded-lg
                  text-left transition-colors
                  ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}
                `}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${link.color}`} />
                  <span className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                    {link.label}
                  </span>
                </div>
                {'count' in link && typeof link.count === 'number' && link.count > 0 && (
                  <span className={`
                    px-2 py-0.5 rounded-full text-xs font-medium
                    ${isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-200 text-zinc-600'}
                  `}>
                    {link.count}
                  </span>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Tip of the day */}
      <motion.div
        className={`
          p-3 rounded-lg border
          ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}
        `}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
          <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Quick Tip
          </span>
        </div>
        <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          Use the Quick Capture widget to jot down ideas fast. Press Enter to create instantly.
        </p>
      </motion.div>

      {/* Settings link */}
      {onOpenSettings && (
        <button
          onClick={onOpenSettings}
          className={`
            flex items-center gap-2 p-2 rounded-lg w-full
            text-sm transition-colors
            ${isDark ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'}
          `}
        >
          <Settings2 className="w-4 h-4" />
          <span>Dashboard Settings</span>
        </button>
      )}
    </div>
  )
}

export default DashboardSidebar
