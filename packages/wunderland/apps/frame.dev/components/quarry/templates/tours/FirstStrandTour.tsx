/**
 * First Strand Tour
 * @module codex/templates/tours/FirstStrandTour
 *
 * @remarks
 * Guided tour for creating your first strand using a template.
 * Walks users through:
 * - Understanding the template picker
 * - Selecting a template
 * - Previewing template details
 * - Filling out the form
 * - Creating the strand
 */

'use client'

import React, { useEffect } from 'react'
import { useTour, TourDefinition } from '../../ui/tour/useTour'
import { TourGuide } from '../../ui/tour/TourGuide'

/* ═══════════════════════════════════════════════════════════════════════════
   TOUR DEFINITION
═══════════════════════════════════════════════════════════════════════════ */

export const FIRST_STRAND_TOUR: TourDefinition = {
  id: 'first-strand-template',
  name: 'Create Your First Strand',
  description: 'Learn how to use templates to create consistent, structured documents',
  version: 1,
  showOnFirstVisit: true,
  steps: [
    {
      id: 'welcome',
      title: 'Create with Templates',
      content: 'Templates give you a head start with pre-structured content. Let\'s create your first strand using one!',
      placement: 'center',
      spotlight: false,
    },
    {
      id: 'template-picker',
      target: '[data-tour="template-picker"]',
      title: 'Choose a Template',
      content: 'Browse available templates by category. Each template provides a structured starting point for your document.',
      placement: 'bottom',
      spotlight: true,
    },
    {
      id: 'category-tabs',
      target: '[data-tour="category-tabs"]',
      title: 'Browse by Category',
      content: 'Filter templates by type: Business, Technical, Creative, and more. Or check "Favorites" for quick access to templates you love.',
      placement: 'bottom',
      spotlight: true,
    },
    {
      id: 'search-templates',
      target: '[data-tour="template-search"]',
      title: 'Search Templates',
      content: 'Looking for something specific? Type keywords to filter templates by name, tags, or description.',
      placement: 'bottom',
      spotlight: true,
    },
    {
      id: 'template-card',
      target: '[data-tour="template-card"]',
      title: 'Template Card',
      content: 'Each card shows the template name, description, difficulty level, and category. Click to preview before selecting.',
      placement: 'right',
      spotlight: true,
    },
    {
      id: 'template-preview',
      target: '[data-tour="template-preview"]',
      title: 'Preview Template',
      content: 'See what fields you\'ll fill out and how the final document will look. This helps you choose the right template.',
      placement: 'left',
      spotlight: true,
    },
    {
      id: 'favorite-button',
      target: '[data-tour="favorite-button"]',
      title: 'Save to Favorites',
      content: 'Love this template? Click the heart to add it to your favorites for quick access next time.',
      placement: 'left',
      spotlight: true,
    },
    {
      id: 'use-template',
      target: '[data-tour="use-template-button"]',
      title: 'Use This Template',
      content: 'Ready to create? Click "Use Template" to start filling out the form and create your strand.',
      placement: 'top',
      spotlight: true,
    },
    {
      id: 'fill-form',
      target: '[data-tour="template-form"]',
      title: 'Fill Out the Form',
      content: 'Enter your content in each field. Required fields are marked with a red asterisk. The template will use your input to generate the document.',
      placement: 'right',
      spotlight: true,
    },
    {
      id: 'create-strand',
      target: '[data-tour="create-strand-button"]',
      title: 'Create Your Strand',
      content: 'Once you\'ve filled out the form, click Create to generate your strand. It\'ll be saved to your knowledge base automatically.',
      placement: 'top',
      spotlight: true,
    },
    {
      id: 'complete',
      title: 'All Set!',
      content: 'You now know how to create strands with templates. Explore different templates to find ones that fit your workflow!',
      placement: 'center',
      spotlight: false,
    },
  ],
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOOK
═══════════════════════════════════════════════════════════════════════════ */

export function useFirstStrandTour() {
  const tour = useTour()

  const startTour = () => {
    tour.startTour(FIRST_STRAND_TOUR)
  }

  const shouldShowTour = !tour.hasCompletedTour(FIRST_STRAND_TOUR.id) &&
                         !tour.hasSkippedTour(FIRST_STRAND_TOUR.id)

  return {
    ...tour,
    startTour,
    shouldShowTour,
    tourId: FIRST_STRAND_TOUR.id,
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

interface FirstStrandTourProps {
  /** Whether to auto-start on first visit */
  autoStart?: boolean
  /** Dark mode */
  isDark?: boolean
}

export default function FirstStrandTour({
  autoStart = false,
  isDark = true,
}: FirstStrandTourProps) {
  const tour = useFirstStrandTour()

  // Auto-start on first visit if enabled
  useEffect(() => {
    if (autoStart && tour.shouldShowTour && tour.isFirstVisit) {
      // Delay slightly to let the page render
      const timer = setTimeout(() => {
        tour.startTour()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [autoStart, tour.shouldShowTour, tour.isFirstVisit])

  return (
    <TourGuide
      isActive={tour.isActive}
      currentStep={tour.currentStep}
      currentStepIndex={tour.currentStepIndex}
      totalSteps={tour.totalSteps}
      progress={tour.progress}
      currentTour={tour.currentTour}
      onNext={tour.nextStep}
      onPrev={tour.prevStep}
      onSkip={tour.skipTour}
      onComplete={tour.completeTour}
      onGoToStep={tour.goToStep}
      isDark={isDark}
    />
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TOUR TRIGGER BUTTON
═══════════════════════════════════════════════════════════════════════════ */

interface TourTriggerButtonProps {
  className?: string
}

export function FirstStrandTourTrigger({ className }: TourTriggerButtonProps) {
  const { startTour, hasCompletedTour } = useFirstStrandTour()
  const isCompleted = hasCompletedTour(FIRST_STRAND_TOUR.id)

  return (
    <button
      onClick={startTour}
      className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
        isCompleted
          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
      } ${className || ''}`}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
      {isCompleted ? 'Replay Tour' : 'Quick Tour'}
    </button>
  )
}
