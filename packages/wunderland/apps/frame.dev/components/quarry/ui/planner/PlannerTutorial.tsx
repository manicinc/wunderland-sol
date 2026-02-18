'use client'

/**
 * Planner Tutorial
 *
 * Interactive tutorial tour for the Quarry Planner.
 * Guides users through key features like navigation,
 * creating events, and using drag-drop.
 *
 * @module components/quarry/ui/planner/PlannerTutorial
 */

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, X, Sparkles } from 'lucide-react'
import TutorialTour, { type TutorialStep } from '../misc/TutorialTour'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

export interface PlannerTutorialProps {
  /** Whether to show the tutorial trigger button */
  showTrigger?: boolean
  /** Theme */
  theme?: 'light' | 'dark'
  /** Additional class names */
  className?: string
}

// ============================================================================
// TUTORIAL STEPS
// ============================================================================

const PLANNER_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to the Planner',
    description: 'This is your Streamlined Day View — a beautiful timeline to organize your day. Let\'s take a quick tour!',
    target: '[data-tutorial="planner-header"]',
    placement: 'bottom',
  },
  {
    id: 'navigation',
    title: 'Navigate Your Calendar',
    description: 'Use the arrow buttons to move between days. The keyboard shortcuts ← and → also work.',
    target: '[data-tutorial="nav-arrows"]',
    placement: 'bottom',
  },
  {
    id: 'today-button',
    title: 'Jump to Today',
    description: 'Click "Today" to quickly return to the current day. Or press T on your keyboard.',
    target: '[data-tutorial="today-button"]',
    placement: 'bottom',
  },
  {
    id: 'create-event',
    title: 'Create New Events',
    description: 'Click the Create button to add a new time block. You can also press N or click directly on a time slot.',
    target: '[data-tutorial="create-button"]',
    placement: 'bottom',
  },
  {
    id: 'week-strip',
    title: 'Week at a Glance',
    description: 'The week strip shows all 7 days. Click any day to navigate directly. Dots indicate days with events.',
    target: '[data-tutorial="week-strip"]',
    placement: 'bottom',
  },
  {
    id: 'timeline',
    title: 'Your Timeline',
    description: 'Events appear along the vertical timeline. The current time is marked with "NOW". Events are color-coded for easy recognition.',
    target: '[data-tutorial="timeline-spine"]',
    placement: 'right',
  },
  {
    id: 'event-cards',
    title: 'Event Cards',
    description: 'Click any event card to edit it. You can change the title, time, color, icon, and set up recurrence.',
    target: '[data-tutorial="event-card"]',
    placement: 'left',
  },
  {
    id: 'drag-drop',
    title: 'Drag to Reschedule',
    description: 'Click and hold an event, then drag it to a new time. You can also resize events by dragging their edges.',
    target: '[data-tutorial="event-card"]',
    placement: 'left',
  },
  {
    id: 'countdown',
    title: 'Time Remaining',
    description: 'The countdown shows how much time is left until the end of your workday. Stay on track!',
    target: '[data-tutorial="countdown"]',
    placement: 'top',
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'You now know the basics of the Quarry Planner. Explore more features in Settings, or check out the documentation.',
    target: '[data-tutorial="planner-header"]',
    placement: 'bottom',
  },
]

// ============================================================================
// COMPONENT
// ============================================================================

export function PlannerTutorial({
  showTrigger = true,
  theme = 'dark',
  className,
}: PlannerTutorialProps) {
  const isDark = theme === 'dark'
  const [isTourActive, setIsTourActive] = useState(false)
  const [hasSeenTutorial, setHasSeenTutorial] = useState(true)

  // Check if user has seen the tutorial
  useEffect(() => {
    const seen = localStorage.getItem('planner-tutorial-seen')
    setHasSeenTutorial(!!seen)
  }, [])

  // Start the tutorial
  const startTutorial = useCallback(() => {
    setIsTourActive(true)
  }, [])

  // Complete the tutorial
  const completeTutorial = useCallback(() => {
    setIsTourActive(false)
    localStorage.setItem('planner-tutorial-seen', 'true')
    setHasSeenTutorial(true)
  }, [])

  // Skip the tutorial
  const skipTutorial = useCallback(() => {
    setIsTourActive(false)
    localStorage.setItem('planner-tutorial-seen', 'true')
    setHasSeenTutorial(true)
  }, [])

  return (
    <>
      {/* Tutorial trigger button */}
      {showTrigger && (
        <motion.button
          className={cn(
            'p-2 rounded-lg transition-colors relative',
            isDark
              ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700',
            className
          )}
          onClick={startTutorial}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Start planner tutorial"
        >
          <HelpCircle size={18} />
          {/* Pulse indicator for first-time users */}
          {!hasSeenTutorial && (
            <motion.span
              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.7, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />
          )}
        </motion.button>
      )}

      {/* First-time welcome modal */}
      <AnimatePresence>
        {!hasSeenTutorial && !isTourActive && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={cn(
                'max-w-md p-6 rounded-2xl shadow-2xl m-4',
                isDark ? 'bg-zinc-900' : 'bg-white'
              )}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Sparkles className="w-6 h-6 text-emerald-500" />
                </div>
                <h2 className={cn(
                  'text-xl font-bold',
                  isDark ? 'text-zinc-100' : 'text-zinc-900'
                )}>
                  Welcome to Quarry Planner
                </h2>
              </div>
              <p className={cn(
                'mb-6',
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              )}>
                Would you like a quick tour of the planner? It only takes a minute and will help you get the most out of your new planning experience.
              </p>
              <div className="flex gap-3">
                <button
                  className={cn(
                    'flex-1 px-4 py-2 rounded-lg font-medium transition-colors',
                    isDark
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                  )}
                  onClick={skipTutorial}
                >
                  Skip for now
                </button>
                <button
                  className="flex-1 px-4 py-2 rounded-lg font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                  onClick={startTutorial}
                >
                  Take the tour
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tutorial tour */}
      <TutorialTour
        tourId="planner-tutorial"
        title="Planner Tutorial"
        steps={PLANNER_TUTORIAL_STEPS}
        isActive={isTourActive}
        onComplete={completeTutorial}
        onSkip={skipTutorial}
      />
    </>
  )
}

export default PlannerTutorial
